// Small Phaser UI helpers (buttons, panels) styled like the DOM UI.
import { AudioManager } from '../../game/AudioManager.js';

export const FONT = 'Cairo, sans-serif';
export const DISPLAY_FONT = '"Reem Kufi", Cairo, sans-serif';

export function text(scene, x, y, str, { size = 20, color = '#6b3300', weight = '700', font = FONT, stroke, strokeThickness = 0, align = 'center', wrap } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: font,
    fontSize: `${Math.round(size)}px`,
    fontStyle: weight,
    color,
    stroke,
    strokeThickness,
    align,
    rtl: /[\u0600-\u06FF]/.test(str),
    wordWrap: wrap ? { width: wrap } : undefined,
  });
  t.setOrigin(0.5);
  return t;
}

export function drawPanel(g, x, y, w, h, { radius = 24, fill = 0xfffaf0, border = 0xffd9a8, borderWidth = 4, shadow = 0xc56a1a, shadowAlpha = 0.25, shadowOffset = 8 } = {}) {
  g.fillStyle(shadow, shadowAlpha).fillRoundedRect(x, y + shadowOffset, w, h, radius);
  g.fillStyle(fill, 1).fillRoundedRect(x, y, w, h, radius);
  if (borderWidth) g.lineStyle(borderWidth, border, 1).strokeRoundedRect(x, y, w, h, radius);
}

export function makeButton(scene, { x = 0, y = 0, w, h, label, color = 'orange', size, icon, onClick }) {
  const palette = {
    orange: [0xff8a1f, 0xc24a00, '#ffffff'],
    green: [0x4caf50, 0x2e7d32, '#ffffff'],
    cream: [0xfff3df, 0xe6c79a, '#6b3300'],
    red: [0xef5350, 0xb71c1c, '#ffffff'],
  }[color];
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const depth = Math.max(4, h * 0.09);
  const draw = (pressed) => {
    g.clear();
    g.fillStyle(palette[1], 1).fillRoundedRect(-w / 2, -h / 2 + depth, w, h, h * 0.32);
    g.fillStyle(palette[0], 1).fillRoundedRect(-w / 2, -h / 2 + (pressed ? depth * 0.7 : 0), w, h, h * 0.32);
    g.fillStyle(0xffffff, 0.25).fillRoundedRect(-w / 2 + h * 0.15, -h / 2 + (pressed ? depth * 0.7 : 0) + h * 0.08, w - h * 0.3, h * 0.32, h * 0.16);
  };
  draw(false);
  c.add(g);
  if (icon) {
    const img = scene.add.image(0, 0, icon).setDisplaySize(h * 0.55, h * 0.55);
    c.add(img);
  }
  if (label) {
    const t = text(scene, 0, -2, label, { size: size ?? h * 0.4, color: palette[2], weight: '700' });
    c.add(t);
    c.label = t;
  }
  c.setSize(w, h + depth);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => {
    draw(true);
    c.list.slice(1).forEach((o) => (o.y += depth * 0.7));
  });
  const release = (fire) => {
    if (!c.pressed) return;
    c.pressed = false;
    draw(false);
    c.list.slice(1).forEach((o) => (o.y -= depth * 0.7));
    if (fire) {
      AudioManager.play('click');
      onClick?.();
    }
  };
  c.on('pointerdown', () => (c.pressed = true));
  c.on('pointerup', () => release(true));
  c.on('pointerout', () => release(false));
  return c;
}

export function makeRoundButton(scene, { x = 0, y = 0, r, icon, onClick, fill = 0xff8a1f, shade = 0xc24a00 }) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(shade, 1).fillCircle(0, r * 0.12, r);
  g.fillStyle(fill, 1).fillCircle(0, 0, r);
  g.fillStyle(0xffffff, 0.25).fillEllipse(0, -r * 0.45, r * 1.2, r * 0.6);
  const img = scene.add.image(0, 0, icon).setDisplaySize(r * 1.1, r * 1.1);
  c.add([g, img]);
  c.icon = img;
  c.setSize(r * 2, r * 2);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => scene.tweens.add({ targets: c, scale: 0.88, duration: 80, yoyo: true }));
  c.on('pointerup', () => {
    AudioManager.play('click');
    onClick?.();
  });
  return c;
}
