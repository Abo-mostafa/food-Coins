// App controller: auth lifecycle, data subscriptions, scene routing, level sessions.
import { isFirebaseConfigured } from './firebase/config.js';
import { onAuthChange, completeRedirectSignIn, signOut as fbSignOut, authErrorMessage, isCancelError } from './firebase/auth.js';
import {
  initPlayer,
  subscribeProgress,
  startLevel,
  completeLevel,
  savePendingResult,
  loadPendingResult,
  clearPendingResult,
  DEFAULT_PROGRESS,
} from './firebase/progressService.js';
import { subscribeWallet } from './firebase/walletService.js';
import { state, setState } from './state.js';
import { randomSeed } from './game/rng.js';
import { getLevel, LEVEL_COUNT, computeReward } from './game/LevelConfig.js';
import { AudioManager } from './game/AudioManager.js';
import { toast } from './ui/components/toast.js';
import { h, uiRoot } from './ui/components/dom.js';

class App {
  constructor() {
    this.game = null;
    this.unsubs = [];
    this.launching = false;
    this.flushing = false;
    this.redirectError = null;
  }

  init(game) {
    this.game = game;
    window.addEventListener('online', () => {
      setState({ online: true });
      toast('عاد الاتصال بالإنترنت', { type: 'success' });
      this.flushPending(false);
    });
    window.addEventListener('offline', () => {
      setState({ online: false });
      toast('انقطع الاتصال بالإنترنت', { type: 'warn' });
    });
    window.addEventListener('pointerdown', () => {
      AudioManager.unlock();
      AudioManager.startMusic();
    });

    if (!isFirebaseConfigured) {
      this.go('Login');
      return;
    }
    completeRedirectSignIn().catch((e) => {
      if (!isCancelError(e)) this.redirectError = authErrorMessage(e);
    });
    onAuthChange((user) => this.handleUser(user));
  }

  currentKey() {
    return this.game.scene.getScenes(true).map((s) => s.scene.key).find((k) => k !== 'Boot');
  }

  go(key, data) {
    const mgr = this.game.scene;
    for (const s of mgr.getScenes(true)) {
      const k = s.scene.key;
      if (k !== 'Boot' && k !== key) mgr.stop(k);
    }
    mgr.start(key, data);
  }

  // ---------- auth ----------

  handleUser(user) {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    if (!user) {
      setState({ user: null, progress: null, wallet: null, pending: null, loadError: null });
      if (!state.practice) this.go('Login');
      return;
    }
    setState({ user, practice: false, progress: null, wallet: null, loadError: null, pending: loadPendingResult(user.uid) });
    this.unsubs.push(
      subscribeProgress(user.uid, (p) => p && setState({ progress: p }), (e) => console.warn('progress listener', e.code)),
      subscribeWallet(user.uid, (w) => w && setState({ wallet: w }), (e) => console.warn('wallet listener', e.code)),
    );
    state.retryLoad = () => {
      setState({ loadError: null });
      this.loadPlayer();
    };
    this.loadPlayer();
    if (this.currentKey() !== 'Game' && this.currentKey() !== 'Result') this.go('Map');
  }

  async loadPlayer() {
    try {
      const data = await initPlayer();
      if (!state.progress) setState({ progress: data.progress });
      if (!state.wallet) setState({ wallet: data.wallet });
      setState({ loadError: null });
    } catch (e) {
      if (!state.progress) setState({ loadError: `تعذر تحميل بياناتك. ${e.message}` });
    }
  }

  async signOut() {
    if (state.practice) {
      setState({ practice: false, progress: null });
      this.go('Login');
      return;
    }
    try {
      await fbSignOut();
      toast('تم تسجيل الخروج');
    } catch (e) {
      toast(authErrorMessage(e), { type: 'error' });
    }
  }

  // ---------- practice (no Firebase, nothing saved) ----------

  startPractice() {
    setState({ practice: true, user: null, wallet: null, progress: { ...DEFAULT_PROGRESS, completedLevels: [], levelStars: {} } });
    this.go('Map');
  }

  practiceComplete(levelId, result) {
    const reward = computeReward(getLevel(levelId), result);
    const p = state.progress;
    setState({
      progress: {
        ...p,
        highestUnlockedLevel: Math.max(p.highestUnlockedLevel, Math.min(levelId + 1, LEVEL_COUNT)),
        completedLevels: [...new Set([...p.completedLevels, levelId])],
        levelStars: { ...p.levelStars, [levelId]: Math.max(p.levelStars[levelId] ?? 0, reward.stars) },
      },
    });
    return { status: 'won', stars: reward.stars, coinsEarned: reward.coins, coinsGranted: 0, practice: true };
  }

  // ---------- levels ----------

  async launchLevel(levelId) {
    if (this.launching) return;
    if (state.practice) {
      this.go('Game', { levelId, seed: randomSeed(), practice: true });
      return;
    }
    const highest = state.progress?.highestUnlockedLevel ?? 1;
    if (levelId > highest) {
      toast(`المستوى ${levelId} مقفول. أكمل المستوى ${levelId - 1} أولًا!`, { type: 'warn' });
      return;
    }
    this.launching = true;
    const overlay = h('div', { class: 'overlay' }, h('div', { class: 'box loader' }, h('div', { class: 'ring' }), `جاري تجهيز المستوى ${levelId}...`));
    uiRoot().appendChild(overlay);
    try {
      const { sessionId, seed } = await startLevel(levelId);
      this.go('Game', { levelId, sessionId, seed });
    } catch (e) {
      AudioManager.play('invalid');
      toast(e.message, { type: 'error' });
    } finally {
      overlay.remove();
      this.launching = false;
    }
  }

  /** Sends a finished level to the server. Kept locally until the server confirms. */
  async submitResult({ levelId, sessionId, moves }) {
    const uid = state.user?.uid;
    const payload = { levelId, sessionId, moves };
    if (uid) savePendingResult(uid, payload);
    setState({ pending: payload });
    const res = await completeLevel(sessionId, moves);
    if (uid) clearPendingResult(uid);
    setState({ pending: null });
    if (res.progress) setState({ progress: { ...(state.progress ?? DEFAULT_PROGRESS), ...res.progress } });
    if (res.wallet) setState({ wallet: { ...(state.wallet ?? {}), balance: res.wallet.balance } });
    return res;
  }

  async flushPending(manual) {
    const pending = state.pending;
    if (!pending || !state.user || this.flushing || state.practice) return;
    if (!navigator.onLine) {
      if (manual) toast('لا يوجد اتصال بالإنترنت.', { type: 'warn' });
      return;
    }
    this.flushing = true;
    try {
      const res = await this.submitResult(pending);
      if (res.status === 'won') {
        const coins = res.coinsGranted ? ` (+${res.coinsGranted} كوينز)` : '';
        toast(`تم حفظ نتيجة المستوى ${pending.levelId}${coins}`, { type: 'success' });
      }
    } catch (e) {
      if (!e.retryable) {
        clearPendingResult(state.user.uid);
        setState({ pending: null });
        if (manual) toast(e.message, { type: 'error' });
      } else if (manual) toast(e.message, { type: 'error' });
    } finally {
      this.flushing = false;
    }
  }
}

export const app = new App();
