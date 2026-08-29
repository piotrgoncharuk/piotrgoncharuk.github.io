// Хранилище состояния: localStorage + подписки + вычисляемые метрики.
import { EXERCISES, EX_BY_ID } from './data/exercises.js';
import { PROGRAMS, PROG_BY_ID } from './data/programs.js';

const LEGACY_KEY = 'fitpro.state.v1';
const PROFILES_KEY = 'fitpro.profiles';
const ACTIVE_KEY = 'fitpro.active';
const stateKey = id => `fitpro.state.${id}`;

export const PROFILE_EMOJI = ['💪', '⚽️', '🏃', '🏋️', '🤸', '🥊', '🧘', '🚴'];

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
    name: '',
    aiModel: 'claude-opus-5',
    place: 'gym'            // где тренируетесь по умолчанию: gym | home | outdoor
  },
  schedule: {},             // '1'..'7' (Пн..Вс) -> { type, ... }
  chat: [],                 // история переписки с тренером
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

// ------------------------------------------------------------------ профили
function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}

/** Список профилей; при первом запуске создаётся из старых данных. */
function initProfiles() {
  let list = readJSON(PROFILES_KEY, null);
  if (Array.isArray(list) && list.length) return list;

  const legacy = localStorage.getItem(LEGACY_KEY);
  let name = 'Я';
  if (legacy) {
    try { name = (JSON.parse(legacy).settings || {}).name || 'Я'; } catch (e) {}
    localStorage.setItem(stateKey('p1'), legacy);
  }
  list = [{ id: 'p1', name, emoji: '💪', created: Date.now() }];
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  localStorage.setItem(ACTIVE_KEY, 'p1');
  return list;
}

export let profiles = initProfiles();
export let activeProfileId = (() => {
  const id = localStorage.getItem(ACTIVE_KEY);
  return profiles.some(p => p.id === id) ? id : profiles[0].id;
})();

export function activeProfile() {
  return profiles.find(p => p.id === activeProfileId) || profiles[0];
}

function loadState(id) {
  try { return merge(DEFAULTS, readJSON(stateKey(id), null)); }
  catch (e) { console.warn('Не удалось прочитать сохранение', e); return clone(DEFAULTS); }
}

export const state = loadState(activeProfileId);

function saveProfiles() { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); }

export function switchProfile(id) {
  if (!profiles.some(p => p.id === id)) return;
  localStorage.setItem(ACTIVE_KEY, id);
  location.hash = '#/';
  location.reload();
}

export function addProfile(name, emoji = '💪') {
  const p = { id: 'p' + Date.now().toString(36), name: (name || 'Профиль').trim(), emoji, created: Date.now() };
  profiles.push(p);
  saveProfiles();
  localStorage.setItem(stateKey(p.id), JSON.stringify({ ...clone(DEFAULTS), settings: { ...DEFAULTS.settings, name: p.name } }));
  return p;
}

export function updateProfile(id, patch) {
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  Object.assign(p, patch);
  saveProfiles();
  if (id === activeProfileId && patch.name) { state.settings.name = patch.name; save(); }
}

/** Краткая сводка по профилю без переключения на него. */
export function profileSummary(id) {
  const st = id === activeProfileId ? state : readJSON(stateKey(id), null);
  if (!st) return { sessions: 0, last: null };
  const hist = st.history || [];
  return {
    sessions: hist.length,
    last: hist.length ? (hist[hist.length - 1].endedAt || hist[hist.length - 1].startedAt) : null
  };
}

export function deleteProfile(id) {
  if (profiles.length < 2) return false;
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles();
  localStorage.removeItem(stateKey(id));
  if (id === activeProfileId) switchProfile(profiles[0].id);
  return true;
}

const listeners = new Set();
let saveTimer = null;

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function save(notify = true) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(stateKey(activeProfileId), JSON.stringify(state)); }
    catch (e) { console.error('Ошибка сохранения', e); }
  }, 120);
  if (notify) listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
}

export function resetAll() {
  localStorage.removeItem(stateKey(activeProfileId));
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

/** Резервная копия всех профилей устройства. */
export function exportData() {
  const payload = {
    app: 'Тренировки',
    version: 2,
    exported: new Date().toISOString(),
    active: activeProfileId,
    profiles: profiles.map(p => ({
      meta: p,
      state: p.id === activeProfileId ? state : readJSON(stateKey(p.id), clone(DEFAULTS))
    }))
  };
  return JSON.stringify(payload, null, 2);
}

/** История тренировок в CSV — для Excel или Google Таблиц. */
export function exportCSV() {
  const rows = [['дата', 'тип', 'название', 'упражнение', 'подход', 'вес_кг', 'повторы', 'длительность_мин', 'RPE', 'нагрузка', 'заметки']];
  state.history.forEach(s => {
    const date = new Date(s.endedAt || s.startedAt).toISOString().slice(0, 16).replace('T', ' ');
    const mins = Math.round(sessionDuration(s) / 60);
    if (s.kind === 'football') {
      rows.push([date, footballTypeName(s.type), s.title, '', '', '', '', mins, s.rpe || '', sessionLoad(s), (s.notes || '').replace(/[\n;]/g, ' ')]);
      return;
    }
    (s.items || []).forEach(i => {
      const ex = exerciseById(i.exId);
      (i.sets || []).filter(x => x.done).forEach((x, n) => {
        rows.push([date, 'силовая', s.title, ex ? ex.name : i.exId, n + 1, x.w ?? '', x.r ?? '', mins, s.rpe || '', sessionLoad(s), (s.notes || '').replace(/[\n;]/g, ' ')]);
      });
    });
  });
  return '\uFEFF' + rows.map(r => r.join(';')).join('\n');
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

  // Новый формат: несколько профилей
  if (Array.isArray(parsed.profiles) && parsed.profiles.length) {
    profiles = parsed.profiles.map(p => p.meta);
    saveProfiles();
    parsed.profiles.forEach(p => localStorage.setItem(stateKey(p.meta.id), JSON.stringify(merge(DEFAULTS, p.state))));
    const active = profiles.some(p => p.id === parsed.active) ? parsed.active : profiles[0].id;
    localStorage.setItem(ACTIVE_KEY, active);
    return { reload: true };
  }

  // Старый формат: одно состояние — кладём в текущий профиль
  const incoming = parsed.state || parsed;
  Object.assign(state, merge(DEFAULTS, incoming));
  save();
  return { reload: false };
}

// ------------------------------------------------------------------ недельный план
export const WEEKDAYS = [
  { n: 1, short: 'Пн', full: 'Понедельник' },
  { n: 2, short: 'Вт', full: 'Вторник' },
  { n: 3, short: 'Ср', full: 'Среда' },
  { n: 4, short: 'Чт', full: 'Четверг' },
  { n: 5, short: 'Пт', full: 'Пятница' },
  { n: 6, short: 'Сб', full: 'Суббота' },
  { n: 7, short: 'Вс', full: 'Воскресенье' }
];

/** Номер дня недели по ISO: понедельник = 1, воскресенье = 7. */
export function isoDay(ts = Date.now()) {
  return ((new Date(ts).getDay() + 6) % 7) + 1;
}

export function planFor(day) {
  return state.schedule[String(day)] || null;
}

export function setPlan(day, entry) {
  if (entry) state.schedule[String(day)] = entry;
  else delete state.schedule[String(day)];
  save();
}

export function todayPlan() { return planFor(isoDay()); }
export function tomorrowPlan() { return planFor(isoDay(Date.now() + 864e5)); }

/** Человеческое описание пункта плана. */
export function planLabel(entry) {
  if (!entry) return null;
  if (entry.type === 'rest') return { icon: '😴', title: 'Отдых', sub: 'Восстановление' };
  if (entry.type === 'football') {
    const t = FOOTBALL_TYPES[entry.fbType] || FOOTBALL_TYPES.training;
    return { icon: t.icon, title: t.name, sub: 'Футбол' };
  }
  if (entry.type === 'program') {
    const p = programById(entry.programId);
    if (!p) return { icon: '🏋️', title: 'Тренировка', sub: '' };
    const d = p.days[entry.dayIndex] || p.days[0];
    return { icon: '🏋️', title: d ? d.title : p.name, sub: p.name };
  }
  if (entry.type === 'program_auto') {
    const p = state.activeProgram ? programById(state.activeProgram.id) : null;
    if (!p) return { icon: '🏋️', title: 'Тренировка по программе', sub: 'Программа не выбрана' };
    const di = (state.activeProgram.nextDay || 0) % p.days.length;
    return { icon: '🏋️', title: p.days[di].title, sub: p.name };
  }
  if (entry.type === 'note') return { icon: '📝', title: entry.text || 'Своя тренировка', sub: '' };
  return null;
}

/** Быстрый пресет: футбол в указанные дни недели. */
export function setFootballDays(days, fbType = 'training') {
  days.forEach(d => { state.schedule[String(d)] = { type: 'football', fbType }; });
  save();
}

// ------------------------------------------------------------------ футбол
export const FOOTBALL_TYPES = {
  training: { name: 'Тренировка команды', icon: '⚽️' },
  match:    { name: 'Матч',               icon: '🏟' },
  solo:     { name: 'Индивидуальная',     icon: '🎯' },
  gk:       { name: 'Вратарская',         icon: '🧤' }
};
export function footballTypeName(t) { return (FOOTBALL_TYPES[t] || {}).name || 'Футбол'; }

/** Сохраняет футбольную тренировку или матч в историю. */
export function saveFootball(entry) {
  const at = entry.date || Date.now();
  const rec = {
    id: entry.id || uid('fb'),
    kind: 'football',
    type: entry.type || 'training',
    title: entry.title || footballTypeName(entry.type),
    startedAt: at,
    endedAt: at + (entry.minutes || 0) * 60000,
    minutes: entry.minutes || 0,
    rpe: entry.rpe || null,
    distance: entry.distance || null,
    goals: entry.goals || 0,
    assists: entry.assists || 0,
    opponent: entry.opponent || '',
    scoreFor: entry.scoreFor ?? null,
    scoreAgainst: entry.scoreAgainst ?? null,
    position: entry.position || '',
    rating: entry.rating || null,
    drills: entry.drills || [],
    notes: entry.notes || '',
    items: []
  };
  const idx = state.history.findIndex(h => h.id === rec.id);
  if (idx >= 0) state.history[idx] = rec; else state.history.push(rec);
  state.history.sort((a, b) => (a.endedAt || a.startedAt) - (b.endedAt || b.startedAt));
  save();
  return rec;
}

export function footballSessions() { return state.history.filter(s => s.kind === 'football'); }

export function footballStats(days = 3650) {
  const from = Date.now() - days * 864e5;
  const list = footballSessions().filter(s => (s.endedAt || s.startedAt) >= from);
  const matches = list.filter(s => s.type === 'match');
  return {
    total: list.length,
    matches: matches.length,
    minutes: list.reduce((a, s) => a + (s.minutes || 0), 0),
    goals: list.reduce((a, s) => a + (s.goals || 0), 0),
    assists: list.reduce((a, s) => a + (s.assists || 0), 0),
    distance: list.reduce((a, s) => a + (s.distance || 0), 0),
    wins: matches.filter(s => s.scoreFor != null && s.scoreAgainst != null && s.scoreFor > s.scoreAgainst).length,
    draws: matches.filter(s => s.scoreFor != null && s.scoreFor === s.scoreAgainst).length,
    losses: matches.filter(s => s.scoreFor != null && s.scoreAgainst != null && s.scoreFor < s.scoreAgainst).length
  };
}

// ------------------------------------------------------------------ нагрузка (sRPE)
/** Нагрузка одной тренировки: RPE × минуты — метод Фостера, им пользуются в профессиональном спорте. */
export function sessionLoad(s) {
  const mins = s.kind === 'football' ? (s.minutes || 0) : Math.round(sessionDuration(s) / 60);
  const rpe = s.rpe || (s.kind === 'football' ? 6 : 7);   // если не указано — среднее значение
  return Math.round(mins * rpe);
}

export function loadByWeek(weeks = 8) {
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
      from,
      label: new Date(from).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      load: inWeek.reduce((a, s) => a + sessionLoad(s), 0),
      sessions: inWeek.length
    });
  }
  return out;
}

/** Отношение недельной нагрузки к среднему за 4 недели: подсказывает, не растёт ли объём слишком резко. */
export function acwr() {
  const now = Date.now();
  const last28 = state.history.filter(s => (s.endedAt || s.startedAt) >= now - 28 * 864e5);
  const acute = state.history.filter(s => (s.endedAt || s.startedAt) >= now - 7 * 864e5)
    .reduce((a, s) => a + sessionLoad(s), 0);
  const chronic = last28.reduce((a, s) => a + sessionLoad(s), 0) / 4;

  // Пока данных мало, соотношение вводит в заблуждение: нужен хотя бы месяц регулярных занятий.
  const first = state.history.length ? (state.history[0].endedAt || state.history[0].startedAt) : now;
  const enoughData = last28.length >= 4 && now - first >= 14 * 864e5;
  if (!chronic || !enoughData) return { acute, chronic: Math.round(chronic), ratio: null, zone: 'none' };
  const ratio = acute / chronic;
  let zone = 'ok';
  if (ratio < 0.8) zone = 'low';
  else if (ratio > 1.5) zone = 'high';
  else if (ratio > 1.3) zone = 'warn';
  return { acute, chronic: Math.round(chronic), ratio, zone };
}

// ------------------------------------------------------------------ достижения
const BADGES = [
  { id: 'first', icon: '🎬', name: 'Первый шаг', desc: 'Первая завершённая тренировка', test: h => h.length >= 1 },
  { id: 'ten', icon: '🔟', name: 'Десятка', desc: '10 тренировок', test: h => h.length >= 10 },
  { id: 'fifty', icon: '🏅', name: 'Полста', desc: '50 тренировок', test: h => h.length >= 50 },
  { id: 'hundred', icon: '💯', name: 'Сотня', desc: '100 тренировок', test: h => h.length >= 100 },
  { id: 'streak3', icon: '🔥', name: 'Разогрев', desc: '3 дня подряд', test: () => streakDays() >= 3 },
  { id: 'streak7', icon: '⚡️', name: 'Неделя огня', desc: '7 дней подряд', test: () => streakDays() >= 7 },
  { id: 'week4', icon: '📅', name: 'Месяц дисциплины', desc: '4 недели подряд с тренировками', test: () => consecutiveWeeks() >= 4 },
  { id: 'ton10', icon: '🏗', name: '10 тонн', desc: '10 000 кг за одну неделю', test: () => volumeByWeek(1)[0].volume >= 10000 },
  { id: 'ton100', icon: '🚂', name: '100 тонн', desc: '100 000 кг суммарно', test: h => h.reduce((a, s) => a + sessionVolume(s), 0) >= 100000 },
  { id: 'early', icon: '🌅', name: 'Ранняя пташка', desc: 'Тренировка до 8 утра', test: h => h.some(s => new Date(s.startedAt).getHours() < 8) },
  { id: 'pr5', icon: '🏆', name: 'Рекордсмен', desc: 'Личные рекорды в 5 упражнениях', test: () => personalRecords().length >= 5 },
  { id: 'fb1', icon: '⚽️', name: 'Выход на поле', desc: 'Первая футбольная тренировка', test: h => h.some(s => s.kind === 'football') },
  { id: 'fb10', icon: '🥅', name: 'Игровая практика', desc: '10 футбольных занятий', test: h => h.filter(s => s.kind === 'football').length >= 10 },
  { id: 'goal1', icon: '🎯', name: 'Гол!', desc: 'Первый забитый мяч', test: () => footballStats().goals >= 1 },
  { id: 'goal10', icon: '👟', name: 'Бомбардир', desc: '10 голов', test: () => footballStats().goals >= 10 },
  { id: 'assist5', icon: '🅰️', name: 'Ассистент', desc: '5 голевых передач', test: () => footballStats().assists >= 5 },
  { id: 'body', icon: '⚖️', name: 'Под контролем', desc: '5 записей замеров тела', test: () => state.body.length >= 5 },
  { id: 'video', icon: '📺', name: 'Видеотека', desc: 'Закреплено 5 видео к упражнениям', test: () => Object.keys(state.videos).length >= 5 }
];

export function consecutiveWeeks() {
  const weeks = new Set(state.history.map(s => weekStart(s.endedAt || s.startedAt)));
  let n = 0;
  let w = weekStart();
  if (!weeks.has(w)) w -= 7 * 864e5;
  while (weeks.has(w)) { n++; w -= 7 * 864e5; }
  return n;
}

export function achievements() {
  const h = state.history;
  return BADGES.map(b => {
    let done = false;
    try { done = !!b.test(h); } catch (e) { done = false; }
    return { ...b, done };
  });
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
