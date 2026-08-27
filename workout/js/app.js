// Точка входа: маршрутизация, оболочка, таймер отдыха, service worker.
import { h, mmss, toast } from './ui.js';
import * as S from './store.js';
import { restTimer, unlockAudio } from './timer.js';

import * as Home from './views/home.js';
import * as Programs from './views/programs.js';
import * as Exercises from './views/exercises.js';
import * as Workout from './views/workout.js';
import * as History from './views/history.js';
import * as Stats from './views/stats.js';
import * as Tools from './views/tools.js';
import * as Body from './views/body.js';
import * as Settings from './views/settings.js';
import * as Builder from './views/builder.js';
import * as Install from './views/install.js';
import * as More from './views/more.js';
import * as Help from './views/help.js';
import * as Football from './views/football.js';
import * as Profiles from './views/profiles.js';
import * as Achievements from './views/achievements.js';

export const VERSION = '1.2.0';

const ROUTES = [
  [/^\/?$/,                 () => Home.render(),                'Главная',      'home'],
  [/^\/programs$/,          () => Programs.render(),            'Программы',    'programs'],
  [/^\/program\/(.+)$/,     m => Programs.renderDetail(m[1]),   'Программа',    'programs'],
  [/^\/exercises$/,         () => Exercises.render(),           'Упражнения',   'more'],
  [/^\/exercise\/(.+)$/,    m => Exercises.renderDetail(m[1]),  'Упражнение',   'more'],
  [/^\/workout$/,           () => Workout.render(),             'Тренировка',   'home'],
  [/^\/history$/,           () => History.render(),             'История',      'more'],
  [/^\/history\/(.+)$/,     m => History.renderDetail(m[1]),    'Тренировка',   'more'],
  [/^\/stats$/,             () => Stats.render(),               'Прогресс',     'stats'],
  [/^\/tools$/,             () => Tools.render(),               'Инструменты',  'more'],
  [/^\/body$/,              () => Body.render(),                'Замеры',       'more'],
  [/^\/settings$/,          () => Settings.render(),            'Настройки',    'more'],
  [/^\/builder$/,           () => Builder.render(),             'Мои программы','more'],
  [/^\/builder\/(.+)$/,     m => Builder.renderEditor(m[1]),    'Редактор',     'more'],
  [/^\/install$/,           () => Install.render(),             'Установка',    'more'],
  [/^\/more$/,              () => More.render(),                'Ещё',          'more'],
  [/^\/help$/,              () => Help.render(),                'Как пользоваться', 'more'],
  [/^\/football$/,          () => Football.render(),            'Футбол',       'football'],
  [/^\/football\/(.+)$/,    m => Football.render(m[1]),         'Футбол',       'football'],
  [/^\/profiles$/,          () => Profiles.render(),            'Профили',      'more'],
  [/^\/achievements$/,      () => Achievements.render(),        'Достижения',   'stats']
];

const TABS = [
  ['home', '#/', '🏠', 'Главная'],
  ['programs', '#/programs', '📋', 'Программы'],
  ['football', '#/football', '⚽️', 'Футбол'],
  ['stats', '#/stats', '📈', 'Прогресс'],
  ['more', '#/more', '⋯', 'Ещё']
];

const outlet = document.getElementById('app');
const scrollPos = {};

export function applyTheme() {
  const t = S.state.settings.theme;
  document.documentElement.dataset.theme = t === 'auto' ? '' : t;
  const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0e1117' : '#f5f6f8');
}

function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const prev = window.__prevHash;
  if (prev) scrollPos[prev] = window.scrollY;
  window.__prevHash = hash;

  let node = null, tab = 'home';
  for (const [re, fn, title, t] of ROUTES) {
    const m = hash.match(re);
    if (m) {
      try { node = fn(m); } catch (e) { console.error(e); node = errorView(e); }
      document.title = title + ' · Тренировки';
      tab = t;
      break;
    }
  }
  if (!node) node = notFound();

  outlet.innerHTML = '';
  outlet.appendChild(node);
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  window.scrollTo(0, hash.includes('/exercise/') || hash.includes('/program/') ? 0 : (scrollPos[hash] || 0));
}

function notFound() {
  return h('div', { class: 'view' }, [
    h('div', { class: 'empty' }, [
      h('div', { class: 'empty-icon', text: '🤷' }),
      h('h3', { text: 'Страница не найдена' }),
      h('a', { class: 'btn', href: '#/', text: 'На главную' })
    ])
  ]);
}

function errorView(e) {
  return h('div', { class: 'view' }, [
    h('div', { class: 'card warn' }, [
      h('h3', { class: 'card-title', text: 'Что-то пошло не так' }),
      h('p', { class: 'muted small', text: String(e && e.message || e) }),
      h('a', { class: 'btn', href: '#/', text: 'На главную' })
    ])
  ]);
}

// ------------------------------------------------------------------ оболочка
function buildShell() {
  const nav = h('nav', { class: 'tabbar' }, TABS.map(([key, href, icon, label]) =>
    h('a', { class: 'tab', href, dataset: { tab: key } }, [
      h('span', { class: 'tab-icon', text: icon }),
      h('span', { class: 'tab-label', text: label })
    ])));
  document.body.appendChild(nav);

  // Плавающая кнопка активной тренировки
  const fab = h('a', { class: 'fab hidden', href: '#/workout' }, [h('span', { text: '▶︎ Тренировка' })]);
  document.body.appendChild(fab);
  const syncFab = () => {
    const on = !!S.state.session && !location.hash.startsWith('#/workout');
    fab.classList.toggle('hidden', !on);
  };
  S.subscribe(syncFab);
  window.addEventListener('hashchange', syncFab);
  syncFab();

  // Панель таймера отдыха
  const label = h('span', { class: 'rest-label', text: 'Отдых' });
  const time = h('span', { class: 'rest-time mono', text: '00:00' });
  const fill = h('span', { class: 'rest-fill' });
  const bar = h('div', { class: 'restbar hidden' }, [
    h('div', { class: 'rest-progress' }, [fill]),
    h('div', { class: 'rest-row' }, [
      h('div', { class: 'rest-info' }, [label, time]),
      h('div', { class: 'row gap' }, [
        h('button', { class: 'mini', text: '−15', onClick: () => restTimer.add(-15) }),
        h('button', { class: 'mini', text: '+15', onClick: () => restTimer.add(15) }),
        h('button', { class: 'mini strong', text: 'Пропустить', onClick: () => restTimer.stop() })
      ])
    ])
  ]);
  document.body.appendChild(bar);
  restTimer.subscribe(s => {
    bar.classList.toggle('hidden', !s.running);
    time.textContent = mmss(s.left);
    label.textContent = restTimer.label || 'Отдых';
    fill.style.width = Math.round((s.progress || 0) * 100) + '%';
    bar.classList.toggle('urgent', s.running && s.left <= 5);
  });
}

// ------------------------------------------------------------------ старт
function boot() {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  buildShell();
  window.addEventListener('hashchange', route);
  route();
  S.loadVideoOverrides().then(() => {
    if (location.hash.startsWith('#/exercise/')) route();
  });

  const v = document.getElementById('app-version');
  if (v) v.textContent = VERSION;

  // предупреждение о потере несохранённой тренировки
  window.addEventListener('beforeunload', () => { if (S.state.session) S.save(false); });

  // Установка на Android
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    window.__installPrompt = e;
    if (!S.state.seenInstall) {
      toast('Приложение можно установить: «Ещё → Установить на телефон»');
      S.state.seenInstall = true; S.save(false);
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              toast('Доступна новая версия — перезапустите приложение');
            }
          });
        });
      }).catch(() => {});
    });
  }

  document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

boot();
