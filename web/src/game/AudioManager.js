// Procedural audio: every sound effect and the background music are synthesized
// with the Web Audio API, so there are no audio files to download and sounds stay
// crisp on every device. Settings persist in localStorage.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Hz
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.sfxOn = localStorage.getItem('fc_sfx') !== 'off';
    this.musicOn = localStorage.getItem('fc_music') !== 'off';
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.listeners = new Set();
  }

  // Must be called from a user gesture (browsers block autoplay).
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.comp = this.ctx.createDynamicsCompressor();
      this.master.connect(this.comp).connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.8 : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.16 : 0;
      this.musicBus.connect(this.master);
      this.noiseBuffer = this._makeNoise();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this);
  }

  setSfx(on) {
    this.sfxOn = on;
    localStorage.setItem('fc_sfx', on ? 'on' : 'off');
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.02);
    this._emit();
  }

  setMusic(on) {
    this.musicOn = on;
    localStorage.setItem('fc_music', on ? 'on' : 'off');
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.1);
    this._emit();
  }

  /** Single toggle used by the in-game sound button: mutes/unmutes everything. */
  get muted() {
    return !this.sfxOn && !this.musicOn;
  }

  toggleAll() {
    const on = this.muted;
    this.setSfx(on);
    this.setMusic(on);
    return on;
  }

  // ---------- primitives ----------

  _makeNoise() {
    const len = this.ctx.sampleRate * 1.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  _ready() {
    return this.ctx && this.ctx.state === 'running';
  }

  tone({ freq, to, type = 'sine', dur = 0.15, vol = 0.3, at = 0, attack = 0.005, bus, detune = 0, vibrato = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    if (vibrato) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 7;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.3, at = 0, filter = 'lowpass', freq = 1000, to, q = 1, bus }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus ?? this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ---------- sound effects ----------

  play(name, opts = {}) {
    if (!this._ready() || !this.sfxOn) return;
    const fn = this[`sfx_${name}`];
    if (fn) fn.call(this, opts);
  }

  sfx_click() {
    this.tone({ freq: 880, to: 1200, type: 'triangle', dur: 0.06, vol: 0.18 });
  }

  sfx_select() {
    this.tone({ freq: 620, to: 780, type: 'sine', dur: 0.08, vol: 0.22 });
  }

  sfx_swap() {
    this.noise({ dur: 0.16, vol: 0.18, filter: 'bandpass', freq: 600, to: 2400, q: 2 });
    this.tone({ freq: 400, to: 700, type: 'sine', dur: 0.12, vol: 0.12 });
  }

  sfx_invalid() {
    this.tone({ freq: 330, to: 220, type: 'triangle', dur: 0.14, vol: 0.25, vibrato: 12 });
    this.tone({ freq: 260, to: 170, type: 'triangle', dur: 0.18, vol: 0.22, at: 0.12, vibrato: 12 });
  }

  sfx_match({ combo = 1 } = {}) {
    const base = 72 + Math.min(combo - 1, 8) * 2;
    const n = PENTA[Math.min(combo - 1, PENTA.length - 1)];
    this.tone({ freq: NOTE(base + n), to: NOTE(base + n) * 0.5, type: 'sine', dur: 0.12, vol: 0.35 });
    this.tone({ freq: NOTE(base + n + 12), type: 'triangle', dur: 0.18, vol: 0.18, at: 0.03 });
    this.tone({ freq: NOTE(base + n + 19), type: 'sine', dur: 0.22, vol: 0.1, at: 0.06 });
    this.noise({ dur: 0.05, vol: 0.12, filter: 'highpass', freq: 3000 });
  }

  sfx_pop() {
    this.tone({ freq: 900 + Math.random() * 300, to: 300, type: 'sine', dur: 0.07, vol: 0.12 });
  }

  sfx_land() {
    this.tone({ freq: 160, to: 90, type: 'sine', dur: 0.06, vol: 0.12 });
  }

  sfx_special() {
    [0, 4, 7, 12, 16].forEach((n, i) => this.tone({ freq: NOTE(84 + n), type: 'triangle', dur: 0.2, vol: 0.16, at: i * 0.045 }));
    this.noise({ dur: 0.4, vol: 0.06, filter: 'highpass', freq: 6000 });
  }

  sfx_rocket() {
    this.noise({ dur: 0.45, vol: 0.35, filter: 'bandpass', freq: 400, to: 6000, q: 3 });
    this.tone({ freq: 200, to: 1600, type: 'sawtooth', dur: 0.35, vol: 0.12 });
  }

  sfx_bomb() {
    this.tone({ freq: 140, to: 35, type: 'sine', dur: 0.6, vol: 0.7 });
    this.noise({ dur: 0.7, vol: 0.6, filter: 'lowpass', freq: 1800, to: 120 });
    this.noise({ dur: 0.15, vol: 0.3, filter: 'highpass', freq: 2500 });
  }

  sfx_combo({ combo = 2 } = {}) {
    const root = 72 + Math.min(combo, 6) * 2;
    [0, 4, 7, 12].forEach((n, i) => this.tone({ freq: NOTE(root + n), type: 'square', dur: 0.12, vol: 0.08, at: i * 0.06 }));
  }

  sfx_ice() {
    for (let i = 0; i < 5; i++) {
      this.noise({ dur: 0.05, vol: 0.25, filter: 'highpass', freq: 3000 + Math.random() * 4000, at: i * 0.03 });
    }
    this.tone({ freq: 2200, to: 1400, type: 'triangle', dur: 0.12, vol: 0.12 });
  }

  sfx_shatter() {
    this.noise({ dur: 0.5, vol: 0.4, filter: 'highpass', freq: 2500, to: 8000 });
    [96, 100, 103, 108].forEach((n, i) => this.tone({ freq: NOTE(n), type: 'sine', dur: 0.3, vol: 0.08, at: 0.02 + i * 0.04 }));
  }

  sfx_reveal() {
    [0, 4, 7, 11, 14, 19, 24].forEach((n, i) =>
      this.tone({ freq: NOTE(72 + n), type: 'triangle', dur: 0.5, vol: 0.14, at: i * 0.07 }),
    );
    this.tone({ freq: NOTE(96), type: 'sine', dur: 1.4, vol: 0.12, at: 0.5 });
  }

  sfx_coin() {
    this.tone({ freq: NOTE(83), type: 'square', dur: 0.08, vol: 0.1 });
    this.tone({ freq: NOTE(88), type: 'square', dur: 0.3, vol: 0.1, at: 0.07 });
  }

  sfx_star({ index = 0 } = {}) {
    const n = [76, 79, 84][index] ?? 84;
    this.tone({ freq: NOTE(n), type: 'triangle', dur: 0.45, vol: 0.25 });
    this.tone({ freq: NOTE(n + 12), type: 'sine', dur: 0.6, vol: 0.12, at: 0.02 });
    this.noise({ dur: 0.08, vol: 0.15, filter: 'highpass', freq: 5000 });
  }

  sfx_win() {
    const seq = [
      [72, 0],
      [76, 0.12],
      [79, 0.24],
      [84, 0.36],
      [79, 0.52],
      [84, 0.64],
    ];
    seq.forEach(([n, at]) => {
      this.tone({ freq: NOTE(n), type: 'square', dur: 0.2, vol: 0.09, at });
      this.tone({ freq: NOTE(n - 12), type: 'triangle', dur: 0.2, vol: 0.12, at });
    });
    [72, 76, 79, 84].forEach((n) => this.tone({ freq: NOTE(n), type: 'triangle', dur: 1.2, vol: 0.1, at: 0.8 }));
    this.noise({ dur: 0.12, vol: 0.2, filter: 'lowpass', freq: 400, at: 0.8 });
  }

  sfx_lose() {
    [67, 66, 65, 62].forEach((n, i) =>
      this.tone({ freq: NOTE(n), type: 'sawtooth', dur: i === 3 ? 0.8 : 0.3, vol: 0.08, at: i * 0.3, vibrato: i === 3 ? 6 : 0 }),
    );
  }

  sfx_locked() {
    this.tone({ freq: 220, to: 180, type: 'square', dur: 0.1, vol: 0.08 });
    this.tone({ freq: 180, to: 150, type: 'square', dur: 0.14, vol: 0.08, at: 0.1 });
  }

  // ---------- music: light, bouncy kitchen loop (lookahead scheduler) ----------

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this._scheduleMusic(), 50);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  _scheduleMusic() {
    const bpm = 116;
    const stepDur = 60 / bpm / 2; // eighth notes
    const chords = [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
    ];
    const melody = [76, null, 79, 76, 74, null, 72, 74, 76, null, 72, null, 69, 72, 74, null,
                    72, null, 69, 72, 74, 76, null, 79, 77, null, 76, 74, 72, null, null, null];
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
      const step = this.musicStep % 64;
      const bar = Math.floor(step / 8) % 4;
      const chord = chords[bar];
      const at = this.nextNoteTime - this.ctx.currentTime;
      const bus = this.musicBus;
      if (step % 4 === 0) this.tone({ freq: NOTE(chord[0] - 24), type: 'triangle', dur: stepDur * 1.8, vol: 0.5, at, bus });
      if (step % 4 === 2) this.tone({ freq: NOTE(chord[0] - 12), type: 'triangle', dur: stepDur * 0.9, vol: 0.3, at, bus });
      if (step % 2 === 1) chord.forEach((n) => this.tone({ freq: NOTE(n), type: 'sine', dur: stepDur * 0.7, vol: 0.12, at, bus }));
      const m = melody[step % 32];
      if (m && step >= 16) this.tone({ freq: NOTE(m), type: 'square', dur: stepDur * 0.9, vol: 0.06, at, bus, attack: 0.01 });
      if (step % 2 === 0) this.noise({ dur: 0.03, vol: 0.06, filter: 'highpass', freq: 8000, at, bus });
      this.nextNoteTime += stepDur;
      this.musicStep++;
    }
  }
}

export const AudioManager = new AudioManagerClass();
