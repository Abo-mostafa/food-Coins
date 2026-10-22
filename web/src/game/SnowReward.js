// The hidden meal frozen under layers of snow/ice. Layers crack and break off as the
// player collects the required food; the final layer reveals the meal with a celebration.
// Purely visual: rewards are granted by the server after the level result is verified.
import Phaser from 'phaser';
import { AudioManager } from './AudioManager.js';

export class SnowReward {
  constructor(scene, effects, { mealKey, snowLayers, unit }) {
    this.scene = scene;
    this.effects = effects;
    this.unit = unit;
    this.total = snowLayers;
    this.remaining = snowLayers;
    this.revealed = false;
    this.container = scene.add.container(0, 0).setDepth(50);
    this.rays = scene.add.graphics();
    this.rays.setVisible(false);
    this.meal = scene.add.image(0, 0, `meal_${mealKey}`);
    this.layers = [];
    for (let i = 0; i < snowLayers; i++) {
      const layer = scene.add.image(0, 0, 'snow_layer');
      layer.setAlpha(0.55 + (0.45 * (i + 1)) / snowLayers);
      layer.setAngle((i % 2 ? 1 : -1) * (i * 2));
      this.layers.push(layer);
    }
    this.cracks = scene.add.graphics();
    this.container.add([this.rays, this.meal, ...this.layers, this.cracks]);
    this.size = 100;
    this.crackSeed = 1;
  }

  layout(x, y, size) {
    this.size = size;
    this.container.setPosition(x, y);
    this.meal.setDisplaySize(size * 0.92, size * 0.92);
    this.meal.setTint(this.revealed ? 0xffffff : 0xc9e4f5);
    this.layers.forEach((l, i) => {
      const s = size * (1 + i * 0.03);
      l.setDisplaySize(s, s);
    });
    this._drawRays();
  }

  /** progress 0..1 of the hidden-meal requirement. */
  setProgress(progress, animate = true) {
    const targetRemaining = progress >= 1 ? 0 : Math.ceil(this.total * (1 - progress));
    const within = progress >= 1 ? 0 : (this.total * progress) % 1;
    while (this.remaining > targetRemaining) {
      this.remaining--;
      const layer = this.layers[this.remaining];
      this._breakLayer(layer, animate);
    }
    this._drawCracks(within);
    if (progress >= 1 && !this.revealed) this._reveal(animate);
  }

  _breakLayer(layer, animate) {
    if (!animate) {
      layer.setVisible(false);
      return;
    }
    AudioManager.play('shatter');
    const wx = this.container.x;
    const wy = this.container.y;
    this.effects.iceBurst(wx, wy, 18);
    this.scene.tweens.add({
      targets: layer,
      scale: layer.scale * 1.25,
      alpha: 0,
      angle: layer.angle + Phaser.Math.Between(-25, 25),
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => layer.setVisible(false),
    });
    this.scene.tweens.add({ targets: this.container, scale: { from: 1.08, to: 1 }, duration: 260, ease: 'Back.easeOut' });
  }

  _drawCracks(amount) {
    const g = this.cracks;
    g.clear();
    if (this.remaining === 0 || amount <= 0.05) return;
    const s = this.size / 2;
    const rng = new Phaser.Math.RandomDataGenerator([String(this.remaining)]);
    const lines = Math.ceil(amount * 7);
    g.lineStyle(Math.max(2, 3 * this.unit), 0xffffff, 0.95);
    for (let i = 0; i < lines; i++) {
      let x = rng.realInRange(-0.2, 0.2) * s;
      let y = rng.realInRange(-0.2, 0.2) * s;
      const ang = rng.angle() * (Math.PI / 180);
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += Math.cos(ang + rng.realInRange(-0.6, 0.6)) * s * 0.22;
        y += Math.sin(ang + rng.realInRange(-0.6, 0.6)) * s * 0.22;
        g.lineTo(Phaser.Math.Clamp(x, -s * 0.9, s * 0.9), Phaser.Math.Clamp(y, -s * 0.9, s * 0.9));
      }
      g.strokePath();
    }
  }

  /** Small feedback when food that thaws the ice is collected. */
  chip() {
    if (this.remaining === 0) return;
    AudioManager.play('ice');
    this.effects.flakes.explode(4, this.container.x, this.container.y - this.size * 0.3);
    this.scene.tweens.add({ targets: this.container, angle: { from: -3, to: 0 }, duration: 160, ease: 'Sine.easeOut' });
  }

  _drawRays() {
    const g = this.rays;
    g.clear();
    const r = this.size * 0.9;
    g.fillStyle(0xfff3b0, 0.55);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.slice(0, 0, r, a, a + Math.PI / 18, false);
      g.fillPath();
    }
  }

  _reveal(animate) {
    this.revealed = true;
    this.cracks.clear();
    this.meal.clearTint();
    this.rays.setVisible(true);
    if (!animate) return;
    AudioManager.play('reveal');
    this.scene.tweens.add({ targets: this.rays, angle: 360, duration: 8000, repeat: -1 });
    this.scene.tweens.add({ targets: this.meal, scale: this.meal.scale * 1.18, duration: 300, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    this.effects.sparkle(this.container.x, this.container.y, 26);
  }
}
