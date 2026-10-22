import Phaser from 'phaser';
import './ui/styles.css';
import { BootScene } from './scenes/BootScene.js';
import { LoginScene } from './scenes/LoginScene.js';
import { MapScene } from './scenes/MapScene.js';
import { GameScene } from './scenes/GameScene.js';
import { ResultScene } from './scenes/ResultScene.js';
import { app } from './app.js';

// Render at device resolution for crisp art on high-DPI phones, displayed at CSS size.
const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
const size = () => [Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr)];
const [w, h] = size();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#FFF1DC',
  width: w,
  height: h,
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  scene: [BootScene, LoginScene, MapScene, GameScene, ResultScene],
});
game.registry.set('dpr', dpr);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const [nw, nh] = size();
    game.scale.resize(nw, nh);
    game.scale.setZoom(1 / dpr);
  }, 80);
});

game.events.once('fc-ready', () => app.init(game));

if (import.meta.env.DEV) window.__fc = { game, app };
