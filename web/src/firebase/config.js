import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
export const usingEmulators = env.VITE_USE_EMULATORS === 'true';
const functionsRegion = env.VITE_FIREBASE_FUNCTIONS_REGION || 'europe-west1';

let services = null;

export function getFirebase() {
  if (!isFirebaseConfigured) return null;
  if (services) return services;

  const app = initializeApp(firebaseConfig);

  const appCheckKey = env.VITE_APPCHECK_RECAPTCHA_SITE_KEY;
  if (appCheckKey && !usingEmulators) {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(appCheckKey), isTokenAutoRefreshEnabled: true });
  }

  // Firebase-managed persistence (IndexedDB, falling back to localStorage); no tokens handled manually.
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  auth.languageCode = 'ar';

  const db = initializeFirestore(app, {});
  const functions = getFunctions(app, functionsRegion);

  if (usingEmulators) {
    const host = window.location.hostname || '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  }

  services = { app, auth, db, functions };
  return services;
}
