import { h, toast, sheet, confirmDialog, promptDialog } from '../ui.js';
import * as S from '../store.js';

export function render() {
  const root = h('div', { class: 'view' });
  const today = S.isoDay();

  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'План недели' }),
    h('p', { class: 'muted', text: 'Распишите, что в какой день: футбол, день программы, своя тренировка или отдых. План повторяется каждую неделю, а на Главной видно, что сегодня.' })
  ]));

  // Быстрые пресеты
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Быстрая настройка' }),
    h('div', { class: 'row gap wrap' }, [
      preset('⚽️ Футбол: Чт и Сб', () => S.setFootballDays([4, 6])),
      preset('⚽️ Футбол: Вт и Чт', () => S.setFootballDays([2, 4])),
      preset('⚽️ Футбол: Сб', () => S.setFootballDays([6])),
      S.state.activeProgram ? preset('🏋️ Заполнить программой', fillWithProgram) : null,
      preset('🧹 Очистить', async () => {
        if (!await confirmDialog('Очистить план?', 'Все дни станут пустыми.', 'Очистить')) return false;
        S.state.schedule = {}; S.save();
        return true;
      })
    ].filter(Boolean)),
    h('p', { class: 'muted small', text: 'Пресет заполняет выбранные дни футболом. Остальные дни можно расставить вручную ниже.' })
  ]));

  // Дни недели
  const list = h('div', { class: 'list' });
  S.WEEKDAYS.forEach(d => {
    const entry = S.planFor(d.n);
    const label = S.planLabel(entry);
    list.appendChild(h('button', {
      class: 'list-row btn-row plan-row' + (d.n === today ? ' today' : ''),
      onClick: () => dayMenu(d)
    }, [
      h('span', { class: 'plan-day', text: d.short }),
      h('div', { class: 'grow' }, [
        h('div', { class: 'list-title', text: label ? `${label.icon} ${label.title}` : 'Не задано' }),
        h('div', { class: 'muted small', text: label && label.sub ? label.sub : (d.n === today ? 'Сегодня' : 'Нажмите, чтобы выбрать') })
      ]),
      h('span', { class: 'chev', text: '›' })
    ]));
  });
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Дни недели' }),
    list
  ]));

  const fbDays = S.WEEKDAYS.filter(d => { const e = S.planFor(d.n); return e && e.type === 'football'; });
  if (fbDays.length) root.appendChild(h('section', { class: 'card tip' }, [
    h('h3', { class: 'card-title', text: '⚽️ Футбол в плане' }),
    h('p', { class: 'small', text: `Игровые дни: ${fbDays.map(d => d.full.toLowerCase()).join(', ')}.` }),
    h('p', { class: 'muted small', text: 'Тренер учитывает это: накануне не предложит тяжёлые ноги, а на следующий день — восстановление. Спросите его во вкладке «Тренер».' }),
    h('a', { class: 'btn small', href: '#/coach', text: 'Спросить тренера' })
  ]));

  return root;
}

function preset(label, fn) {
  return h('button', {
    class: 'chip tap', text: label, onClick: async () => {
      const res = await fn();
      if (res === false) return;
      toast('План обновлён');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
}

function fillWithProgram() {
  const p = S.programById(S.state.activeProgram.id);
  if (!p) return false;
  // Раскладываем дни программы по неделе с равными промежутками, оставляя воскресенье на отдых.
  const slots = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] }[Math.min(7, p.days.length)] || [1, 3, 5];
  const taken = new Set(S.WEEKDAYS.filter(d => { const e = S.planFor(d.n); return e && e.type === 'football'; }).map(d => d.n));
  let di = 0;
  slots.forEach(day => {
    if (taken.has(day)) return;                       // футбольные дни не трогаем
    S.setPlan(day, { type: 'program', programId: p.id, dayIndex: di % p.days.length });
    di++;
  });
  S.WEEKDAYS.forEach(d => { if (!S.planFor(d.n)) S.setPlan(d.n, { type: 'rest' }); });
  return true;
}

function dayMenu(day) {
  const rows = [];
  const set = (entry) => { S.setPlan(day.n, entry); sh.close(); toast(`${day.full}: обновлено`); window.dispatchEvent(new HashChangeEvent('hashchange')); };

  Object.entries(S.FOOTBALL_TYPES).forEach(([key, t]) => {
    rows.push(h('button', { class: 'list-row btn-row', text: `${t.icon} ${t.name}`, onClick: () => set({ type: 'football', fbType: key }) }));
  });

  const ap = S.state.activeProgram ? S.programById(S.state.activeProgram.id) : null;
  if (ap) {
    rows.push(h('div', { class: 'list-head', text: `Программа «${ap.name}»` }));
    ap.days.forEach((d, i) => rows.push(h('button', {
      class: 'list-row btn-row', text: `🏋️ ${d.title}`, onClick: () => set({ type: 'program', programId: ap.id, dayIndex: i })
    })));
    rows.push(h('button', { class: 'list-row btn-row', text: '🔁 Следующий день программы', onClick: () => set({ type: 'program_auto' }) }));
  }

  rows.push(h('div', { class: 'list-head', text: 'Другое' }));
  rows.push(h('button', {
    class: 'list-row btn-row', text: '📝 Своя тренировка (заметка)', onClick: async () => {
      sh.close();
      const t = await promptDialog(day.full, { label: 'Что в этот день', placeholder: 'Например: бассейн' });
      if (t && t.trim()) { S.setPlan(day.n, { type: 'note', text: t.trim() }); toast('Сохранено'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    }
  }));
  rows.push(h('button', { class: 'list-row btn-row', text: '😴 Отдых', onClick: () => set({ type: 'rest' }) }));
  rows.push(h('button', { class: 'list-row btn-row danger-text', text: '✕ Очистить день', onClick: () => set(null) }));

  const sh = sheet(day.full, h('div', { class: 'list' }, rows), { wide: true });
}
