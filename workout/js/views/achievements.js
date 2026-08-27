import { h, plural } from '../ui.js';
import * as S from '../store.js';

export function render() {
  const root = h('div', { class: 'view' });
  const list = S.achievements();
  const done = list.filter(a => a.done).length;

  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Достижения' }),
    h('p', { class: 'muted', text: `Открыто ${done} из ${list.length}` })
  ]));

  root.appendChild(h('div', { class: 'progress-line' }, [
    h('span', { class: 'progress-fill', style: `width:${Math.round(done / list.length * 100)}%` })
  ]));

  root.appendChild(h('div', { class: 'badge-grid' }, list.map(a => h('div', { class: 'badge' + (a.done ? ' on' : '') }, [
    h('span', { class: 'badge-icon', text: a.done ? a.icon : '🔒' }),
    h('span', { class: 'badge-name', text: a.name }),
    h('span', { class: 'badge-desc', text: a.desc })
  ]))));

  const streak = S.streakDays();
  const weeks = S.consecutiveWeeks();
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Текущие серии' }),
    h('div', { class: 'stats' }, [
      tile(String(streak), plural(streak, 'день', 'дня', 'дней'), 'подряд'),
      tile(String(weeks), plural(weeks, 'неделя', 'недели', 'недель'), 'подряд'),
      tile(String(S.state.history.length), 'всего', 'тренировок')
    ])
  ]));

  return root;
}

function tile(v, l, sub) {
  return h('div', { class: 'stat' }, [
    h('div', { class: 'stat-value', text: v }), h('div', { class: 'stat-label', text: l }),
    sub ? h('div', { class: 'stat-sub', text: sub }) : null
  ]);
}
