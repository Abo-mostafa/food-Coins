import Phaser from 'phaser';
import { createFoodBackground } from './background.js';
import { mountMap } from '../ui/components/mapView.js';
import { app } from '../app.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  create() {
    createFoodBackground(this, { count: 10, alpha: 0.18 });
    this.view = mountMap({
      onPlay: (levelId) => app.launchLevel(levelId),
      onSignOut: () => app.signOut(),
      onRetryPending: () => app.flushPending(true),
    });
    app.flushPending(false);
    this.events.once('shutdown', () => this.view?.unmount());
  }
}
