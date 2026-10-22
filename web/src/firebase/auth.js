import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebase } from './config.js';

const ERRORS = {
  'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
  'auth/missing-email': 'من فضلك اكتب البريد الإلكتروني.',
  'auth/missing-password': 'من فضلك اكتب كلمة المرور.',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد. يمكنك إنشاء حساب جديد.',
  'auth/wrong-password': 'كلمة المرور غير صحيحة.',
  'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب غير موجود.',
  'auth/invalid-login-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو الحساب غير موجود.',
  'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل. جرّب تسجيل الدخول أو استعادة كلمة المرور.',
  'auth/weak-password': 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.',
  'auth/network-request-failed': 'تعذر الاتصال بالإنترنت. تحقق من الشبكة وحاول مجددًا.',
  'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.',
  'auth/popup-closed-by-user': 'تم إلغاء تسجيل الدخول باستخدام Google.',
  'auth/cancelled-popup-request': 'تم إلغاء تسجيل الدخول باستخدام Google.',
  'auth/user-cancelled': 'تم إلغاء تسجيل الدخول باستخدام Google.',
  'auth/popup-blocked': 'المتصفح منع نافذة Google. سيتم التحويل لصفحة تسجيل الدخول...',
  'auth/user-disabled': 'تم إيقاف هذا الحساب.',
  'auth/operation-not-allowed': 'طريقة تسجيل الدخول هذه غير مفعّلة في إعدادات Firebase.',
  'auth/unauthorized-domain': 'هذا النطاق غير مصرح به في إعدادات Firebase Authentication.',
  'auth/account-exists-with-different-credential': 'هذا البريد مسجل بطريقة دخول أخرى.',
};

export function authErrorMessage(error) {
  return ERRORS[error?.code] ?? 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

export function isCancelError(error) {
  return ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'].includes(error?.code);
}

function auth() {
  const fb = getFirebase();
  if (!fb) throw Object.assign(new Error('firebase-not-configured'), { code: 'app/not-configured' });
  return fb.auth;
}

export function onAuthChange(callback) {
  const fb = getFirebase();
  if (!fb) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(fb.auth, callback);
}

export async function completeRedirectSignIn() {
  const fb = getFirebase();
  if (!fb) return null;
  return getRedirectResult(fb.auth);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth(), provider);
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth(), provider);
      return null;
    }
    throw error;
  }
}

export function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth(), email.trim(), password);
}

export async function signUpWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth(), email.trim(), password);
  const name = email.trim().split('@')[0];
  await updateProfile(cred.user, { displayName: name }).catch(() => {});
  return cred;
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth(), email.trim());
}

export function signOut() {
  return fbSignOut(auth());
}
