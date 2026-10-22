import Phaser from 'phaser';
import { getLevel, LEVEL_COUNT, MEALS, FOOD_NAMES } from '../game/LevelConfig.js';
import { AudioManager } from '../game/AudioManager.js';
import { EffectsManager } from '../game/EffectsManager.js';
import { text, drawPanel, makeButton, DISPLAY_FONT } from '../ui/components/phaserUi.js';
import { app } from '../app.js';

const AUTO_RETURN_SECONDS = 7;

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.data_ = data;
  }

  create() {
    const d = this.data_;
    this.level = getLevel(d.levelId);
    const dpr = this.game.registry.get('dpr') || 1;
    const { width: W, height: H } = this.scale;
    const U = dpr * Phaser.Math.Clamp(Math.min(W / dpr / 400, H / dpr / 760), 0.75, 1.4);
    this.U = U;
    this.effects = new EffectsManager(this, U);

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x3a1600, 0).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.6, duration: 250 });

    const pw = Math.min(W * 0.92, 430 * U);
    const ph = Math.min(H * 0.9, 600 * U);
    this.pw = pw;
    this.ph = ph;
    this.panel = this.add.container(W / 2, H / 2);
    const g = this.add.graphics();
    drawPanel(g, -pw / 2, -ph / 2, pw, ph, { radius: 34 * U, borderWidth: 6 * U, shadowOffset: 12 * U, border: 0xffc070 });
    this.panel.add(g);

    // ribbon
    const won = d.status === 'won';
    const rib = this.add.graphics();
    const rw = pw * 0.86;
    const rh = 64 * U;
    const ry = -ph / 2 - rh * 0.25;
    rib.fillStyle(won ? 0xc24a00 : 0x8d2a1e, 1).fillRoundedRect(-rw / 2, ry + 6 * U, rw, rh, 20 * U);
    rib.fillStyle(won ? 0xff8a1f : 0xe5533d, 1).fillRoundedRect(-rw / 2, ry, rw, rh, 20 * U);
    rib.fillStyle(0xffffff, 0.22).fillRoundedRect(-rw / 2 + 12 * U, ry + 6 * U, rw - 24 * U, rh * 0.35, 10 * U);
    this.panel.add(rib);
    this.panel.add(
      text(this, 0, ry + rh / 2, won ? `أحسنت! المستوى ${d.levelId}` : 'انتهت الحركات!', {
        size: 30 * U,
        font: DISPLAY_FONT,
        color: '#ffffff',
        stroke: won ? '#a83c00' : '#7a1c10',
        strokeThickness: 6 * U,
      }),
    );

    this.panel.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut' });

    if (won) this.buildWin();
    else this.buildLose();
  }

  // ---------- lose ----------

  buildLose() {
    const U = this.U;
    const { ph, pw } = this;
    const d = this.data_;
    AudioManager.play('lose');
    const goalsLine = this.level.goals
      .map((g) => `${FOOD_NAMES[g.type]}: ${Math.min(d.local.collected[g.type] ?? 0, g.count)}/${g.count}`)
      .join('   ');
    const meal = this.add.image(0, -ph * 0.17, `meal_${this.level.meal.key}`).setDisplaySize(150 * U, 150 * U).setTint(0xb8d8ef);
    const ice = this.add.image(0, -ph * 0.17, 'snow_layer').setDisplaySize(160 * U, 160 * U).setAlpha(0.75);
    this.panel.add([meal, ice]);
    this.panel.add(text(this, 0, ph * 0.06, 'الوجبة لسه متجمدة! حاول مرة أخرى، أنت قريب.', { size: 19 * U, wrap: pw * 0.85 }));
    this.panel.add(text(this, 0, ph * 0.15, goalsLine, { size: 16 * U, color: '#a0602a', wrap: pw * 0.9 }));
    this.panel.add(text(this, 0, ph * 0.22, `النقاط: ${d.local.score}`, { size: 18 * U, color: '#8a4a16' }));
    this.panel.add(text(this, 0, ph * 0.28, 'لم يتم فتح المستوى التالي ولا تُمنح مكافأة.', { size: 14 * U, color: '#b07a4a' }));
    const bw = pw * 0.4;
    const bh = 58 * U;
    this.panel.add(
      makeButton(this, { x: pw * 0.22, y: ph / 2 - bh, w: bw, h: bh, label: 'إعادة المحاولة', color: 'orange', onClick: () => app.launchLevel(d.levelId) }),
    );
    this.panel.add(makeButton(this, { x: -pw * 0.22, y: ph / 2 - bh, w: bw, h: bh, label: 'الخريطة', color: 'cream', onClick: () => app.go('Map') }));
  }

  // ---------- win ----------

  async buildWin() {
    const U = this.U;
    const { ph, pw } = this;
    const d = this.data_;

    const rays = this.add.graphics();
    rays.fillStyle(0xffe082, 0.5);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      rays.slice(0, 0, 130 * U, a, a + Math.PI / 20, false).fillPath();
    }
    rays.setPosition(0, -ph * 0.27);
    this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
    const meal = this.add.image(0, -ph * 0.27, `meal_${this.level.meal.key}`).setDisplaySize(130 * U, 130 * U);
    this.tweens.add({ targets: meal, y: meal.y - 6 * U, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.panel.add([rays, meal]);
    this.panel.add(text(this, 0, -ph * 0.27 + 76 * U, `كشفت: ${MEALS[this.level.meal.key].name}`, { size: 17 * U, color: '#8a4a16' }));

    this.stars = [-1, 0, 1].map((i) => {
      const s = this.add.image(i * 78 * U, ph * -0.02 + (i === 0 ? -10 * U : 0), 'star_empty').setDisplaySize(i === 0 ? 86 * U : 70 * U, i === 0 ? 86 * U : 70 * U);
      this.panel.add(s);
      return s;
    });

    this.scoreText = text(this, 0, ph * 0.065, `النقاط: ${d.local.score}`, { size: 20 * U });
    this.panel.add(this.scoreText);

    this.coinRow = this.add.container(0, ph * 0.135);
    this.coinIcon = this.add.image(36 * U, 0, 'coin').setDisplaySize(40 * U, 40 * U);
    this.coinText = text(this, -18 * U, 0, '', { size: 28 * U, color: '#c77700', font: DISPLAY_FONT });
    this.coinRow.add([this.coinIcon, this.coinText]).setVisible(false);
    this.panel.add(this.coinRow);

    this.status = text(this, 0, ph * 0.225, 'جاري حفظ التقدم على الخادم...', { size: 16 * U, color: '#8a5300', wrap: pw * 0.88 });
    this.spinner = this.add.image(0, ph * 0.135, 'coin').setDisplaySize(44 * U, 44 * U);
    this.tweens.add({ targets: this.spinner, scaleX: { from: this.spinner.scaleX, to: -this.spinner.scaleX }, duration: 400, yoyo: true, repeat: -1 });
    this.panel.add([this.status, this.spinner]);
    this.effects.confettiRain(this.scale.width, 90);

    await new Promise((r) => this.time.delayedCall(500, r));
    if (d.practice) {
      this.showWin(app.practiceComplete(d.levelId, d.local));
      return;
    }
    this.submit();
  }

  async submit() {
    const d = this.data_;
    this.clearButtons();
    this.spinner.setVisible(true);
    this.status.setColor('#8a5300').setText('جاري حفظ التقدم على الخادم...');
    try {
      const res = await app.submitResult({ levelId: d.levelId, sessionId: d.sessionId, moves: d.moves });
      if (!this.sys.isActive()) return;
      if (res.status !== 'won') {
        this.spinner.setVisible(false);
        this.status.setColor('#b3261e').setText('تعذر التحقق من نتيجة الجولة على الخادم، لذلك لم تُحتسب.');
        this.addButtons([{ label: 'الخريطة', color: 'orange', onClick: () => app.go('Map') }]);
        return;
      }
      this.showWin(res);
    } catch (e) {
      if (!this.sys.isActive()) return;
      this.spinner.setVisible(false);
      AudioManager.play('invalid');
      const keep = e.retryable ? '\nنتيجتك محفوظة على جهازك وسنعيد المحاولة تلقائيًا.' : '';
      this.status.setColor('#b3261e').setText(`لم يتم حفظ التقدم: ${e.message}\nلن يُفتح المستوى التالي حتى يتم الحفظ.${keep}`);
      const buttons = [{ label: 'الخريطة', color: 'cream', onClick: () => app.go('Map') }];
      if (e.retryable) buttons.unshift({ label: 'إعادة المحاولة', color: 'orange', onClick: () => this.submit() });
      this.addButtons(buttons);
    }
  }

  async showWin(res) {
    const U = this.U;
    const d = this.data_;
    this.spinner.setVisible(false);
    const stars = res.stars ?? 1;
    for (let i = 0; i < 3; i++) {
      const s = this.stars[i];
      if (i < stars) {
        await new Promise((r) => this.time.delayedCall(260, r));
        const target = s.displayWidth;
        s.setTexture('star');
        s.setDisplaySize(target * 2.4, target * 2.4);
        this.tweens.add({ targets: s, displayWidth: target, displayHeight: target, duration: 340, ease: 'Back.easeOut' });
        AudioManager.play('star', { index: i });
        const m = s.getWorldTransformMatrix();
        this.effects.sparkle(m.tx, m.ty, 16);
      }
    }

    if (res.practice) {
      this.status.setColor('#8a5300').setText('وضع تجريبي: لا تُمنح كوينز ولا يُحفظ التقدم.');
    } else {
      this.coinRow.setVisible(true);
      const amount = res.coinsGranted ?? 0;
      if (amount > 0) {
        this.tweens.addCounter({
          from: 0,
          to: amount,
          duration: 900,
          onUpdate: (t) => this.coinText.setText(`+${Math.round(t.getValue())}`),
        });
        for (let i = 0; i < Math.min(amount, 8); i++) this.time.delayedCall(i * 90, () => AudioManager.play('coin'));
        this.tweens.add({ targets: this.coinIcon, angle: 360, duration: 900 });
      } else {
        this.coinText.setText('+0');
      }
      const lines = ['تم حفظ تقدمك بنجاح.'];
      if (res.alreadyRewarded) lines.push('تم استلام مكافأة هذا المستوى من قبل.');
      if (res.wallet) lines.push(`رصيدك الآن: ${res.wallet.balance} كوينز`);
      this.status.setColor('#2e7d32').setText(lines.join('\n'));
    }
    if (d.levelId < LEVEL_COUNT) {
      const unlock = text(this, 0, this.ph * 0.315, `تم فتح المستوى ${d.levelId + 1}!`, { size: 18 * U, color: '#e8590c', font: DISPLAY_FONT });
      this.panel.add(unlock);
      unlock.setScale(0);
      this.tweens.add({ targets: unlock, scale: 1, duration: 360, delay: 300, ease: 'Back.easeOut' });
    }

    let left = AUTO_RETURN_SECONDS;
    const btns = this.addButtons([{ label: `الخريطة (${left})`, color: 'orange', onClick: () => app.go('Map') }]);
    this.time.addEvent({
      delay: 1000,
      repeat: AUTO_RETURN_SECONDS,
      callback: () => {
        left--;
        btns[0].label?.setText(`الخريطة (${left})`);
        if (left <= 0) app.go('Map');
      },
    });
  }

  clearButtons() {
    (this.buttons ?? []).forEach((b) => b.destroy());
    this.buttons = [];
  }

  addButtons(list) {
    this.clearButtons();
    const U = this.U;
    const bh = 58 * U;
    const bw = list.length === 1 ? this.pw * 0.6 : this.pw * 0.4;
    this.buttons = list.map((b, i) => {
      const x = list.length === 1 ? 0 : i === 0 ? this.pw * 0.22 : -this.pw * 0.22;
      const btn = makeButton(this, { x, y: this.ph / 2 - bh * 0.85, w: bw, h: bh, label: b.label, color: b.color, onClick: b.onClick });
      this.panel.add(btn);
      return btn;
    });
    return this.buttons;
  }
}
