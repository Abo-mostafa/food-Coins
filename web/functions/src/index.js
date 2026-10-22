import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { randomInt } from 'node:crypto';
import * as rewards from './rewards.js';

initializeApp();
const db = getFirestore();

// Keep in sync with VITE_FIREBASE_FUNCTIONS_REGION in the web app.
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

// Set ENFORCE_APP_CHECK=true (functions/.env) once App Check is configured for production.
const callOptions = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true', cors: true };

function requireUid(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required');
  return uid;
}

/** Creates profile/progress/wallet on first login, refreshes lastLoginAt afterwards. */
export const initPlayer = onCall(callOptions, async (request) => {
  const uid = requireUid(request);
  return rewards.initPlayer(db, uid, request.auth.token ?? {});
});

/** Issues a single-use level session with a server-generated seed (only for unlocked levels). */
export const startLevel = onCall(callOptions, async (request) => {
  const uid = requireUid(request);
  return rewards.startLevel(db, uid, Number(request.data?.levelId), randomInt(0, 2 ** 32 - 1));
});

/** Replays the submitted moves on the server; grants progress + coins atomically and only once. */
export const completeLevel = onCall(callOptions, async (request) => {
  const uid = requireUid(request);
  return rewards.completeLevel(db, uid, request.data?.sessionId, request.data?.moves);
});
