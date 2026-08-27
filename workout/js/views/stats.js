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

  // ---- тренировочная нагрузка
  const load = S.acwr();
  const lw = S.loadByWeek(8);
  const zoneText = {
    none: ['Копим данные', 'Соотношение появится, когда наберётся около месяца регулярных занятий — раньше оно вводит в заблуждение.'],
    low:  ['Снижена', 'Объём ниже привычного. Хорошо для разгрузочной недели, но не как норма.'],
    ok:   ['В норме', 'Идеальный коридор: нагрузка растёт плавно (0.8–1.3).'],
    warn: ['Растёт быстро', 'Вы на верхней границе. Следите за сном, питанием и болями.'],
    high: ['Скачок', 'Резкий рост объёма — самый частый предвестник травмы. Сделайте лёгкую неделю.']
  }[load.zone];

  root.appendChild(h('section', { class: 'card' }, [
    h('div', { class: 'row between center' }, [
      h('h3', { class: 'card-title', text: 'Тренировочная нагрузка' }),
      h('span', { class: 'pill zone-' + load.zone, text: zoneText[0] })
    ]),
    barChart(lw.map(w => ({ label: w.label, value: w.load })), { format: v => v >= 1000 ? Math.round(v / 100) / 10 + 'к' : String(v), color: 'var(--accent-2)' }),
    h('div', { class: 'stats' }, [
      tile(String(load.acute), 'за 7 дней'),
      tile(String(load.chronic), 'средняя неделя'),
      tile(load.ratio !== null ? load.ratio.toFixed(2) : '—', 'соотношение')
    ]),
    h('p', { class: 'muted small', text: zoneText[1] }),
    h('p', { class: 'muted small', text: 'Нагрузка = тяжесть занятия (1–10) × минуты. Методику используют в профессиональном спорте, чтобы вовремя заметить перегруз.' })
  ]));

  // ---- футбол
  const fb = S.footballStats();
  if (fb.total) {
    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: '⚽️ Футбол' }),
        h('a', { class: 'link', href: '#/football', text: 'Записать' })
      ]),
      h('div', { class: 'stats' }, [
        tile(String(fb.total), 'занятий'),
        tile(String(fb.matches), 'матчей'),
        tile(String(fb.goals), 'голов'),
        tile(String(fb.assists), 'передач'),
        tile(Math.round(fb.minutes / 60) + ' ч', 'на поле'),
        fb.distance ? tile(fmtNum(fb.distance, 1) + ' км', 'пробежано') : null
      ].filter(Boolean)),
      fb.matches ? h('p', { class: 'muted small', text: `Матчи: ${fb.wins} побед · ${fb.draws} ничьих · ${fb.losses} поражений` +
        (fb.matches && fb.goals ? ` · ${(fb.goals / fb.matches).toFixed(2)} гола за матч` : '') }) : null
    ]));
  }

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

  // ---- достижения
  const badges = S.achievements();
  const opened = badges.filter(b => b.done);
  root.appendChild(h('section', { class: 'card' }, [
    h('div', { class: 'row between center' }, [
      h('h3', { class: 'card-title', text: '🏆 Достижения' }),
      h('a', { class: 'link', href: '#/achievements', text: `${opened.length} из ${badges.length}` })
    ]),
    h('div', { class: 'scroll-chips' }, (opened.length ? opened : badges).slice(-8).map(b =>
      h('span', { class: 'badge-mini' + (b.done ? ' on' : ''), title: b.desc }, [
        h('span', { text: b.done ? b.icon : '🔒' }), h('span', { class: 'tiny', text: b.name })
      ])))
  ]));

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
