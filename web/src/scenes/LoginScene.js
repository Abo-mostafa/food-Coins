import Phaser from 'phaser';
import { createFoodBackground } from './background.js';
import { mountLogin } from '../ui/components/loginView.js';
import { app } from '../app.js';

export class LoginScene extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
    createFoodBackground(this, { count: 16, alpha: 0.35 });
    this.view = mountLogin({ onPractice: () => app.startPractice() });
    if (app.redirectError) {
      this.view.showMessage(app.redirectError);
      app.redirectError = null;
    }
    this.events.once('shutdown', () => this.view?.unmount());
  }
}
