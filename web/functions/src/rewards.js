// Server-side level verification + atomic, idempotent reward granting.
import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getLevel, LEVEL_COUNT, computeReward } from './shared/LevelConfig.js';
import { replayLevel } from './shared/MatchEngine.js';

export const SCHEMA_VERSION = 1;
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

const refs = (db, uid) => {
  const user = db.collection('users').doc(uid);
  return {
    user,
    progress: user.collection('progress').doc('main'),
    wallet: user.collection('wallet').doc('main'),
    sessions: user.collection('sessions'),
    transactions: user.collection('transactions'),
  };
};

export const defaultProgress = () => ({
  highestUnlockedLevel: 1,
  completedLevels: [],
  levelStars: {},
  schemaVersion: SCHEMA_VERSION,
  updatedAt: FieldValue.serverTimestamp(),
});

function publicProgress(p) {
  return {
    highestUnlockedLevel: p?.highestUnlockedLevel ?? 1,
    completedLevels: p?.completedLevels ?? [],
    levelStars: p?.levelStars ?? {},
  };
}

export async function initPlayer(db, uid, token) {
  const r = refs(db, uid);
  return db.runTransaction(async (tx) => {
    const [userSnap, progressSnap, walletSnap] = await Promise.all([tx.get(r.user), tx.get(r.progress), tx.get(r.wallet)]);
    const profile = {
      displayName: token.name ?? token.email?.split('@')[0] ?? 'لاعب',
      email: token.email ?? null,
      photoURL: token.picture ?? null,
      lastLoginAt: FieldValue.serverTimestamp(),
    };
    if (!userSnap.exists) tx.set(r.user, { ...profile, createdAt: FieldValue.serverTimestamp() });
    else tx.update(r.user, profile);

    let progress = progressSnap.data();
    if (!progressSnap.exists) {
      progress = defaultProgress();
      tx.set(r.progress, progress);
    }
    let wallet = walletSnap.data();
    if (!walletSnap.exists) {
      wallet = { balance: 0, updatedAt: FieldValue.serverTimestamp() };
      tx.set(r.wallet, wallet);
    }
    return { created: !userSnap.exists, progress: publicProgress(progress), wallet: { balance: wallet.balance ?? 0 } };
  });
}

export async function startLevel(db, uid, levelId, seed) {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVEL_COUNT) {
    throw new HttpsError('invalid-argument', 'Unknown level', { reason: 'bad-level' });
  }
  const r = refs(db, uid);
  const progressSnap = await r.progress.get();
  if (!progressSnap.exists) throw new HttpsError('failed-precondition', 'Player not initialized', { reason: 'no-player' });
  const unlocked = progressSnap.data().highestUnlockedLevel ?? 1;
  if (levelId > unlocked) throw new HttpsError('failed-precondition', 'Level locked', { reason: 'level-locked' });

  const session = r.sessions.doc();
  await session.set({ levelId, seed, status: 'active', createdAt: FieldValue.serverTimestamp(), createdAtMs: Date.now() });
  return { sessionId: session.id, seed, levelId };
}

export async function completeLevel(db, uid, sessionId, moves) {
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(sessionId)) {
    throw new HttpsError('invalid-argument', 'Bad session id');
  }
  if (!Array.isArray(moves) || moves.length > 200) throw new HttpsError('invalid-argument', 'Bad moves');

  const r = refs(db, uid);
  const sessionRef = r.sessions.doc(sessionId);
  const first = await sessionRef.get();
  if (!first.exists) throw new HttpsError('not-found', 'Session not found');
  const session = first.data();
  if (session.status !== 'active') return session.result ?? { status: session.status };
  if (Date.now() - (session.createdAtMs ?? 0) > SESSION_TTL_MS) {
    await sessionRef.update({ status: 'expired' });
    throw new HttpsError('failed-precondition', 'Session expired', { reason: 'session-expired' });
  }

  const level = getLevel(session.levelId);
  // Deterministic replay of the exact moves from the server-issued seed.
  const replay = replayLevel(level, session.seed, moves);

  return db.runTransaction(async (tx) => {
    const txId = `level-${level.id}`;
    const txRef = r.transactions.doc(txId);
    const [sessionSnap, progressSnap, walletSnap, rewardSnap] = await Promise.all([
      tx.get(sessionRef),
      tx.get(r.progress),
      tx.get(r.wallet),
      tx.get(txRef),
    ]);
    const s = sessionSnap.data();
    // Another request for this session already finished: return the stored result (idempotent).
    if (s.status !== 'active') return s.result ?? { status: s.status };

    if (replay.status === 'invalid') {
      tx.update(sessionRef, { status: 'rejected', reason: replay.reason, finishedAt: FieldValue.serverTimestamp() });
      throw new HttpsError('invalid-argument', 'Replay rejected', { reason: 'invalid-replay' });
    }

    const progress = progressSnap.data() ?? defaultProgress();
    const balance = walletSnap.data()?.balance ?? 0;

    if (replay.status !== 'won') {
      const result = { status: 'lost', levelId: level.id, score: replay.score, coinsGranted: 0, progress: publicProgress(progress), wallet: { balance } };
      tx.update(sessionRef, { status: 'lost', result, finishedAt: FieldValue.serverTimestamp() });
      return result;
    }

    const reward = computeReward(level, replay);
    const alreadyRewarded = rewardSnap.exists;
    const coinsGranted = alreadyRewarded ? 0 : reward.coins;

    const prevStars = progress.levelStars?.[level.id] ?? 0;
    const nextProgress = {
      highestUnlockedLevel: Math.max(progress.highestUnlockedLevel ?? 1, Math.min(level.id + 1, LEVEL_COUNT)),
      completedLevels: [...new Set([...(progress.completedLevels ?? []), level.id])].sort((a, b) => a - b),
      levelStars: { ...(progress.levelStars ?? {}), [level.id]: Math.max(prevStars, reward.stars) },
    };
    tx.set(r.progress, { ...nextProgress, schemaVersion: SCHEMA_VERSION, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    if (!alreadyRewarded) {
      // Unique transaction id per level => a level reward can only ever be written once.
      tx.create(txRef, {
        type: 'level_reward',
        levelId: level.id,
        amount: coinsGranted,
        stars: reward.stars,
        mealRevealed: reward.mealRevealed,
        sessionId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(r.wallet, { balance: FieldValue.increment(coinsGranted), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    const result = {
      status: 'won',
      levelId: level.id,
      score: replay.score,
      stars: reward.stars,
      mealRevealed: reward.mealRevealed,
      coinsEarned: reward.coins,
      coinsGranted,
      alreadyRewarded,
      progress: nextProgress,
      wallet: { balance: balance + coinsGranted },
    };
    tx.update(sessionRef, { status: 'completed', result, finishedAt: FieldValue.serverTimestamp() });
    return result;
  });
}
