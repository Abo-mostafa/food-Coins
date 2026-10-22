import Phaser from 'phaser';
import { PHASER_SVGS, BG_GAME } from '../assets.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const bar = document.querySelector('#boot-splash .splash-bar span');
    this.load.on('progress', (v) => bar && (bar.style.width = `${Math.round(v * 100)}%`));
    for (const [key, url, size] of PHASER_SVGS) this.load.svg(key, url, { width: size, height: size });
    this.load.svg('bg_game', BG_GAME, { width: 720, height: 1280 });
  }

  async create() {
    try {
      await Promise.all([
        document.fonts.load('700 20px Cairo'),
        document.fonts.load('400 20px Cairo'),
        document.fonts.load('700 20px "Reem Kufi"'),
      ]);
    } catch {
      /* fall back to system fonts */
    }
    const splash = document.getElementById('boot-splash');
    splash?.classList.add('hide');
    setTimeout(() => splash?.remove(), 500);
    this.game.events.emit('fc-ready');
  }
}
