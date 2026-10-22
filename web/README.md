# FoodCoins — نسخة الويب (Phaser 3 + Firebase)

لعبة مطابقة أكلات (Match-3) على لوحة 5×8، فيها وجبة مخفية تحت الثلج، وخريطة مستويات متعرجة، ونظام كوينز محمي من الخادم.

## التشغيل السريع

```bash
cd web
npm install
npm --prefix functions install

# 1) تشغيل محلي كامل بدون مشروع Firebase حقيقي (Emulator Suite)
npm run emulators          # في نافذة
npm run dev:emulators      # في نافذة أخرى -> http://localhost:5173

# 2) تشغيل مع مشروع Firebase الحقيقي (بعد خطوات الإعداد بالأسفل)
cp .env.example .env.local # ضع قيم مشروعك
npm run dev
```

لو ملف `.env.local` مش موجود، شاشة الدخول هتعرض زر **"وضع تجريبي"** عشان تجرب اللعب بدون حفظ.

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm test` | اختبارات منطق اللعبة (المطابقة، القطع الخاصة، الحركات، إعادة التشغيل على الخادم) |
| `npm run test:emulators` | اختبارات الخادم والأمان على Emulator (مكافأة مرة واحدة، منع تعديل الرصيد، الاستعادة من جهاز آخر...) |
| `npm run simulate` | نسبة فوز بوت على كل مستوى (لضبط الصعوبة) |
| `npm run art` | إعادة توليد الرسومات (SVG) من `scripts/generate_art.py` |
| `npm run build` | بناء نسخة الإنتاج في `dist/` |
| `npm run deploy` | نشر Hosting + Functions + Rules |

## بنية المشروع

```
src/
  main.js, app.js, state.js, assets.js
  firebase/   config.js, auth.js, callable.js, progressService.js, walletService.js
  scenes/     BootScene, LoginScene, MapScene, GameScene, ResultScene
  game/       MatchEngine, SpecialPieces, LevelConfig, SnowReward, AudioManager, EffectsManager, rng
  ui/         styles.css, components/ (login, map, toast, عناصر Phaser)
functions/src/ index.js (initPlayer, startLevel, completeLevel), rewards.js
assets/       food/ meals/ effects/ ui/ backgrounds/ fonts/
tests/        engine.test.js, emulator/backend.test.js
firestore.rules, firebase.json, .env.example
```

## كيف الكوينز محمية

1. اللاعب يضغط على مستوى → الدالة `startLevel` تتأكد إن المستوى مفتوح، وتنشئ جلسة فيها **seed عشوائي من الخادم**.
2. اللوحة بتتولد من الـ seed، واللعبة بتسجل الحركات بس.
3. عند الفوز → `completeLevel` بتعيد تشغيل الحركات على الخادم بنفس كود اللعبة (`MatchEngine`). لو النتيجة مش فوز حقيقي، مفيش أي مكافأة.
4. المكافأة بتتسجل في `users/{uid}/transactions/level-{N}` جوه **Transaction**، ومعاها `FieldValue.increment` للرصيد. لأن معرّف المعاملة ثابت لكل مستوى، المكافأة مستحيل تتسجل مرتين (حتى لو اتبعت نفس الطلب أكتر من مرة أو حصل ضغط متكرر).
5. `firestore.rules` بتسمح للاعب **بالقراءة فقط** لبياناته. أي كتابة للرصيد أو التقدم أو المعاملات بتترفض.

بنية البيانات:

```
users/{uid}                     displayName, email, photoURL, createdAt, lastLoginAt
users/{uid}/progress/main       highestUnlockedLevel, completedLevels, levelStars, updatedAt, schemaVersion
users/{uid}/wallet/main         balance, updatedAt
users/{uid}/transactions/{id}   type, levelId, amount, stars, mealRevealed, sessionId, createdAt
users/{uid}/sessions/{id}       levelId, seed, status, result   (للخادم فقط)
```

## خطوات ربط Firebase

1. **إنشاء المشروع**: من [Firebase Console](https://console.firebase.google.com) اعمل مشروع جديد (أو استخدم مشروعك الحالي).
2. **خطة Blaze**: الـ Cloud Functions محتاجة خطة **Blaze** (الدفع حسب الاستخدام، وفيها حصة مجانية كبيرة). من *Usage and billing* فعّلها، ويُفضّل تعمل Budget alert.
3. **إضافة تطبيق ويب**: من *Project settings → General → Your apps → Add app → Web*، وانسخ قيم `firebaseConfig` في ملف `web/.env.local` (انسخه من `.env.example`).
4. **Authentication**: من *Build → Authentication → Get started → Sign-in method* فعّل:
   - **Email/Password**
   - **Google** (واختار Support email)
   - ومن *Settings → Authorized domains* ضيف الدومين اللي هتنشر عليه (`localhost` موجود تلقائيًا).
   - (اختياري) من *Templates* غيّر لغة رسالة استعادة كلمة المرور للعربي.
5. **Firestore**: من *Build → Firestore Database → Create database*، اختار **Production mode** ومنطقة قريبة (مثلًا `europe-west1`).
6. **Firebase CLI**:
   ```bash
   npm i -g firebase-tools     # أو استخدم npx firebase
   firebase login
   cd web
   firebase use --add          # اختار مشروعك
   ```
7. **منطقة الدوال**: الدوال مضبوطة على `europe-west1` في `functions/src/index.js`. لو غيرتها، غيّر `VITE_FIREBASE_FUNCTIONS_REGION` في `.env.local` بنفس القيمة.
8. **النشر**:
   ```bash
   npm run build
   firebase deploy --only firestore:rules,functions,hosting
   ```
   (`predeploy` بينسخ ملفات منطق اللعبة لمجلد الدوال تلقائيًا.)
9. **App Check (للإنتاج)**: من *Build → App Check* سجّل تطبيق الويب بـ **reCAPTCHA v3**، وحط مفتاح الموقع في `VITE_APPCHECK_RECAPTCHA_SITE_KEY`، وبعد ما تتأكد إن الطلبات بتوصل سليمة اعمل ملف `functions/.env` فيه `ENFORCE_APP_CHECK=true` وانشر الدوال تاني.
10. **التأكد**: افتح الموقع، اعمل حساب، وتأكد إن `users/{uid}` اتعمل في Firestore، والعب المستوى الأول، وتأكد إن الرصيد زاد وإن المستوى التاني اتفتح.

> مفاتيح `firebaseConfig` في الويب مش أسرار. الحماية الفعلية في Rules والـ Functions والـ App Check. **لا تضع** أي Service Account أو مفتاح خاص في الكود.

## ملاحظات

- الأصوات والموسيقى كلها مولّدة بالـ Web Audio API (`AudioManager.js`)، فمفيش ملفات صوت لازم تتحمّل.
- الرسومات ملفات SVG بنفس الستايل (`assets/`)، وبيتولدوا من `scripts/generate_art.py`.
- المستويات وقواعد المكافآت في `src/game/LevelConfig.js` (30 مستوى). أي مستوى جديد بيتضاف هناك، والخادم بيقرأ نفس الإعدادات.
- القنبلة بتمسح كل الخانات اللي على بعد خطوتين أو أقل من مكانها (شكل معيّن ثابت من 13 خانة). الصاروخ بيمسح الصف كله.
