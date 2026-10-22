import Phaser from 'phaser';
import { FOOD_KEYS } from '../game/LevelConfig.js';

/** Warm gradient background with slowly floating, rotating food. */
export function createFoodBackground(scene, { count = 14, alpha = 0.32 } = {}) {
  const bg = scene.add.image(0, 0, 'bg_game').setOrigin(0.5).setDepth(-10);
  const foods = [];
  for (let i = 0; i < count; i++) {
    const img = scene.add.image(0, 0, `food_${FOOD_KEYS[i % FOOD_KEYS.length]}`).setDepth(-9).setAlpha(alpha);
    img.speed = Phaser.Math.FloatBetween(0.25, 0.7);
    img.spin = Phaser.Math.FloatBetween(-0.3, 0.3);
    img.phase = Math.random() * Math.PI * 2;
    foods.push(img);
  }
  const layout = () => {
    const { width, height } = scene.scale;
    bg.setPosition(width / 2, height / 2);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    const size = Math.min(width, height) * 0.16;
    foods.forEach((f) => {
      f.setDisplaySize(size * Phaser.Math.FloatBetween(0.7, 1.2), size * 1);
      f.scaleY = f.scaleX;
      f.setPosition(Math.random() * width, Math.random() * height);
    });
  };
  layout();
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', () => scene.scale.off('resize', layout));
  scene.events.on('update', (time, delta) => {
    const { width, height } = scene.scale;
    for (const f of foods) {
      f.y -= f.speed * delta * 0.06 * (height / 900);
      f.x += Math.sin(time / 1500 + f.phase) * 0.3;
      f.angle += f.spin;
      if (f.y < -f.displayHeight) {
        f.y = height + f.displayHeight;
        f.x = Math.random() * width;
      }
    }
  });
  return { bg, foods };
}
