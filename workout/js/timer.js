// Таймеры отдыха и интервалов + звук, вибрация и блокировка гашения экрана.
import { state } from './store.js';

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// iOS требует жест пользователя для запуска звука
['touchend', 'click'].forEach(ev => window.addEventListener(ev, () => audio(), { once: true, passive: true }));
export function unlockAudio() { audio(); }

export function beep({ freq = 880, ms = 140, type = 'sine', gain = 0.22 } = {}) {
  if (!state.settings.sound) return;
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
  osc.connect(g); g.connect(a.destination);
  osc.start(); osc.stop(a.currentTime + ms / 1000 + 0.02);
}

export function countdownBeep() { beep({ freq: 660, ms: 110 }); }
export function finishBeep() {
  beep({ freq: 880, ms: 160 });
  setTimeout(() => beep({ freq: 1180, ms: 260 }), 180);
}
export function vibrate(pattern) {
  if (!state.settings.vibrate) return;
  try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {}
}

// ------------------------------------------------------------------ wake lock
let wl = null;
export async function keepAwake(on) {
  try {
    if (on && state.settings.keepAwake && 'wakeLock' in navigator) {
      if (!wl) wl = await navigator.wakeLock.request('screen');
    } else if (!on && wl) { await wl.release(); wl = null; }
  } catch (e) { wl = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wl === null && restTimer.running) keepAwake(true);
});

// ------------------------------------------------------------------ таймер отдыха
class RestTimer {
  constructor() {
    this.endAt = 0; this.total = 0; this.running = false;
    this.subs = new Set(); this._lastWhole = -1; this._tick = this._tick.bind(this);
  }
  subscribe(fn) { this.subs.add(fn); fn(this.snapshot()); return () => this.subs.delete(fn); }
  snapshot() {
    const left = this.running ? Math.max(0, (this.endAt - Date.now()) / 1000) : 0;
    return { running: this.running, left, total: this.total, progress: this.total ? 1 - left / this.total : 0 };
  }
  emit() { const s = this.snapshot(); this.subs.forEach(f => f(s)); }
  start(seconds, label = 'Отдых') {
    this.total = seconds; this.endAt = Date.now() + seconds * 1000;
    this.running = true; this.label = label; this._lastWhole = -1;
    keepAwake(true);
    cancelAnimationFrame(this._raf);
    this._tick();
    this.emit();
  }
  add(sec) { if (this.running) { this.endAt += sec * 1000; this.total += sec; this.emit(); } }
  stop() { this.running = false; cancelAnimationFrame(this._raf); keepAwake(false); this.emit(); }
  _tick() {
    if (!this.running) return;
    const left = (this.endAt - Date.now()) / 1000;
    const whole = Math.ceil(left);
    if (whole !== this._lastWhole) {
      this._lastWhole = whole;
      if (whole <= 3 && whole > 0) { countdownBeep(); vibrate(20); }
      this.emit();
    }
    if (left <= 0) {
      this.running = false;
      finishBeep(); vibrate([90, 60, 90]);
      keepAwake(false);
      this.emit();
      return;
    }
    this._raf = requestAnimationFrame(this._tick);
  }
}
export const restTimer = new RestTimer();

// ------------------------------------------------------------------ интервальный таймер
export class IntervalTimer {
  /** phases: [{ name, seconds }] , rounds: сколько раз повторить набор */
  constructor(phases, rounds = 1) {
    this.phases = phases; this.rounds = rounds;
    this.reset();
    this.subs = new Set();
    this._tick = this._tick.bind(this);
  }
  reset() { this.round = 1; this.idx = 0; this.running = false; this.endAt = 0; this.paused = 0; }
  subscribe(fn) { this.subs.add(fn); fn(this.snapshot()); return () => this.subs.delete(fn); }
  snapshot() {
    const ph = this.phases[this.idx] || { name: 'Готово', seconds: 0 };
    const left = this.running ? Math.max(0, (this.endAt - Date.now()) / 1000) : (this.paused || ph.seconds);
    return {
      running: this.running, phase: ph.name, left, total: ph.seconds,
      round: this.round, rounds: this.rounds, done: this.finished === true,
      progress: ph.seconds ? 1 - left / ph.seconds : 0
    };
  }
  emit() { const s = this.snapshot(); this.subs.forEach(f => f(s)); }
  start() {
    const ph = this.phases[this.idx];
    if (!ph) return;
    this.finished = false;
    this.endAt = Date.now() + (this.paused || ph.seconds) * 1000;
    this.paused = 0; this.running = true; this._last = -1;
    keepAwake(true);
    this._tick(); this.emit();
  }
  pause() {
    if (!this.running) return;
    this.paused = Math.max(0, (this.endAt - Date.now()) / 1000);
    this.running = false; cancelAnimationFrame(this._raf); keepAwake(false); this.emit();
  }
  stop() { cancelAnimationFrame(this._raf); this.reset(); keepAwake(false); this.emit(); }
  next() {
    this.idx++;
    if (this.idx >= this.phases.length) {
      this.idx = 0; this.round++;
      if (this.round > this.rounds) {
        this.running = false; this.finished = true;
        finishBeep(); vibrate([120, 80, 120, 80, 200]);
        keepAwake(false); this.emit(); return false;
      }
    }
    return true;
  }
  _tick() {
    if (!this.running) return;
    const left = (this.endAt - Date.now()) / 1000;
    const whole = Math.ceil(left);
    if (whole !== this._last) {
      this._last = whole;
      if (whole <= 3 && whole > 0) { countdownBeep(); vibrate(20); }
      this.emit();
    }
    if (left <= 0) {
      beep({ freq: 1046, ms: 200 }); vibrate([80, 40, 80]);
      if (this.next()) {
        this.endAt = Date.now() + this.phases[this.idx].seconds * 1000;
        this._last = -1; this.emit();
      } else return;
    }
    this._raf = requestAnimationFrame(this._tick);
  }
}
