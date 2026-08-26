import { h, segmented, toast, videoPlayer, videoSearchUrl, promptDialog, confirmDialog, fmtDateShort, fmtNum, esc } from '../ui.js';
import { lineChart } from '../charts.js';
import * as S from '../store.js';
import { GROUPS, LEVELS, ALL_EQUIPMENT } from '../data/exercises.js';

const filt = { q: '', group: 'all', eq: 'all', fav: false };

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Упражнения' }),
    h('p', { class: 'muted', text: 'Техника, частые ошибки и видео-инструкция к каждому движению.' })
  ]));

  const search = h('input', { class: 'input search', type: 'search', placeholder: '🔍 Поиск упражнения…', value: filt.q });
  search.addEventListener('input', () => { filt.q = search.value; paint(); });
  root.appendChild(search);

  const groupBar = h('div', { class: 'scroll-chips' });
  const groups = [['all', 'Все'], ...Object.entries(GROUPS).map(([k, v]) => [k, `${v.icon} ${v.title}`]), ['fav', '★ Избранное']];
  groups.forEach(([k, label]) => {
    groupBar.appendChild(h('button', {
      class: 'chip tap' + ((filt.group === k || (k === 'fav' && filt.fav)) ? ' on' : ''), text: label,
      onClick: () => {
        if (k === 'fav') { filt.fav = !filt.fav; } else { filt.group = k; filt.fav = false; }
        [...groupBar.children].forEach((c, i) => c.classList.toggle('on', groups[i][0] === filt.group && !filt.fav || (groups[i][0] === 'fav' && filt.fav)));
        paint();
      }
    }));
  });
  root.appendChild(groupBar);

  const eqSel = h('select', { class: 'input select' }, [h('option', { value: 'all', text: 'Любой инвентарь' }),
    ...ALL_EQUIPMENT.map(e => h('option', { value: e, text: e, selected: filt.eq === e ? '' : null }))]);
  eqSel.value = filt.eq;
  eqSel.addEventListener('change', () => { filt.eq = eqSel.value; paint(); });
  root.appendChild(eqSel);

  const countEl = h('p', { class: 'muted small' });
  const list = h('div', { class: 'ex-list' });
  root.appendChild(countEl);
  root.appendChild(list);

  root.appendChild(h('button', { class: 'btn ghost block', text: '+ Своё упражнение', onClick: createCustom }));

  function paint() {
    const q = filt.q.trim().toLowerCase();
    let items = S.allExercises().filter(e => {
      if (filt.fav && !S.state.favorites.includes(e.id)) return false;
      if (!filt.fav && filt.group !== 'all' && e.group !== filt.group) return false;
      if (filt.eq !== 'all' && !(e.eq || []).includes(filt.eq)) return false;
      if (q && !(e.name.toLowerCase().includes(q) || (e.en || '').toLowerCase().includes(q) ||
                (e.primary || []).join(' ').toLowerCase().includes(q))) return false;
      return true;
    });
    countEl.textContent = `Найдено: ${items.length}`;
    list.innerHTML = '';
    items.forEach(e => list.appendChild(card(e)));
    if (!items.length) list.appendChild(h('p', { class: 'muted', text: 'Ничего не найдено. Измените фильтры.' }));
  }
  paint();
  return root;
}

function card(e) {
  const g = GROUPS[e.group] || { icon: '🏋️', title: e.group };
  const hasVideo = !!S.state.videos[e.id];
  return h('a', { class: 'ex-card', href: `#/exercise/${e.id}` }, [
    h('span', { class: 'ex-icon', text: g.icon }),
    h('div', { class: 'ex-main' }, [
      h('div', { class: 'ex-name', text: e.name }),
      h('div', { class: 'muted small', text: `${(e.primary || []).join(', ')} · ${(e.eq || []).join(', ')}` })
    ]),
    h('div', { class: 'ex-meta' }, [
      hasVideo ? h('span', { class: 'dot-video', title: 'Видео добавлено', text: '▶' }) : null,
      S.state.favorites.includes(e.id) ? h('span', { class: 'star', text: '★' }) : null,
      h('span', { class: 'lvl', text: '•'.repeat(e.level || 1) })
    ])
  ]);
}

export function renderDetail(id) {
  const e = S.exerciseById(id);
  const root = h('div', { class: 'view' });
  if (!e) { root.appendChild(h('p', { text: 'Упражнение не найдено' })); return root; }

  root.appendChild(h('header', { class: 'view-head' }, [
    h('a', { class: 'back', href: '#/exercises', text: '‹ Упражнения' }),
    h('div', { class: 'row between center' }, [
      h('h1', { text: e.name }),
      h('button', {
        class: 'icon-btn star-btn' + (S.state.favorites.includes(e.id) ? ' on' : ''),
        text: S.state.favorites.includes(e.id) ? '★' : '☆',
        onClick: (ev) => {
          S.toggleFavorite(e.id);
          ev.target.classList.toggle('on');
          ev.target.textContent = S.state.favorites.includes(e.id) ? '★' : '☆';
        }
      })
    ]),
    h('p', { class: 'muted', text: e.en || '' })
  ]));

  // ---- Видео-инструкция
  root.appendChild(videoBlock(e));

  // ---- Мета
  root.appendChild(h('div', { class: 'chips' }, [
    h('span', { class: 'chip', text: `🎯 ${(e.primary || []).join(', ')}` }),
    ...(e.secondary || []).map(m => h('span', { class: 'chip ghost', text: m })),
    h('span', { class: 'chip', text: `🧰 ${(e.eq || []).join(', ')}` }),
    h('span', { class: 'chip', text: `📊 ${LEVELS[e.level] || 'Любой'}` })
  ]));

  // ---- Техника
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Как выполнять' }),
    h('ol', { class: 'steps' }, (e.steps || []).map(s => h('li', { text: s })))
  ]));

  if ((e.mistakes || []).length) root.appendChild(h('section', { class: 'card warn' }, [
    h('h3', { class: 'card-title', text: '⚠️ Частые ошибки' }),
    h('ul', { class: 'bullets' }, e.mistakes.map(s => h('li', { text: s })))
  ]));

  if ((e.tips || []).length) root.appendChild(h('section', { class: 'card tip' }, [
    h('h3', { class: 'card-title', text: '💡 Советы' }),
    h('ul', { class: 'bullets' }, e.tips.map(s => h('li', { text: s })))
  ]));

  // ---- Личные результаты
  const best = S.bestFor(e.id);
  const last = S.lastPerformance(e.id);
  const pts = S.exerciseProgress(e.id);
  if (best || last) {
    const card2 = h('section', { class: 'card' }, [h('h3', { class: 'card-title', text: 'Ваши результаты' })]);
    if (best) card2.appendChild(h('p', { class: 'big-stat', text: `${fmtNum(best.w, 1)} кг × ${best.r} · оценка 1ПМ ${fmtNum(best.e1rm, 1)} кг` }));
    if (last) card2.appendChild(h('p', { class: 'muted small', text: `Последний раз ${fmtDateShort(last.date)}: ` + last.sets.map(s => `${s.w ? s.w + '×' : ''}${s.r}`).join(', ') }));
    if (pts.length > 1) card2.appendChild(lineChart(pts.map(p => ({ label: fmtDateShort(p.t), y: Math.round(p.e1rm) })), { format: v => v + ' кг' }));
    root.appendChild(card2);
  }

  // ---- Альтернативы
  if ((e.alt || []).length) root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Чем заменить' }),
    h('div', { class: 'list' }, e.alt.map(a => {
      const x = S.exerciseById(a);
      return x ? h('a', { class: 'list-row', href: `#/exercise/${a}` }, [
        h('div', { class: 'list-title', text: x.name }), h('span', { class: 'chev', text: '›' })
      ]) : null;
    }).filter(Boolean))
  ]));

  // ---- Действия
  root.appendChild(h('div', { class: 'row gap' }, [
    h('button', {
      class: 'btn block', text: S.state.session ? '+ В текущую тренировку' : '▶︎ Тренировать сейчас',
      onClick: () => {
        const item = {
          exId: e.id, note: '', targetReps: (e.def && e.def.reps) || '8-12',
          targetRest: (e.def && e.def.rest) || S.state.settings.defaultRest,
          sets: Array.from({ length: (e.def && e.def.sets) || 3 }, () => ({ w: null, r: null, done: false, rpe: null, type: 'work' }))
        };
        if (!S.state.session) S.startSession({ title: e.name, items: [item] });
        else { S.state.session.items.push(item); S.save(); }
        location.hash = '#/workout';
      }
    })
  ]));

  if (e.custom) root.appendChild(h('button', {
    class: 'btn ghost danger-text block', text: 'Удалить упражнение', onClick: async () => {
      if (!await confirmDialog('Удалить упражнение?', 'История тренировок сохранится.', 'Удалить')) return;
      S.state.customExercises = S.state.customExercises.filter(x => x.id !== e.id);
      S.save(); location.hash = '#/exercises';
    }
  }));

  return root;
}

function videoBlock(e) {
  const wrap = h('section', { class: 'card video-card' });
  const own = S.state.videos[e.id];

  const head = h('div', { class: 'row between center' }, [
    h('h3', { class: 'card-title', text: '🎬 Видео-инструкция' }),
    h('button', {
      class: 'link', text: own ? 'Изменить' : 'Своя ссылка', onClick: async () => {
        const url = await promptDialog('Ссылка на видео', {
          label: 'YouTube, Vimeo или прямой файл .mp4',
          value: own || '', placeholder: 'https://www.youtube.com/watch?v=…',
          hint: 'Найдите ролик с хорошей техникой и вставьте ссылку — видео будет открываться прямо здесь. Оставьте поле пустым, чтобы удалить.'
        });
        if (url === null) return;
        S.setVideo(e.id, url.trim());
        toast(url.trim() ? 'Видео сохранено' : 'Видео удалено');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    })
  ]);
  wrap.appendChild(head);

  if (own) {
    const player = videoPlayer(own);
    if (player) wrap.appendChild(h('div', { class: 'video-wrap' }, [player]));
  } else {
    wrap.appendChild(h('div', { class: 'video-placeholder' }, [
      h('span', { class: 'vp-icon', text: '▶' }),
      h('p', { class: 'muted small', text: 'Откройте подборку роликов по этому упражнению или прикрепите свою ссылку — она сохранится в приложении.' })
    ]));
  }

  wrap.appendChild(h('div', { class: 'row gap wrap' }, [
    h('a', { class: 'btn small', href: videoSearchUrl(e.search || e.name), target: '_blank', rel: 'noopener', text: '▶ Видео на русском' }),
    h('a', { class: 'btn small ghost', href: videoSearchUrl(e.searchEn || e.en || e.name), target: '_blank', rel: 'noopener', text: 'In English' })
  ]));
  return wrap;
}

async function createCustom() {
  const name = await promptDialog('Новое упражнение', { label: 'Название', placeholder: 'Например: Тяга в наклоне на резине' });
  if (!name) return;
  const ex = {
    id: S.uid('ex'), name: name.trim(), en: '', group: 'chest', level: 1, custom: true,
    eq: ['вес тела'], primary: ['—'], secondary: [], steps: ['Опишите технику в заметках к тренировке.'],
    mistakes: [], tips: [], alt: [], def: { sets: 3, reps: '10-12', rest: 90 },
    search: name + ' техника выполнения', searchEn: name
  };
  S.state.customExercises.push(ex);
  S.save();
  location.hash = `#/exercise/${ex.id}`;
}
