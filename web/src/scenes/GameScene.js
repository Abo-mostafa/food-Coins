import Phaser from 'phaser';
import { MatchEngine } from '../game/MatchEngine.js';
import { getLevel, FOOD_NAMES, MEALS, mealProgress, computeStars } from '../game/LevelConfig.js';
import { SPECIAL } from '../game/SpecialPieces.js';
import { EffectsManager } from '../game/EffectsManager.js';
import { SnowReward } from '../game/SnowReward.js';
import { AudioManager } from '../game/AudioManager.js';
import { text, drawPanel, makeRoundButton, makeButton, DISPLAY_FONT } from '../ui/components/phaserUi.js';
import { app } from '../app.js';

const COMBO_WORDS = ['', '', 'رائع!', 'لذيذ!', 'مذهل!', 'شهي جدًا!', 'خرافي!'];
const ROWS = 8;
const COLS = 5;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelId = data.levelId;
    this.sessionId = data.sessionId ?? null;
    this.seed = data.seed;
    this.practice = Boolean(data.practice);
  }

  create() {
    this.level = getLevel(this.levelId);
    this.engine = new MatchEngine({ level: this.level, seed: this.seed });
    this.dpr = this.game.registry.get('dpr') || 1;
    this.U = this.computeUnit();
    this.busy = true;
    this.selected = null;
    this.down = null;
    this.sprites = new Map();
    this.displayCollected = { ...this.engine.collected };
    this.displayScore = 0;
    this.lastActivity = this.time.now;
    this.needsSnap = false;

    this.bg = this.add.image(0, 0, 'bg_game').setDepth(-10);
    this.panelGfx = this.add.graphics().setDepth(5);
    this.boardGfx = this.add.graphics().setDepth(10);
    this.pieceLayer = this.add.container(0, 0).setDepth(20);
    this.maskGfx = this.make.graphics({ add: false });
    this.pieceLayer.setMask(this.maskGfx.createGeometryMask());
    this.selectRing = this.add.image(0, 0, 'glow').setDepth(15).setVisible(false).setTint(0xfff3a0);
    this.tweens.add({ targets: this.selectRing, alpha: { from: 1, to: 0.5 }, duration: 450, yoyo: true, repeat: -1 });

    this.effects = new EffectsManager(this, this.U);
    this.buildHud();
    this.snow = new SnowReward(this, this.effects, { mealKey: this.level.meal.key, snowLayers: this.level.meal.snowLayers, unit: this.U });
    this.layout();
    this.createPieces();
    this.bindInput();
    this.intro();

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.idleTick() });
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.confirm?.destroy();
    });
  }

  computeUnit() {
    const cssW = this.scale.width / this.dpr;
    const cssH = this.scale.height / this.dpr;
    return this.dpr * Phaser.Math.Clamp(Math.min(cssW / 400, cssH / 760), 0.7, 1.5);
  }

  // ---------------- HUD ----------------

  buildHud() {
    const U = this.U;
    this.backBtn = makeRoundButton(this, { r: 24 * U, icon: 'icon_back', onClick: () => this.confirmExit() }).setDepth(30);
    this.soundBtn = makeRoundButton(this, {
      r: 24 * U,
      icon: AudioManager.muted ? 'icon_sound_off' : 'icon_sound_on',
      onClick: () => {
        AudioManager.unlock();
        const on = AudioManager.toggleAll();
        if (on) AudioManager.startMusic();
        this.soundBtn.icon.setTexture(on ? 'icon_sound_on' : 'icon_sound_off');
      },
    }).setDepth(30);
    this.title = text(this, 0, 0, `المستوى ${this.levelId}`, { size: 26 * U, font: DISPLAY_FONT, color: '#ffffff', stroke: '#c2410c', strokeThickness: 7 * U }).setDepth(30);
    if (this.practice) this.practiceTag = text(this, 0, 0, 'وضع تجريبي', { size: 13 * U, color: '#8a5300' }).setDepth(30);

    this.movesGfx = this.add.graphics().setDepth(30);
    this.movesText = text(this, 0, 0, String(this.engine.movesLeft), { size: 34 * U, font: DISPLAY_FONT, color: '#ffffff', stroke: '#a83c00', strokeThickness: 5 * U }).setDepth(31);
    this.movesLabel = text(this, 0, 0, 'حركات', { size: 14 * U, color: '#8a4a16' }).setDepth(31);

    this.goalLabel = text(this, 0, 0, 'الهدف', { size: 14 * U, color: '#8a4a16' }).setDepth(31);
    this.goalItems = this.level.goals.map((g) => ({
      goal: g,
      icon: this.add.image(0, 0, `food_${g.type}`).setDepth(31),
      count: text(this, 0, 0, '', { size: 17 * U, color: '#6b3300' }).setDepth(31),
      check: this.add.image(0, 0, 'ui_check').setDepth(32).setVisible(false),
    }));

    this.mealLabel = text(this, 0, 0, MEALS[this.level.meal.key].name, { size: 13 * U, color: '#4a7da3' }).setDepth(60);

    this.rewardIcon = this.add.image(0, 0, 'coin').setDepth(31);
    this.rewardText = text(this, 0, 0, `+${this.level.baseCoins}`, { size: 18 * U, color: '#c77700', font: DISPLAY_FONT }).setDepth(31);
    this.scoreGfx = this.add.graphics().setDepth(30);
    this.scoreText = text(this, 0, 0, '0', { size: 15 * U, color: '#ffffff', stroke: '#8a4a16', strokeThickness: 4 * U }).setDepth(32);
    this.starMarks = [0, 1].map(() => this.add.image(0, 0, 'star_empty').setDepth(32));
    this.updateGoals(false);
  }

  layout() {
    const U = (this.U = this.computeUnit());
    const W = this.scale.width;
    const H = this.scale.height;
    const pad = 10 * U;
    this.bg.setPosition(W / 2, H / 2).setScale(Math.max(W / this.bg.width, H / this.bg.height));
    const portrait = W / H < 0.9;
    let header, panel, moves, goals, meal, score, board;

    if (portrait) {
      header = { x: pad, y: pad, w: W - 2 * pad, h: 54 * U };
      panel = { x: pad, y: header.y + header.h + 2 * U, w: W - 2 * pad, h: Math.min(126 * U, H * 0.19) };
      moves = { x: panel.x + panel.w - 92 * U, y: panel.y, w: 92 * U, h: panel.h };
      meal = { x: panel.x, y: panel.y, w: panel.h, h: panel.h };
      goals = { x: meal.x + meal.w, y: panel.y, w: moves.x - meal.x - meal.w, h: panel.h };
      score = { x: pad + 8 * U, y: panel.y + panel.h + 12 * U, w: W - 2 * pad - 16 * U, h: 30 * U };
      const top = score.y + score.h + 10 * U;
      board = { x: pad, y: top, w: W - 2 * pad, h: H - top - pad };
    } else {
      const sw = Phaser.Math.Clamp(W * 0.36, 260 * U, 400 * U);
      const sx = W - pad - sw;
      header = { x: sx, y: pad, w: sw, h: 54 * U };
      panel = { x: sx, y: header.y + header.h + 6 * U, w: sw, h: H - header.h - 3 * pad - 6 * U };
      moves = { x: sx + sw / 2, y: panel.y + 6 * U, w: sw / 2, h: 100 * U };
      goals = { x: sx, y: moves.y + moves.h, w: sw, h: 96 * U };
      score = { x: sx + 12 * U, y: panel.y + panel.h - 44 * U, w: sw - 24 * U, h: 30 * U };
      const mealTop = goals.y + goals.h;
      const ms = Math.min(sw - 20 * U, score.y - mealTop - 10 * U);
      meal = { x: sx + (sw - ms) / 2, y: mealTop, w: ms, h: ms };
      board = { x: pad, y: pad, w: sx - 2 * pad, h: H - 2 * pad };
    }

    // header
    this.backBtn.setPosition(header.x + header.w - 26 * U, header.y + header.h / 2);
    this.soundBtn.setPosition(header.x + 26 * U, header.y + header.h / 2);
    this.title.setPosition(header.x + header.w / 2, header.y + header.h / 2 - (this.practice ? 6 * U : 0)).setFontSize(Math.round(26 * U));
    this.practiceTag?.setPosition(header.x + header.w / 2, header.y + header.h - 4 * U);

    // panel
    const g = this.panelGfx.clear();
    drawPanel(g, panel.x, panel.y, panel.w, panel.h, { radius: 22 * U, borderWidth: 4 * U, shadowOffset: 6 * U, fill: 0xfffaf0 });
    g.fillStyle(0xe3f4ff, 1).fillRoundedRect(meal.x + 6 * U, meal.y + 6 * U, meal.w - 12 * U, meal.h - 12 * U, 18 * U);

    // moves badge
    const mr = Math.min(moves.w, moves.h) * 0.33;
    const mcx = moves.x + moves.w / 2;
    const mcy = moves.y + moves.h / 2 - 8 * U;
    this.movesGfx.clear();
    this.movesGfx.fillStyle(0xc24a00, 1).fillCircle(mcx, mcy + 4 * U, mr);
    this.movesGfx.fillStyle(0xff8a1f, 1).fillCircle(mcx, mcy, mr);
    this.movesGfx.fillStyle(0xffffff, 0.3).fillEllipse(mcx, mcy - mr * 0.45, mr * 1.2, mr * 0.55);
    this.movesText.setPosition(mcx, mcy).setFontSize(Math.round(mr * 0.95));
    this.movesLabel.setPosition(mcx, mcy + mr + 12 * U).setFontSize(Math.round(14 * U));
    this.movesCenter = { x: mcx, y: mcy };

    // goals
    this.goalLabel.setPosition(goals.x + goals.w / 2, goals.y + 14 * U).setFontSize(Math.round(14 * U));
    const n = this.goalItems.length;
    const slot = goals.w / n;
    const iconSize = Math.min(goals.h * 0.46, slot * 0.7);
    this.goalItems.forEach((item, i) => {
      const cx = goals.x + goals.w - slot * (i + 0.5);
      const cy = goals.y + goals.h * 0.5;
      item.icon.setPosition(cx, cy).setDisplaySize(iconSize, iconSize);
      item.baseScale = item.icon.scale;
      item.count.setPosition(cx, cy + iconSize * 0.5 + 12 * U).setFontSize(Math.round(16 * U));
      item.check.setPosition(cx + iconSize * 0.35, cy + iconSize * 0.3).setDisplaySize(iconSize * 0.45, iconSize * 0.45);
    });

    // meal under snow
    this.snow.layout(meal.x + meal.w / 2, meal.y + meal.h / 2 - 6 * U, meal.w * 0.72);
    this.mealLabel.setPosition(meal.x + meal.w / 2, meal.y + meal.h - 14 * U).setFontSize(Math.round(13 * U));

    // reward + score bar
    this.rewardIcon.setPosition(score.x + score.w - 14 * U, score.y + score.h / 2).setDisplaySize(28 * U, 28 * U);
    this.rewardText.setPosition(score.x + score.w - 46 * U, score.y + score.h / 2).setFontSize(Math.round(18 * U));
    this.scoreRect = { x: score.x + 8 * U, y: score.y + score.h / 2 - 9 * U, w: score.w - 86 * U, h: 18 * U };
    this.drawScore();

    // board
    const cell = Math.min(board.w / COLS, board.h / ROWS);
    this.cell = cell;
    this.boardW = cell * COLS;
    this.boardH = cell * ROWS;
    this.bx = board.x + (board.w - this.boardW) / 2;
    this.by = board.y + (board.h - this.boardH) / 2;
    const bg = this.boardGfx.clear();
    const m = 8 * U;
    bg.fillStyle(0x8a3f0c, 0.25).fillRoundedRect(this.bx - m, this.by - m + 8 * U, this.boardW + 2 * m, this.boardH + 2 * m, 24 * U);
    bg.fillStyle(0xffffff, 0.75).fillRoundedRect(this.bx - m, this.by - m, this.boardW + 2 * m, this.boardH + 2 * m, 24 * U);
    bg.lineStyle(4 * U, 0xffc58a, 1).strokeRoundedRect(this.bx - m, this.by - m, this.boardW + 2 * m, this.boardH + 2 * m, 24 * U);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bg.fillStyle((r + c) % 2 ? 0xffe6c4 : 0xfff4e2, 1);
        bg.fillRoundedRect(this.bx + c * cell + 2 * U, this.by + r * cell + 2 * U, cell - 4 * U, cell - 4 * U, 14 * U);
      }
    }
    this.maskGfx.clear().fillStyle(0xffffff).fillRect(this.bx - m, this.by - 2, this.boardW + 2 * m, this.boardH + m + 2);
  }

  drawScore() {
    const U = this.U;
    const { x, y, w, h } = this.scoreRect;
    const max = this.level.starScores[1] * 1.12;
    const g = this.scoreGfx.clear();
    g.fillStyle(0x8a4a16, 0.3).fillRoundedRect(x, y + 2 * U, w, h, h / 2);
    g.fillStyle(0xfff3df, 1).fillRoundedRect(x, y, w, h, h / 2);
    const frac = Phaser.Math.Clamp(this.displayScore / max, 0, 1);
    if (frac > 0.02) {
      g.fillStyle(0xff8a1f, 1).fillRoundedRect(x + w * (1 - frac), y, w * frac, h, h / 2);
      g.fillStyle(0xffffff, 0.3).fillRoundedRect(x + w * (1 - frac) + 4 * U, y + 3 * U, Math.max(0, w * frac - 8 * U), h * 0.3, h * 0.15);
    }
    // RTL: bar fills from right to left
    this.starMarks.forEach((s, i) => {
      const t = this.level.starScores[i] / max;
      s.setPosition(x + w * (1 - t), y + h / 2).setDisplaySize(28 * U, 28 * U);
      const lit = this.displayScore >= this.level.starScores[i];
      if (lit && s.texture.key !== 'star') {
        s.setTexture('star');
        this.tweens.add({ targets: s, scale: { from: s.scale * 1.8, to: s.scale }, duration: 300, ease: 'Back.easeOut' });
        AudioManager.play('star', { index: i + 1 });
      }
    });
    this.scoreText.setPosition(x + w - 30 * U, y + h / 2).setText(String(this.displayScore)).setFontSize(Math.round(14 * U));
  }

  updateGoals(animate = true) {
    for (const item of this.goalItems) {
      const have = Math.min(this.displayCollected[item.goal.type] ?? 0, item.goal.count);
      item.count.setText(`${have}/${item.goal.count}`);
      const done = have >= item.goal.count;
      if (done && !item.check.visible) {
        item.check.setVisible(true);
        if (animate) {
          this.tweens.add({ targets: item.check, scale: { from: item.check.scale * 2, to: item.check.scale }, duration: 300, ease: 'Back.easeOut' });
          this.effects.sparkle(item.icon.x, item.icon.y, 12);
          AudioManager.play('special');
        }
      }
      item.count.setColor(done ? '#2e7d32' : '#6b3300');
    }
  }

  bumpGoal(type) {
    const item = this.goalItems.find((i) => i.goal.type === type);
    if (!item) return;
    this.tweens.killTweensOf(item.icon);
    item.icon.setScale(item.baseScale);
    this.tweens.add({ targets: item.icon, scale: item.baseScale * 1.25, duration: 90, yoyo: true });
    AudioManager.play('pop');
  }

  // ---------------- pieces ----------------

  cellX(c) {
    return this.bx + c * this.cell + this.cell / 2;
  }

  cellY(r) {
    return this.by + r * this.cell + this.cell / 2;
  }

  cellAt(x, y) {
    const c = Math.floor((x - this.bx) / this.cell);
    const r = Math.floor((y - this.by) / this.cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  makePiece(piece, r, c) {
    const cont = this.add.container(this.cellX(c), this.cellY(r));
    if (piece.special === SPECIAL.BOMB) {
      cont.glow = this.add.image(0, 0, 'glow').setTint(0xff7043).setBlendMode('ADD');
      cont.add(cont.glow);
      this.tweens.add({ targets: cont.glow, alpha: { from: 0.9, to: 0.4 }, duration: 500, yoyo: true, repeat: -1 });
    } else if (piece.special === SPECIAL.ROCKET) {
      cont.glow = this.add.image(0, 0, 'glow').setTint(0xffeb3b).setBlendMode('ADD');
      cont.add(cont.glow);
      this.tweens.add({ targets: cont.glow, alpha: { from: 0.8, to: 0.35 }, duration: 380, yoyo: true, repeat: -1 });
    }
    cont.img = this.add.image(0, 0, `food_${piece.type}`);
    cont.add(cont.img);
    if (piece.special) {
      cont.overlay = this.add.image(0, 0, piece.special === SPECIAL.BOMB ? 'special_bomb' : 'special_rocket');
      cont.add(cont.overlay);
      if (piece.special === SPECIAL.ROCKET) this.tweens.add({ targets: cont.overlay, scaleX: { from: 1, to: 1.08 }, duration: 300, yoyo: true, repeat: -1 });
    }
    cont.piece = piece;
    this.sizePiece(cont);
    this.pieceLayer.add(cont);
    this.sprites.set(piece.id, cont);
    return cont;
  }

  sizePiece(cont) {
    const s = this.cell * 0.86;
    cont.img.setDisplaySize(s, s);
    cont.overlay?.setDisplaySize(this.cell * 0.98, this.cell * 0.98);
    cont.glow?.setDisplaySize(this.cell * 1.3, this.cell * 1.3);
  }

  createPieces() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.makePiece(this.engine.get(r, c), r, c);
  }

  spriteAt(r, c) {
    const p = this.engine.get(r, c);
    return p ? this.sprites.get(p.id) : null;
  }

  snapPieces() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const s = this.spriteAt(r, c);
        if (!s) continue;
        s.setPosition(this.cellX(c), this.cellY(r)).setScale(1).setAngle(0);
        this.sizePiece(s);
      }
    }
    if (this.selected) this.select(this.selected, false);
  }

  onResize() {
    this.layout();
    if (this.busy) this.needsSnap = true;
    else this.snapPieces();
  }

  intro() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const s = this.spriteAt(r, c);
        const y = s.y;
        s.y = y - this.boardH - this.cell;
        this.tweens.add({ targets: s, y, duration: 520, delay: (ROWS - r) * 45 + c * 25, ease: 'Bounce.easeOut' });
      }
    }
    this.time.delayedCall(250, () => {
      this.effects.bigText(`المستوى ${this.levelId}`, { size: 50 });
      const goalTxt = this.level.goals.map((g) => `${g.count} ${FOOD_NAMES[g.type]}`).join(' + ');
      this.effects.floatText(this.bx + this.boardW / 2, this.by + this.boardH * 0.62, `اجمع ${goalTxt}`, { size: 24, duration: 2200, rise: 30 });
    });
    this.time.delayedCall(1000, () => {
      this.busy = false;
      this.lastActivity = this.time.now;
    });
  }

  // ---------------- input ----------------

  bindInput() {
    this.input.on('pointerdown', (p) => {
      AudioManager.unlock();
      if (this.busy || this.confirm) return;
      const cell = this.cellAt(p.x, p.y);
      if (!cell) return;
      this.down = { ...cell, x: p.x, y: p.y };
    });
    this.input.on('pointermove', (p) => {
      if (!this.down || this.busy || !p.isDown) return;
      const dx = p.x - this.down.x;
      const dy = p.y - this.down.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cell * 0.32) return;
      const from = this.down;
      this.down = null;
      const to = Math.abs(dx) > Math.abs(dy) ? { r: from.r, c: from.c + Math.sign(dx) } : { r: from.r + Math.sign(dy), c: from.c };
      this.clearSelection();
      if (to.r < 0 || to.r >= ROWS || to.c < 0 || to.c >= COLS) return;
      this.attemptSwap(from, to);
    });
    this.input.on('pointerup', () => {
      if (!this.down || this.busy) return;
      const cell = this.down;
      this.down = null;
      const sel = this.selected;
      if (sel && Math.abs(sel.r - cell.r) + Math.abs(sel.c - cell.c) === 1) {
        this.clearSelection();
        this.attemptSwap(sel, cell);
      } else if (sel && sel.r === cell.r && sel.c === cell.c) {
        this.clearSelection();
      } else {
        this.select(cell);
      }
    });
  }

  select(cell, sound = true) {
    this.clearSelection();
    this.selected = cell;
    const s = this.spriteAt(cell.r, cell.c);
    this.selectRing.setVisible(true).setPosition(this.cellX(cell.c), this.cellY(cell.r)).setDisplaySize(this.cell * 1.25, this.cell * 1.25);
    if (s) this.tweens.add({ targets: s, scale: 1.12, duration: 120, ease: 'Back.easeOut' });
    if (sound) AudioManager.play('select');
  }

  clearSelection() {
    if (this.selected) {
      const s = this.spriteAt(this.selected.r, this.selected.c);
      if (s) this.tweens.add({ targets: s, scale: 1, duration: 100 });
    }
    this.selected = null;
    this.selectRing.setVisible(false);
  }

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  async attemptSwap(a, b) {
    if (this.busy || this.engine.status !== 'playing') return;
    this.busy = true;
    this.lastActivity = this.time.now;
    this.stopHint();
    const sa = this.spriteAt(a.r, a.c);
    const sb = this.spriteAt(b.r, b.c);
    AudioManager.play('swap');
    sa.setDepth(2);
    await Promise.all([
      this.tween({ targets: sa, x: this.cellX(b.c), y: this.cellY(b.r), scale: 1, duration: 170, ease: 'Quad.easeInOut' }),
      this.tween({ targets: sb, x: this.cellX(a.c), y: this.cellY(a.r), scale: 1, duration: 170, ease: 'Quad.easeInOut' }),
    ]);
    sa.setDepth(0);
    const res = this.engine.trySwap(a.r, a.c, b.r, b.c);
    if (!res.valid) {
      AudioManager.play('invalid');
      await Promise.all([
        this.tween({ targets: sa, x: this.cellX(a.c), y: this.cellY(a.r), duration: 280, ease: 'Back.easeOut' }),
        this.tween({ targets: sb, x: this.cellX(b.c), y: this.cellY(b.r), duration: 280, ease: 'Back.easeOut' }),
      ]);
      this.tweens.add({ targets: [sa, sb], angle: { from: -10, to: 0 }, duration: 220, ease: 'Elastic.easeOut' });
      this.finishBusy();
      return;
    }
    this.movesText.setText(String(res.movesLeft));
    this.tweens.add({ targets: this.movesText, scale: { from: 1.4, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    if (res.movesLeft <= 3 && res.status === 'playing') this.movesText.setColor('#fff176');

    for (const step of res.steps) await this.playStep(step);
    this.finishMove(res);
  }

  finishBusy() {
    if (this.needsSnap) {
      this.needsSnap = false;
      this.snapPieces();
    }
    this.busy = false;
    this.lastActivity = this.time.now;
  }

  async playStep(step) {
    const U = this.U;
    if (step.shuffle) {
      this.effects.bigText('إعادة ترتيب!', { size: 44 });
      AudioManager.play('swap');
      for (const pos of step.positions) {
        const s = this.sprites.get(pos.id);
        if (!s) continue;
        if (s.piece.type !== pos.type) {
          s.piece.type = pos.type;
          s.img.setTexture(`food_${pos.type}`);
          this.sizePiece(s);
        }
        this.tweens.add({ targets: s, x: this.cellX(pos.c), y: this.cellY(pos.r), duration: 450, ease: 'Cubic.easeInOut' });
      }
      await this.wait(520);
      return;
    }

    // special activations
    for (const act of step.activations) {
      if (act.special === SPECIAL.ROCKET) {
        this.effects.rocketStreak(this.cellY(act.r), this.bx, this.bx + this.boardW, this.cell);
        AudioManager.play('rocket');
        this.effects.shake(0.005, 160);
      } else {
        this.effects.shockwave(this.cellX(act.c), this.cellY(act.r), this.cell * 2.6);
        AudioManager.play('bomb');
        this.effects.shake(0.014, 300);
        this.effects.flash(0xfff3e0, 120);
      }
    }
    if (step.activations.length) await this.wait(140);

    // clears
    AudioManager.play('match', { combo: step.combo });
    let fly = 0;
    let cx = 0;
    let cy = 0;
    let mealHit = false;
    for (const p of step.cleared) {
      const s = this.sprites.get(p.id);
      if (!s) continue;
      this.sprites.delete(p.id);
      cx += s.x;
      cy += s.y;
      this.effects.burst(s.x, s.y, p.type, 7);
      const goal = this.level.goals.find((g) => g.type === p.type);
      if (goal && (this.displayCollected[p.type] ?? 0) < goal.count && fly < 8) {
        const item = this.goalItems.find((i) => i.goal.type === p.type);
        this.effects.flyTo(`food_${p.type}`, s.x, s.y, item.icon.x, item.icon.y, {
          size: this.cell * 0.6,
          delay: fly * 35,
          onArrive: () => this.bumpGoal(p.type),
        });
        fly++;
      }
      this.displayCollected[p.type] = (this.displayCollected[p.type] ?? 0) + 1;
      if (p.type === this.level.meal.revealType) mealHit = true;
      this.tweens.chain({
        targets: s,
        tweens: [
          { scale: 1.25, duration: 70 },
          { scale: 0, alpha: 0, angle: Phaser.Math.Between(-60, 60), duration: 170, ease: 'Back.easeIn' },
        ],
        onComplete: () => s.destroy(),
      });
    }
    const n = step.cleared.length || 1;
    this.effects.floatText(cx / n, cy / n, `+${step.scoreGain}`, { size: 26 + Math.min(step.combo, 5) * 3 });
    this.displayScore += step.scoreGain;
    this.drawScore();
    this.updateGoals();
    if (step.combo >= 2) {
      this.effects.bigText(COMBO_WORDS[Math.min(step.combo, COMBO_WORDS.length - 1)], { size: 46 + step.combo * 2 });
      AudioManager.play('combo', { combo: step.combo });
    }
    if (mealHit) {
      this.snow.chip();
      this.snow.setProgress(mealProgress(this.level, this.displayCollected));
    }
    await this.wait(210);

    // newly created specials
    for (const cr of step.created) {
      const s = this.makePiece(cr, cr.r, cr.c);
      s.setScale(0);
      this.tweens.add({ targets: s, scale: 1, duration: 320, ease: 'Back.easeOut' });
      this.effects.sparkle(s.x, s.y, 14);
      this.effects.floatText(s.x, s.y - this.cell * 0.4, cr.special === SPECIAL.BOMB ? 'قنبلة!' : 'صاروخ!', { size: 24, color: '#FFF59D' });
      AudioManager.play('special');
    }

    // gravity
    let maxDur = 0;
    for (const f of step.falls) {
      const s = this.sprites.get(f.id);
      if (!s) continue;
      const dur = 200 + (f.to - f.from) * 55;
      maxDur = Math.max(maxDur, dur);
      this.tweens.add({ targets: s, y: this.cellY(f.to), duration: dur, ease: 'Bounce.easeOut' });
    }
    for (const sp of step.spawns) {
      const s = this.makePiece(sp, sp.from, sp.c);
      const dur = 220 + (sp.r - sp.from) * 55;
      maxDur = Math.max(maxDur, dur);
      this.tweens.add({ targets: s, y: this.cellY(sp.r), duration: dur, ease: 'Bounce.easeOut' });
    }
    await this.wait(maxDur * 0.75);
    AudioManager.play('land');
    await this.wait(maxDur * 0.25);
    void U;
  }

  async finishMove(res) {
    if (res.status === 'won') return this.onWin(res);
    if (res.status === 'lost') return this.onLose();
    this.finishBusy();
  }

  async onWin(res) {
    this.busy = true;
    this.snow.setProgress(1);
    if (res.movesBonus) {
      this.effects.floatText(this.movesCenter.x, this.movesCenter.y, `+${res.movesBonus}`, { size: 30, color: '#FFF59D' });
      this.displayScore = res.score;
      this.drawScore();
    }
    await this.wait(400);
    AudioManager.play('win');
    this.effects.bigText('اكتمل الهدف!', { size: 56 });
    this.effects.confettiRain(this.scale.width, 140);
    await this.wait(1700);
    this.scene.launch('Result', {
      status: 'won',
      levelId: this.levelId,
      sessionId: this.sessionId,
      practice: this.practice,
      moves: this.engine.moveLog.map((m) => [...m]),
      local: this.engine.result(),
      stars: computeStars(this.level, this.engine.score),
    });
  }

  async onLose() {
    this.busy = true;
    this.effects.bigText('انتهت الحركات!', { size: 50, stroke: '#7a1c10' });
    await this.wait(1300);
    this.scene.launch('Result', {
      status: 'lost',
      levelId: this.levelId,
      practice: this.practice,
      local: this.engine.result(),
    });
  }

  // ---------------- idle hints & life ----------------

  idleTick() {
    if (this.busy || this.confirm) return;
    const idle = this.time.now - this.lastActivity;
    if (idle > 6000 && !this.hintTweens) this.showHint();
    else if (Math.random() < 0.5) {
      const r = Phaser.Math.Between(0, ROWS - 1);
      const c = Phaser.Math.Between(0, COLS - 1);
      const s = this.spriteAt(r, c);
      if (s && s.scale === 1) {
        this.tweens.add({ targets: s, angle: { from: 0, to: 8 }, duration: 120, yoyo: true, repeat: 1 });
        this.effects.sparkles.explode(2, s.x + this.cell * 0.2, s.y - this.cell * 0.25);
      }
    }
  }

  showHint() {
    const m = this.engine.findMove();
    if (!m) return;
    const targets = [this.spriteAt(m[0], m[1]), this.spriteAt(m[2], m[3])].filter(Boolean);
    this.hintTweens = this.tweens.add({ targets, scale: 1.13, duration: 380, yoyo: true, repeat: 3, onComplete: () => this.stopHint() });
  }

  stopHint() {
    if (!this.hintTweens) return;
    const targets = this.hintTweens.targets;
    this.hintTweens.stop();
    targets?.forEach((t) => t.setScale?.(1));
    this.hintTweens = null;
    this.lastActivity = this.time.now;
  }

  // ---------------- exit ----------------

  confirmExit() {
    if (this.engine.status !== 'playing') return;
    if (this.engine.movesUsed === 0) {
      app.go('Map');
      return;
    }
    if (this.confirm) return;
    const U = this.U;
    const W = this.scale.width;
    const H = this.scale.height;
    const c = this.add.container(0, 0).setDepth(3000);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x3a1600, 0.55).setInteractive();
    const pw = Math.min(W * 0.86, 380 * U);
    const ph = 230 * U;
    const g = this.add.graphics();
    drawPanel(g, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { radius: 28 * U, borderWidth: 5 * U });
    const t1 = text(this, W / 2, H / 2 - ph * 0.3, 'الخروج من المستوى؟', { size: 24 * U, font: DISPLAY_FONT, color: '#e8590c' });
    const t2 = text(this, W / 2, H / 2 - ph * 0.08, 'سيضيع تقدمك في هذه الجولة.', { size: 17 * U });
    const bw = pw * 0.4;
    const bh = 54 * U;
    const close = () => {
      c.destroy();
      this.confirm = null;
    };
    const stay = makeButton(this, { x: W / 2 + pw * 0.22, y: H / 2 + ph * 0.25, w: bw, h: bh, label: 'متابعة اللعب', color: 'green', size: 17 * U, onClick: close });
    const leave = makeButton(this, { x: W / 2 - pw * 0.22, y: H / 2 + ph * 0.25, w: bw, h: bh, label: 'خروج', color: 'red', size: 17 * U, onClick: () => app.go('Map') });
    c.add([dim, g, t1, t2, stay, leave]);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.confirm = c;
  }
}
