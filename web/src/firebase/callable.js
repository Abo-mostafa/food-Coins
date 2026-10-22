import { httpsCallable } from 'firebase/functions';
import { getFirebase } from './config.js';

const MESSAGES = {
  unavailable: 'تعذر الوصول للخادم. تحقق من اتصال الإنترنت.',
  'deadline-exceeded': 'استغرق الخادم وقتًا طويلًا. حاول مرة أخرى.',
  unauthenticated: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.',
  'permission-denied': 'غير مسموح بهذه العملية.',
  'failed-precondition': 'لا يمكن تنفيذ العملية الآن.',
  'invalid-argument': 'بيانات غير صالحة.',
  'not-found': 'البيانات المطلوبة غير موجودة.',
  'resource-exhausted': 'طلبات كثيرة. انتظر قليلًا.',
  internal: 'حدث خطأ في الخادم. حاول مرة أخرى.',
};

export class ServiceError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.retryable = ['unavailable', 'deadline-exceeded', 'internal', 'unknown'].includes(code);
  }
}

export async function call(name, data, { timeout = 20000 } = {}) {
  const fb = getFirebase();
  if (!fb) throw new ServiceError('not-configured', 'Firebase غير مهيأ.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ServiceError('unavailable', MESSAGES.unavailable);
  }
  try {
    const fn = httpsCallable(fb.functions, name, { timeout });
    const res = await fn(data);
    return res.data;
  } catch (error) {
    const code = String(error?.code ?? 'unknown').replace('functions/', '');
    const reason = error?.details?.reason;
    const message = REASONS[reason] ?? MESSAGES[code] ?? 'حدث خطأ غير متوقع.';
    throw new ServiceError(code, message, error?.details);
  }
}

const REASONS = {
  'level-locked': 'هذا المستوى مقفول. أكمل المستوى السابق أولًا.',
  'invalid-replay': 'تعذر التحقق من نتيجة الجولة.',
  'session-expired': 'انتهت صلاحية الجولة. ابدأ المستوى من جديد.',
};
