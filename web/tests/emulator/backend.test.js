import { describe, it, expect, beforeAll } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getLevel } from '../../src/game/LevelConfig.js';
import { MatchEngine } from '../../src/game/MatchEngine.js';
import { playWithBot } from '../bot.js';

const PROJECT = 'demo-foodcoins';
let n = 0;

function client() {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, appId: '1:0:web:0', authDomain: `${PROJECT}.firebaseapp.com` }, `c${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const fns = getFunctions(app, 'europe-west1');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  const call = async (name, data) => (await httpsCallable(fns, name)(data)).data;
  return { app, auth, db, call };
}

async function codeOf(promise) {
  try {
    await promise;
    return 'ok';
  } catch (e) {
    return e.code;
  }
}

/** Starts sessions until the greedy bot wins one, returns { sessionId, moves }. */
async function winLevel(c, levelId) {
  for (let i = 0; i < 8; i++) {
    const { sessionId, seed } = await c.call('startLevel', { levelId });
    const { result, moves } = playWithBot(getLevel(levelId), seed);
    if (result.status === 'won') return { sessionId, moves, seed };
  }
  throw new Error('bot could not win');
}

describe('FoodCoins backend (emulators)', () => {
  const email = `player${Date.now()}@test.com`;
  const password = 'secret123';
  let c;
  let uid;

  beforeAll(async () => {
    c = client();
    const cred = await createUserWithEmailAndPassword(c.auth, email, password);
    uid = cred.user.uid;
  });

  it('initPlayer creates default profile, progress and wallet', async () => {
    const res = await c.call('initPlayer', {});
    expect(res.created).toBe(true);
    expect(res.progress.highestUnlockedLevel).toBe(1);
    expect(res.wallet.balance).toBe(0);
    const prof = await getDoc(doc(c.db, 'users', uid));
    expect(prof.data().email).toBe(email);
    expect(prof.data().password).toBeUndefined();
    const again = await c.call('initPlayer', {});
    expect(again.created).toBe(false);
  });

  it('refuses to start a locked level', async () => {
    expect(await codeOf(c.call('startLevel', { levelId: 2 }))).toBe('functions/failed-precondition');
    expect(await codeOf(c.call('startLevel', { levelId: 999 }))).toBe('functions/invalid-argument');
  });

  it('rejects a forged move list', async () => {
    const { sessionId, seed } = await c.call('startLevel', { levelId: 1 });
    const e = new MatchEngine({ level: getLevel(1), seed });
    let bad = null;
    for (let r = 0; r < 8 && !bad; r++) for (let col = 0; col < 4 && !bad; col++) if (!e.clone().trySwap(r, col, r, col + 1).valid) bad = [r, col, r, col + 1];
    expect(await codeOf(c.call('completeLevel', { sessionId, moves: [bad] }))).toBe('functions/invalid-argument');
  });

  it('does not unlock or reward a lost/unfinished level', async () => {
    const { sessionId, seed } = await c.call('startLevel', { levelId: 1 });
    const e = new MatchEngine({ level: getLevel(1), seed });
    e.trySwap(...e.findMove());
    const res = await c.call('completeLevel', { sessionId, moves: e.moveLog });
    expect(res.status).toBe('lost');
    expect(res.coinsGranted).toBe(0);
    const p = await getDoc(doc(c.db, 'users', uid, 'progress', 'main'));
    expect(p.data().highestUnlockedLevel).toBe(1);
  });

  it('a verified win unlocks the next level and pays coins exactly once', async () => {
    const { sessionId, moves } = await winLevel(c, 1);
    // Fire the same completion 3 times concurrently (double-click / retry).
    const results = await Promise.all([1, 2, 3].map(() => c.call('completeLevel', { sessionId, moves })));
    for (const r of results) expect(r.status).toBe('won');
    const granted = results[0].coinsGranted;
    expect(granted).toBeGreaterThan(0);
    expect(results.every((r) => r.coinsGranted === granted)).toBe(true);

    const wallet = (await getDoc(doc(c.db, 'users', uid, 'wallet', 'main'))).data();
    expect(wallet.balance).toBe(granted);
    const progress = (await getDoc(doc(c.db, 'users', uid, 'progress', 'main'))).data();
    expect(progress.highestUnlockedLevel).toBe(2);
    expect(progress.completedLevels).toEqual([1]);
    const tx = await getDoc(doc(c.db, 'users', uid, 'transactions', 'level-1'));
    expect(tx.data().amount).toBe(granted);

    // Replaying level 1 in a new session: progress ok, but no second reward.
    const second = await winLevel(c, 1);
    const res2 = await c.call('completeLevel', { sessionId: second.sessionId, moves: second.moves });
    expect(res2.alreadyRewarded).toBe(true);
    expect(res2.coinsGranted).toBe(0);
    expect((await getDoc(doc(c.db, 'users', uid, 'wallet', 'main'))).data().balance).toBe(granted);

    // Level 2 can now be started.
    expect(await codeOf(c.call('startLevel', { levelId: 2 }))).toBe('ok');
  });

  it('security rules block every client write to coins, progress and rewards', async () => {
    expect(await codeOf(setDoc(doc(c.db, 'users', uid, 'wallet', 'main'), { balance: 999999 }))).toBe('permission-denied');
    expect(await codeOf(updateDoc(doc(c.db, 'users', uid, 'wallet', 'main'), { balance: 999999 }))).toBe('permission-denied');
    expect(await codeOf(updateDoc(doc(c.db, 'users', uid, 'progress', 'main'), { highestUnlockedLevel: 30 }))).toBe('permission-denied');
    expect(await codeOf(setDoc(doc(c.db, 'users', uid, 'transactions', 'level-9'), { amount: 500 }))).toBe('permission-denied');
    expect(await codeOf(setDoc(doc(c.db, 'users', uid), { displayName: 'x' }))).toBe('permission-denied');
    expect(await codeOf(getDoc(doc(c.db, 'users', uid, 'sessions', 'abc')))).toBe('permission-denied');
  });

  it('users cannot read other players data', async () => {
    const other = client();
    await createUserWithEmailAndPassword(other.auth, `other${Date.now()}@test.com`, password);
    expect(await codeOf(getDoc(doc(other.db, 'users', uid, 'wallet', 'main')))).toBe('permission-denied');
    expect(await codeOf(getDoc(doc(other.db, 'users', uid)))).toBe('permission-denied');
    await deleteApp(other.app);
  });

  it('progress and balance are restored when signing in from another device', async () => {
    const device2 = client();
    await signInWithEmailAndPassword(device2.auth, email, password);
    const res = await device2.call('initPlayer', {});
    expect(res.created).toBe(false);
    expect(res.progress.highestUnlockedLevel).toBe(2);
    const wallet = (await getDoc(doc(device2.db, 'users', uid, 'wallet', 'main'))).data();
    expect(wallet.balance).toBeGreaterThan(0);
    await deleteApp(device2.app);
  });

  it('unauthenticated calls are rejected', async () => {
    const anon = client();
    expect(await codeOf(anon.call('initPlayer', {}))).toBe('functions/unauthenticated');
    expect(await codeOf(anon.call('startLevel', { levelId: 1 }))).toBe('functions/unauthenticated');
    await deleteApp(anon.app);
  });
});
