// Хранилище состояния: localStorage + подписки + вычисляемые метрики.
import { EXERCISES, EX_BY_ID } from './data/exercises.js';
import { PROGRAMS, PROG_BY_ID } from './data/programs.js';

const KEY = 'fitpro.state.v1';

const DEFAULTS = {
  v: 1,
  settings: {
    units: 'kg',
    theme: 'auto',
    sound: true,
    vibrate: true,
    autoRest: true,
    defaultRest: 90,
    keepAwake: true,
    barWeight: 20,
    plates: [25, 20, 15, 10, 5, 2.5, 1.25],
    weeklyGoal: 3,
    name: ''
  },
  activeProgram: null,      // { id, startedAt, nextDay }
  session: null,            // текущая тренировка
  history: [],              // завершённые тренировки
  customPrograms: [],
  customExercises: [],
  videos: {},               // exId -> ссылка на видео пользователя
  favorites: [],
  body: [],                 // [{ date, weight, chest, waist, hips, arm, thigh, note }]
  lastBackup: 0,            // когда последний раз делали резервную копию
  backupSnooze: 0,          // когда напоминание о копии отложили
  seenHelp: false,
  seenInstall: false
};

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function merge(base, saved) {
  const out = clone(base);
  if (!saved || typeof saved !== 'object') return out;
  for (const k of Object.keys(base)) {
    if (saved[k] === undefined || saved[k] === null) continue;
    if (k === 'settings') out.settings = { ...base.settings, ...saved.settings };
    else out[k] = saved[k];
  }
  return out;
}

export const state = (() => {
  try { return merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (e) { console.warn('Не удалось прочитать сохранение', e); return clone(DEFAULTS); }
})();

const listeners = new Set();
let saveTimer = null;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function save(notify = true) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.error('Ошибка сохранения', e); }
  }, 120);
  if (notify) listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
}

export function resetAll() {
  localStorage.removeItem(KEY);
  Object.assign(state, clone(DEFAULTS));
  save();
}

// ------------------------------------------------------------------ каталоги
export function allExercises() {
  return [...EXERCISES, ...state.customExercises];
}
export function exerciseById(id) {
  return EX_BY_ID[id] || state.customExercises.find(e => e.id === id) || null;
}
export function allPrograms() {
  return [...PROGRAMS, ...state.customPrograms];
}
export function programById(id) {
  return PROG_BY_ID[id] || state.customPrograms.find(p => p.id === id) || null;
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ------------------------------------------------------------------ единицы
export const KG_TO_LB = 2.20462;
export function toDisplayWeight(kg) {
  if (kg === null || kg === undefined || kg === '') return '';
  return state.settings.units === 'lb' ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10;
}
export function fromDisplayWeight(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  if (isNaN(n)) return null;
  return state.settings.units === 'lb' ? n / KG_TO_LB : n;
}
export function unit() { return state.settings.units === 'lb' ? 'lb' : 'кг'; }

// ------------------------------------------------------------------ метрики
export function e1rm(kg, reps) {          // формула Эпли
  if (!kg || !reps) return 0;
  return kg * (1 + reps / 30);
}

export function sessionVolume(s) {
  let v = 0;
  (s.items || []).forEach(i => (i.sets || []).forEach(st => {
    if (st.done && st.type !== 'warmup') v += (st.w || 0) * (st.r || 0);
  }));
  return v;
}

export function sessionSets(s) {
  let n = 0;
  (s.items || []).forEach(i => (i.sets || []).forEach(st => { if (st.done) n++; }));
  return n;
}

export function sessionReps(s) {
  let n = 0;
  (s.items || []).forEach(i => (i.sets || []).forEach(st => { if (st.done) n += (st.r || 0); }));
  return n;
}

export function sessionDuration(s) {
  if (!s.startedAt) return 0;
  return Math.max(0, ((s.endedAt || Date.now()) - s.startedAt) / 1000);
}

/** Лучший результат по упражнению за всю историю. */
export function bestFor(exId) {
  let best = null;
  state.history.forEach(s => {
    (s.items || []).forEach(i => {
      if (i.exId !== exId) return;
      (i.sets || []).forEach(st => {
        if (!st.done || st.type === 'warmup' || !st.r) return;
        const est = e1rm(st.w || 0, st.r);
        if (!best || est > best.e1rm) best = { e1rm: est, w: st.w || 0, r: st.r, date: s.endedAt || s.startedAt };
      });
    });
  });
  return best;
}

/** Последние выполненные подходы упражнения (для подсказки веса). */
export function lastPerformance(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const s = state.history[i];
    const item = (s.items || []).find(x => x.exId === exId && (x.sets || []).some(st => st.done));
    if (item) return { date: s.endedAt || s.startedAt, sets: item.sets.filter(st => st.done) };
  }
  return null;
}

export function personalRecords() {
  const map = {};
  state.history.forEach(s => (s.items || []).forEach(i => (i.sets || []).forEach(st => {
    if (!st.done || st.type === 'warmup' || !st.r) return;
    const est = e1rm(st.w || 0, st.r);
    const cur = map[i.exId];
    if (!cur || est > cur.e1rm) map[i.exId] = { exId: i.exId, e1rm: est, w: st.w || 0, r: st.r, date: s.endedAt || s.startedAt };
  })));
  return Object.values(map).filter(r => r.w > 0).sort((a, b) => b.e1rm - a.e1rm);
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function trainingDays() {
  return new Set(state.history.map(s => dayKey(s.endedAt || s.startedAt)));
}

/** Серия недель подряд, в которых была хотя бы одна тренировка. */
export function streakDays() {
  const days = trainingDays();
  if (!days.size) return 0;
  let streak = 0;
  const d = new Date();
  // если сегодня ещё не тренировались — начинаем отсчёт со вчера
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const wd = (d.getDay() + 6) % 7;         // понедельник = 0
  d.setDate(d.getDate() - wd);
  return d.getTime();
}

export function thisWeekSessions() {
  const from = weekStart();
  return state.history.filter(s => (s.endedAt || s.startedAt) >= from);
}

export function volumeByWeek(weeks = 8) {
  const out = [];
  const startOfThis = weekStart();
  for (let i = weeks - 1; i >= 0; i--) {
    const from = startOfThis - i * 7 * 864e5;
    const to = from + 7 * 864e5;
    const inWeek = state.history.filter(s => {
      const t = s.endedAt || s.startedAt;
      return t >= from && t < to;
    });
    out.push({
      from, to,
      volume: inWeek.reduce((a, s) => a + sessionVolume(s), 0),
      sessions: inWeek.length,
      label: new Date(from).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    });
  }
  return out;
}

export function volumeByGroup(days = 30) {
  const from = Date.now() - days * 864e5;
  const map = {};
  state.history.forEach(s => {
    if ((s.endedAt || s.startedAt) < from) return;
    (s.items || []).forEach(i => {
      const ex = exerciseById(i.exId);
      if (!ex) return;
      let v = 0, sets = 0;
      (i.sets || []).forEach(st => { if (st.done && st.type !== 'warmup') { v += (st.w || 0) * (st.r || 0); sets++; } });
      if (!sets) return;
      map[ex.group] = map[ex.group] || { group: ex.group, volume: 0, sets: 0 };
      map[ex.group].volume += v;
      map[ex.group].sets += sets;
    });
  });
  return Object.values(map).sort((a, b) => b.sets - a.sets);
}

export function exerciseProgress(exId) {
  const pts = [];
  state.history.forEach(s => {
    let best = 0, bw = 0, br = 0;
    (s.items || []).forEach(i => {
      if (i.exId !== exId) return;
      (i.sets || []).forEach(st => {
        if (!st.done || st.type === 'warmup' || !st.r) return;
        const est = e1rm(st.w || 0, st.r);
        if (est > best) { best = est; bw = st.w || 0; br = st.r; }
      });
    });
    if (best > 0) pts.push({ t: s.endedAt || s.startedAt, e1rm: best, w: bw, r: br });
  });
  return pts.sort((a, b) => a.t - b.t);
}

// ------------------------------------------------------------------ тренировка
export function startSession({ programId = null, dayIndex = 0, title = null, items = null } = {}) {
  const prog = programId ? programById(programId) : null;
  const day = prog ? prog.days[dayIndex] : null;
  const sessItems = items || (day ? day.items.map(i => ({
    exId: i.id,
    note: i.note || '',
    ss: i.ss || null,
    targetReps: i.reps,
    targetRest: i.rest,
    sets: Array.from({ length: i.sets }, () => ({ w: null, r: null, done: false, rpe: null, type: 'work' }))
  })) : []);

  // подставляем веса с прошлой тренировки
  sessItems.forEach(item => {
    const last = lastPerformance(item.exId);
    if (last && last.sets.length) {
      const w = last.sets[last.sets.length - 1].w;
      item.sets.forEach(s => { if (s.w === null) s.w = w; });
      item.lastHint = last.sets.map(s => `${s.w ? s.w + '×' : ''}${s.r || 0}`).join(', ');
    }
  });

  state.session = {
    id: uid('ws'),
    programId,
    dayIndex,
    title: title || (day ? `${prog.name} · ${day.title}` : 'Своя тренировка'),
    startedAt: Date.now(),
    endedAt: null,
    items: sessItems,
    notes: '',
    cursor: 0
  };
  save();
  return state.session;
}

export function finishSession() {
  const s = state.session;
  if (!s) return null;
  s.endedAt = Date.now();
  s.items = s.items.filter(i => (i.sets || []).some(st => st.done));
  if (s.items.length) {
    state.history.push(s);
    if (state.activeProgram && state.activeProgram.id === s.programId) {
      const p = programById(s.programId);
      if (p) state.activeProgram.nextDay = ((s.dayIndex ?? 0) + 1) % p.days.length;
      state.activeProgram.done = (state.activeProgram.done || 0) + 1;
    }
  }
  state.session = null;
  save();
  return s;
}

export function discardSession() { state.session = null; save(); }

export function deleteHistory(id) {
  state.history = state.history.filter(s => s.id !== id);
  save();
}

// ------------------------------------------------------------------ прочее
export function toggleFavorite(exId) {
  const i = state.favorites.indexOf(exId);
  if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(exId);
  save();
}

export function setVideo(exId, url) {
  if (url) state.videos[exId] = url; else delete state.videos[exId];
  save();
}

export function exportData() {
  return JSON.stringify({ app: 'FitPro', exported: new Date().toISOString(), state }, null, 2);
}

/** Скачивает резервную копию файлом и отмечает дату копии. */
export function downloadBackup() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trenirovki-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  state.lastBackup = Date.now();
  save();
}

/** Пора ли напомнить о резервной копии. */
export function needsBackup() {
  if (state.history.length < 4) return false;
  if (Date.now() - (state.backupSnooze || 0) < 7 * 864e5) return false;
  const last = state.lastBackup || 0;
  if (!last) return true;
  return Date.now() - last > 30 * 864e5;
}

export function importData(json) {
  const parsed = JSON.parse(json);
  const incoming = parsed.state || parsed;
  Object.assign(state, merge(DEFAULTS, incoming));
  save();
}

// Пользовательские ссылки на видео из data/videos.json (можно пополнять в репозитории).
export async function loadVideoOverrides() {
  try {
    const res = await fetch('data/videos.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    Object.entries(data).forEach(([id, url]) => {
      if (!state.videos[id]) state.videos[id] = url;   // пользовательская ссылка приоритетнее
    });
  } catch (e) { /* офлайн — не страшно */ }
}
