import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from './config.js';
import { call } from './callable.js';

export const DEFAULT_PROGRESS = Object.freeze({
  highestUnlockedLevel: 1,
  completedLevels: [],
  levelStars: {},
  schemaVersion: 1,
});

/** Creates the player's profile/progress/wallet on first login (server side) and refreshes lastLoginAt. */
export function initPlayer() {
  return call('initPlayer', {});
}

export function subscribeProgress(uid, onData, onError) {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, 'users', uid, 'progress', 'main'),
    { includeMetadataChanges: false },
    (snap) => onData(snap.exists() ? { ...DEFAULT_PROGRESS, ...snap.data() } : null),
    onError,
  );
}

/** Asks the server for a fresh, single-use level session (seed). Fails if the level is locked. */
export function startLevel(levelId) {
  return call('startLevel', { levelId });
}

/** Sends the move list; the server replays it, then records progress + coins once. Idempotent per session. */
export function completeLevel(sessionId, moves) {
  return call('completeLevel', { sessionId, moves }, { timeout: 30000 });
}

const pendingKey = (uid) => `fc_pending_${uid}`;

export function savePendingResult(uid, payload) {
  try {
    localStorage.setItem(pendingKey(uid), JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export function loadPendingResult(uid) {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(uid)) ?? 'null');
  } catch {
    return null;
  }
}

export function clearPendingResult(uid) {
  try {
    localStorage.removeItem(pendingKey(uid));
  } catch {
    /* ignore */
  }
}
