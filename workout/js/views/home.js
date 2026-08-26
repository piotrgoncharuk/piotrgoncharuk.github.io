import { h, statTile, fmtDuration, fmtNum, plural, fmtDateShort, toast } from '../ui.js';
import { barChart } from '../charts.js';
import * as S from '../store.js';

function greeting() {
  const hh = new Date().getHours();
  if (hh < 5) return 'Доброй ночи';
  if (hh < 12) return 'Доброе утро';
  if (hh < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function render() {
  const st = S.state;
  const week = S.thisWeekSessions();
  const weekVol = week.reduce((a, s) => a + S.sessionVolume(s), 0);
  const streak = S.streakDays();
  const goal = st.settings.weeklyGoal || 3;
  const pct = Math.min(100, Math.round(week.length / goal * 100));

  const root = h('div', { class: 'view' });

  root.appendChild(h('header', { class: 'hero' }, [
    h('p', { class: 'hero-sub', text: `${greeting()}${st.settings.name ? ', ' + st.settings.name : ''}!` }),
    h('h1', { class: 'hero-title', text: week.length ? 'Так держать 💪' : 'Начнём тренировку?' })
  ]));

  // Первый запуск — короткая подсказка
  if (!st.history.length && !st.seenHelp) {
    root.appendChild(h('a', { class: 'card info', href: '#/help' }, [
      h('div', { class: 'row between center' }, [
        h('div', { class: 'grow' }, [
          h('h3', { class: 'card-title', text: '❓ Первый раз здесь?' }),
          h('p', { class: 'muted small', text: 'Шесть шагов до первой тренировки, установка иконки на телефон и ответы на частые вопросы.' })
        ]),
        h('span', { class: 'chev', text: '›' })
      ])
    ]));
  }

  // Пора сделать резервную копию
  if (S.needsBackup()) {
    root.appendChild(h('section', { class: 'card warn' }, [
      h('h3', { class: 'card-title', text: '💾 Сделайте резервную копию' }),
      h('p', { class: 'muted small', text: 'История хранится только на этом устройстве. Сохраните файл в iCloud или отправьте себе — восстановить можно в пару нажатий.' }),
      h('div', { class: 'row gap wrap' }, [
        h('button', { class: 'btn small', text: '⬇️ Сохранить копию', onClick: () => { S.downloadBackup(); toast('Копия сохранена'); window.dispatchEvent(new HashChangeEvent('hashchange')); } }),
        h('button', { class: 'btn small ghost', text: 'Позже', onClick: () => { S.state.backupSnooze = Date.now(); S.save(); window.dispatchEvent(new HashChangeEvent('hashchange')); } })
      ])
    ]));
  }

  // Незавершённая тренировка
  if (st.session) {
    root.appendChild(h('a', { class: 'card accent-card', href: '#/workout' }, [
      h('div', { class: 'row between' }, [
        h('div', {}, [
          h('div', { class: 'card-kicker', text: 'Тренировка идёт' }),
          h('h3', { class: 'card-title', text: st.session.title })
        ]),
        h('span', { class: 'pill live', text: '● LIVE' })
      ]),
      h('p', { class: 'muted small', text: `Начата в ${new Date(st.session.startedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} · продолжить →` })
    ]));
  }

  // Следующая тренировка по программе
  const ap = st.activeProgram;
  const prog = ap ? S.programById(ap.id) : null;
  if (prog) {
    const di = (ap.nextDay || 0) % prog.days.length;
    const day = prog.days[di];
    root.appendChild(h('section', { class: 'card program-next', style: `--tint:${prog.color || 'var(--accent)'}` }, [
      h('div', { class: 'card-kicker', text: 'Следующая по программе' }),
      h('h3', { class: 'card-title', text: `${prog.name} · ${day.title}` }),
      h('p', { class: 'muted small', text: day.focus }),
      h('div', { class: 'chips' }, day.items.slice(0, 4).map(i => {
        const ex = S.exerciseById(i.id);
        return h('span', { class: 'chip', text: ex ? ex.name : i.id });
      }).concat(day.items.length > 4 ? [h('span', { class: 'chip', text: `+${day.items.length - 4}` })] : [])),
      h('div', { class: 'row gap' }, [
        h('button', {
          class: 'btn', text: 'Начать тренировку', onClick: () => {
            if (st.session && !confirm('Есть незавершённая тренировка. Начать новую?')) return;
            S.startSession({ programId: prog.id, dayIndex: di });
            location.hash = '#/workout';
          }
        }),
        h('a', { class: 'btn ghost', href: `#/program/${prog.id}`, text: 'План' })
      ])
    ]));
  } else {
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Выберите программу' }),
      h('p', { class: 'muted small', text: '10 готовых программ: зал, дом, сила, жиросжигание, мобильность. Или соберите свою.' }),
      h('div', { class: 'row gap' }, [
        h('a', { class: 'btn', href: '#/programs', text: 'Смотреть программы' }),
        h('a', { class: 'btn ghost', href: '#/builder', text: 'Своя' })
      ])
    ]));
  }

  // Недельная цель
  root.appendChild(h('section', { class: 'card' }, [
    h('div', { class: 'row between center' }, [
      h('div', {}, [
        h('h3', { class: 'card-title', text: 'Цель недели' }),
        h('p', { class: 'muted small', text: `${week.length} из ${goal} ${plural(goal, 'тренировки', 'тренировок', 'тренировок')}` })
      ]),
      h('div', { class: 'ring', style: `--p:${pct}` }, h('span', { text: pct + '%' }))
    ]),
    h('div', { class: 'stats' }, [
      statTile(String(streak), plural(streak, 'день', 'дня', 'дней'), 'серия подряд'),
      statTile(fmtNum(weekVol / 1000, 1) + ' т', 'тоннаж', 'за неделю'),
      statTile(String(st.history.length), 'всего', 'тренировок')
    ])
  ]));

  // Быстрые действия
  root.appendChild(h('section', { class: 'quick-grid' }, [
    quickTile('⚡️', 'Пустая тренировка', () => {
      S.startSession({ title: 'Своя тренировка', items: [] });
      location.hash = '#/workout';
    }),
    quickTile('⏱', 'Таймеры', () => { location.hash = '#/tools'; }),
    quickTile('🎬', 'Упражнения', () => { location.hash = '#/exercises'; }),
    quickTile('📈', 'Прогресс', () => { location.hash = '#/stats'; }),
    quickTile('❓', 'Как пользоваться', () => { location.hash = '#/help'; }),
    quickTile('🔁', 'Повторить последнюю', () => {
      const last = st.history[st.history.length - 1];
      if (!last) return toast('Истории пока нет');
      S.startSession({
        programId: last.programId, dayIndex: last.dayIndex, title: last.title,
        items: last.items.map(i => ({
          exId: i.exId, note: i.note, targetReps: i.targetReps, targetRest: i.targetRest, ss: i.ss,
          sets: i.sets.map(s => ({ w: s.w, r: null, done: false, rpe: null, type: s.type || 'work' }))
        }))
      });
      location.hash = '#/workout';
    })
  ]));

  // График объёма
  const vw = S.volumeByWeek(6);
  if (st.history.length) {
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Тоннаж по неделям' }),
      barChart(vw.map(w => ({ label: w.label, value: Math.round(w.volume / 1000) })), { format: v => v + 'т' }),
      h('p', { class: 'muted small', text: 'Сумма вес × повторы за каждую неделю, в тоннах.' })
    ]));
  }

  // История
  const recent = st.history.slice(-3).reverse();
  if (recent.length) {
    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: 'Последние тренировки' }),
        h('a', { class: 'link', href: '#/history', text: 'Все' })
      ]),
      h('div', { class: 'list' }, recent.map(s => h('a', { class: 'list-row', href: `#/history/${s.id}` }, [
        h('div', {}, [
          h('div', { class: 'list-title', text: s.title }),
          h('div', { class: 'muted small', text: `${fmtDateShort(s.endedAt || s.startedAt)} · ${fmtDuration(S.sessionDuration(s))} · ${S.sessionSets(s)} подх.` })
        ]),
        h('div', { class: 'list-value', text: fmtNum(S.sessionVolume(s)) + ' кг' })
      ])))
    ]));
  }

  return root;
}

function quickTile(icon, label, onClick) {
  return h('button', { class: 'quick', onClick }, [
    h('span', { class: 'quick-icon', text: icon }),
    h('span', { class: 'quick-label', text: label })
  ]);
}
