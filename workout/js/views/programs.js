import { h, segmented, toast, confirmDialog, plural } from '../ui.js';
import * as S from '../store.js';
import { LEVELS } from '../data/exercises.js';

let filter = { place: 'all', level: 'all' };

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Программы' }),
    h('p', { class: 'muted', text: 'Готовые планы на 4–12 недель. Выберите одну — приложение будет вести вас по дням.' })
  ]));

  root.appendChild(segmented([
    { value: 'all', label: 'Все' }, { value: 'Зал', label: 'Зал' },
    { value: 'Дом', label: 'Дом' }, { value: 'my', label: 'Мои' }
  ], filter.place, v => { filter.place = v; rerender(root); }));

  const list = h('div', { class: 'prog-list' });
  root.appendChild(list);
  fill(list);
  return root;
}

function rerender(root) {
  const list = root.querySelector('.prog-list');
  list.innerHTML = '';
  root.querySelectorAll('.segmented .seg').forEach((b, i) => {
    const vals = ['all', 'Зал', 'Дом', 'my'];
    b.classList.toggle('active', vals[i] === filter.place);
  });
  fill(list);
}

function fill(list) {
  let items = S.allPrograms();
  if (filter.place === 'my') items = items.filter(p => p.custom);
  else if (filter.place !== 'all') items = items.filter(p => (p.place || '').includes(filter.place));

  if (!items.length) {
    list.appendChild(h('div', { class: 'empty' }, [
      h('div', { class: 'empty-icon', text: '📋' }),
      h('h3', { text: 'Пусто' }),
      h('p', { class: 'muted', text: 'Здесь появятся ваши программы.' }),
      h('a', { class: 'btn', href: '#/builder', text: 'Создать программу' })
    ]));
    return;
  }

  items.forEach(p => {
    const active = S.state.activeProgram && S.state.activeProgram.id === p.id;
    list.appendChild(h('a', { class: 'prog-card' + (active ? ' active' : ''), href: `#/program/${p.id}`, style: `--tint:${p.color || 'var(--accent)'}` }, [
      h('div', { class: 'prog-top' }, [
        h('h3', { text: p.name }),
        active ? h('span', { class: 'pill', text: 'активна' }) : null
      ]),
      h('p', { class: 'muted small', text: p.short || p.goal }),
      h('div', { class: 'chips' }, [
        h('span', { class: 'chip', text: `${p.daysPerWeek}× в неделю` }),
        h('span', { class: 'chip', text: `${p.weeks} нед.` }),
        h('span', { class: 'chip', text: LEVELS[p.level] || 'Любой' }),
        h('span', { class: 'chip', text: p.place || 'Зал' })
      ])
    ]));
  });
}

export function renderDetail(id) {
  const p = S.programById(id);
  const root = h('div', { class: 'view' });
  if (!p) { root.appendChild(h('p', { text: 'Программа не найдена' })); return root; }

  const active = S.state.activeProgram && S.state.activeProgram.id === p.id;

  root.appendChild(h('header', { class: 'view-head' }, [
    h('a', { class: 'back', href: '#/programs', text: '‹ Программы' }),
    h('h1', { text: p.name }),
    h('p', { class: 'muted', text: p.about || p.short })
  ]));

  root.appendChild(h('div', { class: 'chips' }, [
    h('span', { class: 'chip', text: `🎯 ${p.goal}` }),
    h('span', { class: 'chip', text: `📅 ${p.daysPerWeek}× в неделю` }),
    h('span', { class: 'chip', text: `⏳ ${p.weeks} недель` }),
    h('span', { class: 'chip', text: `🏋️ ${LEVELS[p.level] || ''}` }),
    h('span', { class: 'chip', text: `📍 ${p.place || 'Зал'}` })
  ]));

  root.appendChild(h('div', { class: 'row gap sticky-actions' }, [
    h('button', {
      class: 'btn' + (active ? ' ghost' : ''), text: active ? 'Программа активна' : 'Выбрать программу',
      onClick: () => {
        S.state.activeProgram = active ? null : { id: p.id, startedAt: Date.now(), nextDay: 0, done: 0 };
        S.save();
        toast(active ? 'Программа отключена' : 'Программа выбрана — вперёд!');
        location.hash = '#/';
      }
    }),
    p.custom ? h('a', { class: 'btn ghost', href: `#/builder/${p.id}`, text: 'Изменить' }) : null,
    p.custom ? h('button', {
      class: 'btn ghost danger-text', text: 'Удалить', onClick: async () => {
        if (!await confirmDialog('Удалить программу?', 'Действие нельзя отменить.', 'Удалить')) return;
        S.state.customPrograms = S.state.customPrograms.filter(x => x.id !== p.id);
        if (S.state.activeProgram && S.state.activeProgram.id === p.id) S.state.activeProgram = null;
        S.save(); location.hash = '#/programs';
      }
    }) : null
  ]));

  if (p.progression) root.appendChild(infoCard('📈 Как прогрессировать', p.progression));
  if (p.schedule) root.appendChild(infoCard('🗓 Расписание', p.schedule));

  p.days.forEach((day, di) => {
    const items = h('div', { class: 'list' });
    day.items.forEach(i => {
      const ex = S.exerciseById(i.id);
      items.appendChild(h('a', { class: 'list-row', href: `#/exercise/${i.id}` }, [
        h('div', {}, [
          h('div', { class: 'list-title', text: (ex ? ex.name : i.id) + (i.ss ? ' ⟲' : '') }),
          h('div', { class: 'muted small', text: `${i.sets} × ${i.reps} · отдых ${i.rest} с${i.note ? ' · ' + i.note : ''}` })
        ]),
        h('span', { class: 'chev', text: '›' })
      ]));
    });

    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('div', {}, [
          h('h3', { class: 'card-title', text: day.title }),
          h('p', { class: 'muted small', text: day.focus })
        ]),
        h('button', {
          class: 'btn small', text: 'Старт', onClick: async () => {
            if (S.state.session && !await confirmDialog('Есть незавершённая тренировка', 'Начать новую? Текущая будет потеряна.', 'Начать новую')) return;
            S.startSession({ programId: p.id, dayIndex: di });
            location.hash = '#/workout';
          }
        })
      ]),
      items,
      h('p', { class: 'muted small', text: `${day.items.length} ${plural(day.items.length, 'упражнение', 'упражнения', 'упражнений')} · примерно ${estimateMinutes(day)} мин` })
    ]));
  });

  return root;
}

function estimateMinutes(day) {
  let sec = 0;
  day.items.forEach(i => { sec += i.sets * (40 + (i.rest || 60)); });
  return Math.round(sec / 60);
}

function infoCard(title, text) {
  return h('section', { class: 'card info' }, [
    h('h3', { class: 'card-title', text: title }),
    h('p', { class: 'muted small', text })
  ]);
}
