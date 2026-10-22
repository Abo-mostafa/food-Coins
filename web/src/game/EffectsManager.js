// Reusable visual effects for Phaser scenes: particle bursts, floating text,
// screen shake, rocket streaks, bomb shockwaves, confetti and coin flights.
import Phaser from 'phaser';

export const FOOD_TINTS = {
  broast: [0xffc857, 0xf0a030, 0xffffff],
  shawarma: [0xfcdca0, 0x7ccb4d, 0xffffff],
  pizza: [0xffd24d, 0xf0624d, 0xffffff],
  burger: [0xffc56b, 0x6cc04a, 0xffffff],
  club: [0xfff1cc, 0xf48fb1, 0xffffff],
  fries: [0xffe48a, 0xf44336, 0xffffff],
};

const CONFETTI_COLORS = [0xff5252, 0xffc107, 0x4caf50, 0x29b6f6, 0xab47bc, 0xff9800];

export class EffectsManager {
  constructor(scene, unit = 1) {
    this.scene = scene;
    this.unit = unit;
    this._ensureTextures();
    this.sparkles = scene.add.particles(0, 0, 'sparkle', {
      speed: { min: 80 * unit, max: 320 * unit },
      lifespan: { min: 350, max: 750 },
      scale: { start: 0.45 * unit, end: 0 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.dust = scene.add.particles(0, 0, 'fc_dot', {
      speed: { min: 60 * unit, max: 260 * unit },
      lifespan: { min: 300, max: 650 },
      scale: { start: 1.1 * unit, end: 0 },
      gravityY: 500 * unit,
      emitting: false,
    });
    this.shards = scene.add.particles(0, 0, 'ice_shard', {
      speed: { min: 150 * unit, max: 480 * unit },
      lifespan: { min: 500, max: 1000 },
      scale: { start: 0.55 * unit, end: 0.1 * unit },
      rotate: { min: 0, max: 360 },
      gravityY: 900 * unit,
      emitting: false,
    });
    this.flakes = scene.add.particles(0, 0, 'snowflake', {
      speed: { min: 40 * unit, max: 160 * unit },
      lifespan: { min: 600, max: 1200 },
      scale: { start: 0.5 * unit, end: 0 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.confetti = scene.add.particles(0, 0, 'fc_confetti', {
      speedX: { min: -350 * unit, max: 350 * unit },
      speedY: { min: -900 * unit, max: -350 * unit },
      gravityY: 900 * unit,
      lifespan: 2600,
      scaleX: { min: 0.6 * unit, max: 1.2 * unit },
      scaleY: { min: 0.6 * unit, max: 1.2 * unit },
      rotate: { start: 0, end: 720 },
      tint: CONFETTI_COLORS,
      emitting: false,
    });
    for (const e of [this.sparkles, this.dust, this.shards, this.flakes, this.confetti]) e.setDepth(900);
    this.confetti.setDepth(2000);
  }

  _ensureTextures() {
    const s = this.scene;
    if (!s.textures.exists('fc_dot')) {
      const g = s.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
      g.generateTexture('fc_dot', 16, 16);
      g.destroy();
    }
    if (!s.textures.exists('fc_confetti')) {
      const g = s.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, 14, 22, 3);
      g.generateTexture('fc_confetti', 14, 22);
      g.destroy();
    }
  }

  burst(x, y, type, amount = 10) {
    const tints = FOOD_TINTS[type] ?? [0xffffff];
    this.dust.setParticleTint(Phaser.Utils.Array.GetRandom(tints));
    this.dust.explode(amount, x, y);
    this.sparkles.explode(Math.ceil(amount / 2), x, y);
  }

  sparkle(x, y, amount = 8) {
    this.sparkles.explode(amount, x, y);
  }

  iceBurst(x, y, amount = 14) {
    this.shards.explode(amount, x, y);
    this.flakes.explode(Math.ceil(amount / 2), x, y);
  }

  confettiRain(width, count = 120) {
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(i * 160, () => this.confetti.explode(count / 6, (width / 7) * (i + 1), this.scene.scale.height * 0.55));
    }
  }

  shake(intensity = 0.008, duration = 220) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color = 0xffffff, duration = 180) {
    this.scene.cameras.main.flash(duration, (color >> 16) & 255, (color >> 8) & 255, color & 255);
  }

  floatText(x, y, text, { size = 30, color = '#ffffff', stroke = '#c2410c', rise = 70, duration = 900, depth = 1500 } = {}) {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Reem Kufi, Cairo, sans-serif',
        fontSize: `${Math.round(size * this.unit)}px`,
        fontStyle: '700',
        color,
        stroke,
        strokeThickness: Math.round(6 * this.unit),
        rtl: true,
      })
      .setOrigin(0.5)
      .setDepth(depth)
      .setScale(0.3);
    t.setShadow(0, 3 * this.unit, 'rgba(0,0,0,0.25)', 4 * this.unit);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: y - rise * this.unit,
      alpha: 0,
      delay: duration * 0.45,
      duration: duration * 0.55,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
    return t;
  }

  bigText(x, y, text, { size = 54, color = '#FFF7D6', stroke = '#E8590C' } = {}) {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: 'Reem Kufi, Cairo, sans-serif',
        fontSize: `${Math.round(size * this.unit)}px`,
        fontStyle: '700',
        color,
        stroke,
        strokeThickness: Math.round(10 * this.unit),
        rtl: true,
      })
      .setOrigin(0.5)
      .setDepth(1600)
      .setScale(0)
      .setAngle(-8);
    t.setShadow(0, 5 * this.unit, 'rgba(120,40,0,0.35)', 6 * this.unit);
    this.scene.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1.15, angle: 3, duration: 260, ease: 'Back.easeOut' },
        { scale: 1, angle: 0, duration: 140 },
        { scale: 1.05, duration: 400, yoyo: true },
        { alpha: 0, y: y - 60 * this.unit, scale: 1.3, duration: 260, ease: 'Quad.easeIn' },
      ],
      onComplete: () => t.destroy(),
    });
    return t;
  }

  rocketStreak(y, x0, x1, height) {
    const s = this.scene;
    const beam = s.add.rectangle((x0 + x1) / 2, y, x1 - x0, height * 0.32, 0xfff3a0, 1).setDepth(950).setBlendMode('ADD');
    beam.scaleX = 0;
    s.tweens.add({ targets: beam, scaleX: 1, duration: 140, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: beam, alpha: 0, scaleY: 2.2, delay: 160, duration: 260, onComplete: () => beam.destroy() });
    for (const dir of [-1, 1]) {
      const head = s.add.image((x0 + x1) / 2, y, 'glow').setDepth(960).setScale(this.unit * 0.9).setBlendMode('ADD').setTint(0xffb300);
      s.tweens.add({
        targets: head,
        x: dir < 0 ? x0 - 40 * this.unit : x1 + 40 * this.unit,
        duration: 260,
        ease: 'Quad.easeIn',
        onUpdate: () => this.sparkles.explode(1, head.x, head.y),
        onComplete: () => head.destroy(),
      });
    }
  }

  shockwave(x, y, radius) {
    const s = this.scene;
    const ring = s.add.image(x, y, 'ring').setDepth(960).setTint(0xffe082).setBlendMode('ADD');
    ring.setScale(0.1);
    s.tweens.add({
      targets: ring,
      scale: (radius * 2) / ring.width,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    const glow = s.add.image(x, y, 'glow').setDepth(955).setTint(0xff7043).setBlendMode('ADD').setScale(0.2);
    s.tweens.add({ targets: glow, scale: (radius * 2.2) / glow.width, alpha: 0, duration: 380, onComplete: () => glow.destroy() });
    this.sparkles.explode(24, x, y);
  }

  flyTo(texture, fromX, fromY, toX, toY, { size = 48, delay = 0, onArrive } = {}) {
    const s = this.scene;
    const img = s.add.image(fromX, fromY, texture).setDepth(1800);
    img.setDisplaySize(size, size);
    const ctrlX = (fromX + toX) / 2 + Phaser.Math.Between(-80, 80) * this.unit;
    const ctrlY = Math.min(fromY, toY) - 120 * this.unit;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(fromX, fromY),
      new Phaser.Math.Vector2(ctrlX, ctrlY),
      new Phaser.Math.Vector2(toX, toY),
    );
    const p = { t: 0 };
    s.tweens.add({
      targets: p,
      t: 1,
      delay,
      duration: 560,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const v = curve.getPoint(p.t);
        img.setPosition(v.x, v.y);
        img.setScale(img.scaleX * 0.995);
      },
      onComplete: () => {
        img.destroy();
        onArrive?.();
      },
    });
  }
}
