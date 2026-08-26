import { h, toast, promptDialog, confirmDialog, sheet, emptyState } from '../ui.js';
import * as S from '../store.js';

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Мои программы' }),
    h('p', { class: 'muted', text: 'Соберите собственный план: дни, упражнения, подходы и время отдыха.' })
  ]));

  root.appendChild(h('button', {
    class: 'btn block', text: '+ Новая программа', onClick: async () => {
      const name = await promptDialog('Название программы', { placeholder: 'Например: Мой сплит' });
      if (!name) return;
      const p = {
        id: S.uid('prog'), name: name.trim(), custom: true, short: 'Своя программа', goal: 'Своя цель',
        level: 2, daysPerWeek: 3, weeks: 8, place: 'Своё', color: '#4f8cff', equipment: [],
        about: '', progression: '', schedule: '',
        days: [{ title: 'День 1', focus: '', items: [] }]
      };
      S.state.customPrograms.push(p); S.save();
      location.hash = `#/builder/${p.id}`;
    }
  }));

  const mine = S.state.customPrograms;
  if (!mine.length) {
    root.appendChild(emptyState('🧩', 'Пока пусто', 'Создайте программу с нуля или скопируйте готовую, чтобы изменить под себя.'));
  } else {
    root.appendChild(h('div', { class: 'list' }, mine.map(p => h('a', { class: 'list-row', href: `#/builder/${p.id}` }, [
      h('div', {}, [
        h('div', { class: 'list-title', text: p.name }),
        h('div', { class: 'muted small', text: `${p.days.length} дн. · ${p.days.reduce((a, d) => a + d.items.length, 0)} упражнений` })
      ]),
      h('span', { class: 'chev', text: '›' })
    ]))));
  }

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Скопировать готовую программу' }),
    h('p', { class: 'muted small', text: 'Возьмите любую программу за основу и подстройте под свой инвентарь и график.' }),
    h('div', { class: 'list' }, S.allPrograms().filter(p => !p.custom).map(p => h('button', {
      class: 'list-row btn-row', onClick: () => {
        const copy = JSON.parse(JSON.stringify(p));
        copy.id = S.uid('prog'); copy.name = p.name + ' (моя)'; copy.custom = true;
        S.state.customPrograms.push(copy); S.save();
        location.hash = `#/builder/${copy.id}`;
      }
    }, [h('span', { class: 'list-title', text: p.name }), h('span', { class: 'chev', text: '+' })])))
  ]));

  return root;
}

export function renderEditor(id) {
  const p = S.state.customPrograms.find(x => x.id === id);
  const root = h('div', { class: 'view' });
  if (!p) { root.appendChild(h('p', { text: 'Программа не найдена' })); return root; }

  const rerender = () => { S.save(); window.dispatchEvent(new HashChangeEvent('hashchange')); };

  root.appendChild(h('header', { class: 'view-head' }, [
    h('a', { class: 'back', href: '#/builder', text: '‹ Мои программы' }),
    h('h1', { text: p.name })
  ]));

  const nameIn = h('input', { class: 'input', value: p.name });
  nameIn.addEventListener('change', () => { p.name = nameIn.value.trim() || p.name; S.save(); });
  const aboutIn = h('textarea', { class: 'input area', rows: 2, placeholder: 'Описание программы' });
  aboutIn.value = p.about || '';
  aboutIn.addEventListener('change', () => { p.about = aboutIn.value; S.save(); });

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Основное' }),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Название' }), nameIn]),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Описание' }), aboutIn]),
    h('div', { class: 'grid-2' }, [
      num('Дней в неделю', p.daysPerWeek, v => { p.daysPerWeek = v; S.save(); }),
      num('Недель', p.weeks, v => { p.weeks = v; S.save(); })
    ])
  ]));

  p.days.forEach((day, di) => {
    const items = h('div', { class: 'list' });
    day.items.forEach((it, ii) => {
      const ex = S.exerciseById(it.id);
      items.appendChild(h('div', { class: 'list-row' }, [
        h('div', { class: 'grow' }, [
          h('div', { class: 'list-title', text: ex ? ex.name : it.id }),
          h('div', { class: 'row gap tiny' }, [
            miniNum(it.sets, v => { it.sets = v; S.save(); }, 'подх.'),
            miniText(it.reps, v => { it.reps = v; S.save(); }, 'повт.'),
            miniNum(it.rest, v => { it.rest = v; S.save(); }, 'сек')
          ])
        ]),
        h('div', { class: 'row' }, [
          ii > 0 ? h('button', { class: 'icon-btn', text: '↑', onClick: () => { day.items.splice(ii - 1, 0, day.items.splice(ii, 1)[0]); rerender(); } }) : null,
          h('button', { class: 'icon-btn', text: '✕', onClick: () => { day.items.splice(ii, 1); rerender(); } })
        ])
      ]));
    });

    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: day.title }),
        h('div', { class: 'row' }, [
          h('button', {
            class: 'icon-btn', text: '✎', onClick: async () => {
              const t = await promptDialog('Название дня', { value: day.title });
              if (t) { day.title = t; const f = await promptDialog('Фокус дня', { value: day.focus || '', placeholder: 'Например: грудь и трицепс' }); day.focus = f || ''; rerender(); }
            }
          }),
          p.days.length > 1 ? h('button', {
            class: 'icon-btn danger-text', text: '🗑', onClick: async () => {
              if (!await confirmDialog('Удалить день?', day.title, 'Удалить')) return;
              p.days.splice(di, 1); rerender();
            }
          }) : null
        ])
      ]),
      day.focus ? h('p', { class: 'muted small', text: day.focus }) : null,
      items,
      h('button', { class: 'btn ghost block', text: '+ Упражнение', onClick: () => picker(day, rerender) })
    ]));
  });

  root.appendChild(h('button', {
    class: 'btn ghost block', text: '+ Добавить день', onClick: () => {
      p.days.push({ title: `День ${p.days.length + 1}`, focus: '', items: [] }); rerender();
    }
  }));

  root.appendChild(h('div', { class: 'row gap' }, [
    h('a', { class: 'btn block', href: `#/program/${p.id}`, text: 'Открыть программу' }),
    h('button', {
      class: 'btn ghost danger-text', text: 'Удалить', onClick: async () => {
        if (!await confirmDialog('Удалить программу?', p.name, 'Удалить')) return;
        S.state.customPrograms = S.state.customPrograms.filter(x => x.id !== p.id);
        if (S.state.activeProgram?.id === p.id) S.state.activeProgram = null;
        S.save(); location.hash = '#/builder';
      }
    })
  ]));

  return root;
}

function picker(day, done) {
  const input = h('input', { class: 'input search', type: 'search', placeholder: '🔍 Поиск упражнения…' });
  const results = h('div', { class: 'list scroll-list' });
  const sh = sheet('Добавить упражнение', h('div', { class: 'stack' }, [input, results]), { wide: true });
  function paint() {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = '';
    S.allExercises()
      .filter(e => !q || e.name.toLowerCase().includes(q) || (e.en || '').toLowerCase().includes(q))
      .slice(0, 60)
      .forEach(e => results.appendChild(h('button', {
        class: 'list-row btn-row', onClick: () => {
          day.items.push({ id: e.id, sets: e.def?.sets || 3, reps: e.def?.reps || '10-12', rest: e.def?.rest ?? 90, note: '', ss: null });
          sh.close(); done();
        }
      }, [h('div', {}, [h('div', { class: 'list-title', text: e.name }), h('div', { class: 'muted small', text: (e.primary || []).join(', ') })])])));
  }
  input.addEventListener('input', paint); paint();
  setTimeout(() => input.focus(), 250);
}

function num(label, value, onChange) {
  const i = h('input', { class: 'input', type: 'number', value: String(value) });
  i.addEventListener('change', () => onChange(parseInt(i.value, 10) || 0));
  return h('label', { class: 'field' }, [h('span', { class: 'label', text: label }), i]);
}
function miniNum(value, onChange, suffix) {
  const i = h('input', { class: 'input mini-input', type: 'number', value: String(value) });
  i.addEventListener('change', () => onChange(parseInt(i.value, 10) || 0));
  return h('span', { class: 'mini-field' }, [i, h('span', { class: 'muted tiny', text: suffix })]);
}
function miniText(value, onChange, suffix) {
  const i = h('input', { class: 'input mini-input wide', type: 'text', value: String(value) });
  i.addEventListener('change', () => onChange(i.value));
  return h('span', { class: 'mini-field' }, [i, h('span', { class: 'muted tiny', text: suffix })]);
}
