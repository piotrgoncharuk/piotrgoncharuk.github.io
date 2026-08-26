import { h, fmtNum, fmtDateShort, fmtDuration, emptyState, plural } from '../ui.js';
import { barChart, lineChart, donut } from '../charts.js';
import * as S from '../store.js';
import { GROUPS } from '../data/exercises.js';

const COLORS = ['#4f8cff', '#ff7a45', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444'];

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [h('h1', { text: 'Прогресс' })]));

  if (!S.state.history.length) {
    root.appendChild(emptyState('📈', 'Данных пока нет', 'Статистика появится после первой завершённой тренировки.',
      h('a', { class: 'btn', href: '#/programs', text: 'Начать' })));
    return root;
  }

  const hist = S.state.history;
  const totalVol = hist.reduce((a, s) => a + S.sessionVolume(s), 0);
  const totalTime = hist.reduce((a, s) => a + S.sessionDuration(s), 0);
  const avg = totalTime / hist.length;

  root.appendChild(h('div', { class: 'stats' }, [
    tile(String(hist.length), 'тренировок'),
    tile(fmtNum(totalVol / 1000, 1) + ' т', 'тоннаж'),
    tile(fmtDuration(avg), 'средняя'),
    tile(String(S.streakDays()), plural(S.streakDays(), 'день', 'дня', 'дней'), 'серия')
  ]));

  // объём по неделям
  const vw = S.volumeByWeek(8);
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Тоннаж по неделям' }),
    barChart(vw.map(w => ({ label: w.label, value: Math.round(w.volume / 100) / 10 })), { format: v => v + 'т' })
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Тренировок в неделю' }),
    barChart(vw.map(w => ({ label: w.label, value: w.sessions })), { format: v => v, color: 'var(--accent-2)' })
  ]));

  // распределение по группам
  const groups = S.volumeByGroup(30);
  if (groups.length) {
    const parts = groups.map((g, i) => ({ value: g.sets, color: COLORS[i % COLORS.length] }));
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Баланс за 30 дней' }),
      h('div', { class: 'row gap center' }, [
        donut(parts),
        h('div', { class: 'legend' }, groups.map((g, i) => h('div', { class: 'legend-row' }, [
          h('span', { class: 'legend-dot', style: `background:${COLORS[i % COLORS.length]}` }),
          h('span', { text: (GROUPS[g.group]?.title || g.group) }),
          h('span', { class: 'muted', text: `${g.sets} подх.` })
        ])))
      ]),
      h('p', { class: 'muted small', text: 'Следите, чтобы тянущие и толкающие группы были в балансе.' })
    ]));
  }

  // рекорды
  const prs = S.personalRecords();
  if (prs.length) {
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: '🏆 Личные рекорды' }),
      h('div', { class: 'list' }, prs.slice(0, 15).map(r => h('a', { class: 'list-row', href: `#/exercise/${r.exId}` }, [
        h('div', {}, [
          h('div', { class: 'list-title', text: S.exerciseById(r.exId)?.name || r.exId }),
          h('div', { class: 'muted small', text: `${fmtNum(S.toDisplayWeight(r.w), 1)} ${S.unit()} × ${r.r} · ${fmtDateShort(r.date)}` })
        ]),
        h('div', { class: 'list-value', text: `≈${fmtNum(S.toDisplayWeight(r.e1rm), 1)}` })
      ])))
    ]));
  }

  // прогресс по конкретному упражнению
  const trained = [...new Set(S.state.history.flatMap(s => s.items.map(i => i.exId)))];
  if (trained.length) {
    const sel = h('select', { class: 'input select' }, trained.map(id =>
      h('option', { value: id, text: S.exerciseById(id)?.name || id })));
    const chartBox = h('div');
    const drawChart = () => {
      const pts = S.exerciseProgress(sel.value);
      chartBox.innerHTML = '';
      if (pts.length < 2) chartBox.appendChild(h('p', { class: 'muted small', text: 'Нужно минимум две тренировки с этим упражнением.' }));
      else chartBox.appendChild(lineChart(pts.map(p => ({ label: fmtDateShort(p.t), y: Math.round(S.toDisplayWeight(p.e1rm)) })), { format: v => v + ' ' + S.unit() }));
    };
    sel.addEventListener('change', drawChart);
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Динамика силы (оценка 1ПМ)' }),
      sel, chartBox
    ]));
    drawChart();
  }

  return root;
}

function tile(v, l, sub) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'stat-value', text: v }), h('div', { class: 'stat-label', text: l }),
    sub ? h('div', { class: 'stat-sub', text: sub }) : null
  ]);
}
