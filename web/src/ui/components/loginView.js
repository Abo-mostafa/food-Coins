import { h, uiRoot, ICONS } from './dom.js';
import { FOOD_IMAGES, UI_IMAGES } from '../../assets.js';
import { isFirebaseConfigured } from '../../firebase/config.js';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  authErrorMessage,
  isCancelError,
} from '../../firebase/auth.js';
import { AudioManager } from '../../game/AudioManager.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mountLogin({ onPractice } = {}) {
  const msg = h('div', { class: 'msg', role: 'status' });
  const email = h('input', { type: 'email', id: 'email', autocomplete: 'email', inputmode: 'email', placeholder: 'name@example.com' });
  const password = h('input', { type: 'password', id: 'password', autocomplete: 'current-password', placeholder: '••••••' });
  const togglePass = h('button', { type: 'button', class: 'toggle-pass', 'aria-label': 'إظهار كلمة المرور' }, 'إظهار');
  togglePass.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    togglePass.textContent = show ? 'إخفاء' : 'إظهار';
  });

  const googleBtn = h('button', { type: 'button', class: 'btn btn-google', html: `${ICONS.google}<span>المتابعة باستخدام Google</span>` });
  const loginBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, 'تسجيل الدخول');
  const signupBtn = h('button', { type: 'button', class: 'btn btn-secondary' }, 'إنشاء حساب جديد');
  const forgotBtn = h('button', { type: 'button', class: 'btn-link' }, 'نسيت كلمة المرور؟');
  const buttons = [googleBtn, loginBtn, signupBtn, forgotBtn];

  const card = h(
    'div',
    { class: 'login-card' },
    h(
      'div',
      { class: 'brand' },
      h('div', { class: 'brand-logo' }, h('img', { src: UI_IMAGES.logoCoin, alt: '' }), h('span', { class: 'brand-name' }, 'FoodCoins')),
      h('div', { class: 'brand-tag' }, 'طابق الأكلات، اكشف الوجبة، واجمع الكوينز!'),
      h('div', { class: 'brand-foods' }, ...Object.values(FOOD_IMAGES).map((src) => h('img', { src, alt: '' }))),
    ),
    h(
      'form',
      { class: 'form', novalidate: true },
      googleBtn,
      h('div', { class: 'divider' }, 'أو بالبريد الإلكتروني'),
      h('div', { class: 'field' }, h('label', { for: 'email' }, 'البريد الإلكتروني'), email),
      h('div', { class: 'field' }, h('label', { for: 'password' }, 'كلمة المرور'), password, togglePass),
      msg,
      loginBtn,
      signupBtn,
      h('div', { style: { textAlign: 'center' } }, forgotBtn),
    ),
  );

  if (!isFirebaseConfigured) {
    buttons.forEach((b) => (b.disabled = true));
    card.appendChild(
      h('div', {
        class: 'setup-note',
        html:
          'لم يتم ربط Firebase بعد. انسخ <code>.env.example</code> إلى <code>.env.local</code> وضع إعدادات مشروعك (راجع README)، ثم أعد تشغيل الخادم.',
      }),
    );
    if (onPractice) {
      card.appendChild(
        h('button', { type: 'button', class: 'btn btn-secondary', style: { marginTop: '10px' }, onclick: () => onPractice() }, 'جرّب اللعب (وضع تجريبي بدون حفظ)'),
      );
    }
  } else if (onPractice && import.meta.env.DEV) {
    card.appendChild(h('div', { style: { textAlign: 'center', marginTop: '6px' } }, h('button', { type: 'button', class: 'btn-link', onclick: () => onPractice() }, 'وضع تجريبي (للتطوير فقط)')));
  }

  const view = h('div', { class: 'login-view' }, card);
  uiRoot().replaceChildren(view);

  function show(text, type = 'error') {
    msg.className = `msg ${type} show`;
    msg.textContent = text;
    if (type === 'error') {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      AudioManager.play('invalid');
    }
  }
  function clear() {
    msg.className = 'msg';
  }

  async function run(button, task, loadingText) {
    AudioManager.unlock();
    AudioManager.play('click');
    if (!navigator.onLine) return show('لا يوجد اتصال بالإنترنت. تحقق من الشبكة وحاول مجددًا.');
    clear();
    const label = button.innerHTML;
    buttons.forEach((b) => (b.disabled = true));
    button.innerHTML = `<span class="spinner"></span><span>${loadingText}</span>`;
    try {
      await task();
    } catch (error) {
      if (isCancelError(error)) show(authErrorMessage(error), 'info');
      else show(authErrorMessage(error));
    } finally {
      if (view.isConnected) {
        button.innerHTML = label;
        buttons.forEach((b) => (b.disabled = false));
      }
    }
  }

  function validate({ needPassword = true } = {}) {
    const e = email.value.trim();
    if (!e) return show('من فضلك اكتب البريد الإلكتروني.'), false;
    if (!EMAIL_RE.test(e)) return show('صيغة البريد الإلكتروني غير صحيحة.'), false;
    if (needPassword && !password.value) return show('من فضلك اكتب كلمة المرور.'), false;
    return true;
  }

  googleBtn.addEventListener('click', () =>
    run(googleBtn, async () => {
      const res = await signInWithGoogle();
      if (res) show('تم تسجيل الدخول بنجاح! جاري تحميل تقدمك...', 'success');
    }, 'جاري الاتصال بـ Google...'),
  );

  card.querySelector('form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    run(loginBtn, async () => {
      await signInWithEmail(email.value, password.value);
      show('تم تسجيل الدخول بنجاح! جاري تحميل تقدمك...', 'success');
    }, 'جاري الدخول...');
  });

  signupBtn.addEventListener('click', () => {
    if (!validate()) return;
    if (password.value.length < 6) return show('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
    run(signupBtn, async () => {
      await signUpWithEmail(email.value, password.value);
      show('تم إنشاء حسابك بنجاح! جاري تجهيز ملفك...', 'success');
    }, 'جاري إنشاء الحساب...');
  });

  forgotBtn.addEventListener('click', () => {
    if (!validate({ needPassword: false })) return;
    run(forgotBtn, async () => {
      try {
        await resetPassword(email.value);
      } catch (error) {
        // Don't reveal whether an account exists for this email.
        if (error?.code !== 'auth/user-not-found') throw error;
      }
      show('إذا كان هذا البريد مسجلًا لدينا، ستصلك رسالة لإعادة تعيين كلمة المرور خلال دقائق.', 'success');
    }, 'جاري الإرسال...');
  });

  return {
    showMessage: show,
    unmount: () => view.remove(),
  };
}
