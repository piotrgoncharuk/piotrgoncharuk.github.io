import { h, fmtDate, fmtDuration, fmtNum, fmtTime, emptyState, confirmDialog, plural } from '../ui.js';
import * as S from '../store.js';

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [h('h1', { text: 'История' })]));

  const hist = [...S.state.history].reverse();
  if (!hist.length) {
    root.appendChild(emptyState('📓', 'История пуста', 'Завершите первую тренировку — она появится здесь.',
      h('a', { class: 'btn', href: '#/programs', text: 'К программам' })));
    return root;
  }

  root.appendChild(calendar());

  const total = S.state.history.reduce((a, s) => a + S.sessionVolume(s), 0);
  const totalTime = S.state.history.reduce((a, s) => a + S.sessionDuration(s), 0);
  root.appendChild(h('div', { class: 'stats' }, [
    tile(String(S.state.history.length), 'тренировок'),
    tile(fmtNum(total / 1000, 1) + ' т', 'общий тоннаж'),
    tile(fmtDuration(totalTime), 'в зале')
  ]));

  let month = '';
  const list = h('div', { class: 'stack' });
  hist.forEach(s => {
    const t = s.endedAt || s.startedAt;
    const m = new Date(t).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; list.appendChild(h('h3', { class: 'month-head', text: m })); }
    list.appendChild(h('a', { class: 'card hist-row', href: `#/history/${s.id}` }, [
      h('div', { class: 'row between center' }, [
        h('div', {}, [
          h('div', { class: 'list-title', text: s.title }),
          h('div', { class: 'muted small', text: `${fmtDate(t)} · ${fmtTime(t)}` })
        ]),
        h('span', { class: 'chev', text: '›' })
      ]),
      h('div', { class: 'chips' }, [
        h('span', { class: 'chip', text: fmtDuration(S.sessionDuration(s)) }),
        h('span', { class: 'chip', text: `${S.sessionSets(s)} подх.` }),
        h('span', { class: 'chip', text: `${fmtNum(S.sessionVolume(s))} кг` })
      ])
    ]));
  });
  root.appendChild(list);
  return root;
}

function tile(v, l) { return h('div', { class: 'stat' }, [h('div', { class: 'stat-value', text: v }), h('div', { class: 'stat-label', text: l })]); }

function calendar() {
  const days = S.trainingDays();
  const wrap = h('section', { class: 'card' }, [h('h3', { class: 'card-title', text: 'Последние 12 недель' })]);
  const grid = h('div', { class: 'heat' });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - 11 * 7);
  for (let w = 0; w < 12; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      const key = S.dayKey(dt.getTime());
      const future = dt > today;
      grid.appendChild(h('span', {
        class: 'heat-cell' + (days.has(key) ? ' on' : '') + (future ? ' future' : ''),
        title: dt.toLocaleDateString('ru-RU')
      }));
    }
  }
  wrap.appendChild(grid);
  wrap.appendChild(h('p', { class: 'muted small', text: `Серия: ${S.streakDays()} ${plural(S.streakDays(), 'день', 'дня', 'дней')} подряд` }));
  return wrap;
}

export function renderDetail(id) {
  const s = S.state.history.find(x => x.id === id);
  const root = h('div', { class: 'view' });
  if (!s) { root.appendChild(h('p', { text: 'Тренировка не найдена' })); return root; }
  const t = s.endedAt || s.startedAt;

  root.appendChild(h('header', { class: 'view-head' }, [
    h('a', { class: 'back', href: '#/history', text: '‹ История' }),
    h('h1', { text: s.title }),
    h('p', { class: 'muted', text: `${fmtDate(t)} в ${fmtTime(t)}` })
  ]));

  root.appendChild(h('div', { class: 'stats' }, [
    tile(fmtDuration(S.sessionDuration(s)), 'время'),
    tile(String(S.sessionSets(s)), 'подходов'),
    tile(fmtNum(S.sessionVolume(s)) + ' кг', 'тоннаж'),
    tile(String(S.sessionReps(s)), 'повторов')
  ]));

  s.items.forEach(i => {
    const ex = S.exerciseById(i.exId);
    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: ex ? ex.name : i.exId }),
        ex ? h('a', { class: 'link', href: `#/exercise/${i.exId}`, text: 'техника' }) : null
      ]),
      i.note ? h('p', { class: 'muted small', text: i.note }) : null,
      h('div', { class: 'sets' }, i.sets.filter(x => x.done).map((x, n) => h('div', { class: 'set-row done' }, [
        h('span', { class: 'set-n', text: x.type === 'warmup' ? 'Р' : String(n + 1) }),
        h('span', { class: 'cell-static', text: x.w ? `${fmtNum(S.toDisplayWeight(x.w), 1)} ${S.unit()}` : '—' }),
        h('span', { class: 'cell-static', text: `${x.r} повт.` }),
        h('span', { class: 'cell-static muted', text: x.w && x.r ? `≈${fmtNum(S.e1rm(x.w, x.r), 1)}` : '' })
      ])))
    ]));
  });

  if (s.notes) root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Заметки' }), h('p', { text: s.notes })
  ]));

  root.appendChild(h('div', { class: 'row gap' }, [
    h('button', {
      class: 'btn block', text: '🔁 Повторить тренировку', onClick: () => {
        S.startSession({
          programId: s.programId, dayIndex: s.dayIndex, title: s.title,
          items: s.items.map(i => ({
            exId: i.exId, note: i.note, targetReps: i.targetReps, targetRest: i.targetRest,
            sets: i.sets.map(x => ({ w: x.w, r: null, done: false, type: x.type || 'work' }))
          }))
        });
        location.hash = '#/workout';
      }
    }),
    h('button', {
      class: 'btn ghost danger-text', text: 'Удалить', onClick: async () => {
        if (!await confirmDialog('Удалить тренировку?', 'Она исчезнет из истории и статистики.', 'Удалить')) return;
        S.deleteHistory(s.id); location.hash = '#/history';
      }
    })
  ]));

  return root;
}
