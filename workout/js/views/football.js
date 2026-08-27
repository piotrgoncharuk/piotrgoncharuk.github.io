import { h, toast, fmtDate, fmtDateShort, fmtNum, confirmDialog, emptyState, plural } from '../ui.js';
import * as S from '../store.js';

const RPE_HINTS = {
  1: 'очень легко', 2: 'легко', 3: 'умеренно', 4: 'средне', 5: 'заметно тяжело',
  6: 'тяжело', 7: 'очень тяжело', 8: 'на пределе', 9: 'почти максимум', 10: 'максимум'
};

export function render(editId = null) {
  const root = h('div', { class: 'view' });
  const editing = editId ? S.state.history.find(s => s.id === editId && s.kind === 'football') : null;

  root.appendChild(h('header', { class: 'view-head' }, [
    editing ? h('a', { class: 'back', href: `#/history/${editing.id}`, text: '‹ Назад' }) : null,
    h('h1', { text: editing ? 'Изменить запись' : '⚽️ Футбол' }),
    h('p', { class: 'muted', text: editing ? '' : 'Отметьте тренировку с командой, матч или индивидуальное занятие — они попадут в общую историю, статистику и расчёт нагрузки.' })
  ]));

  const form = {
    type: editing?.type || 'training',
    date: editing ? new Date(editing.startedAt) : new Date(),
    minutes: editing?.minutes ?? 90,
    rpe: editing?.rpe ?? 6,
    distance: editing?.distance ?? null,
    goals: editing?.goals ?? 0,
    assists: editing?.assists ?? 0,
    opponent: editing?.opponent || '',
    scoreFor: editing?.scoreFor ?? null,
    scoreAgainst: editing?.scoreAgainst ?? null,
    position: editing?.position || '',
    rating: editing?.rating ?? null,
    notes: editing?.notes || ''
  };

  // --- тип занятия
  const typeRow = h('div', { class: 'type-grid' }, Object.entries(S.FOOTBALL_TYPES).map(([key, t]) =>
    h('button', {
      class: 'type-tile' + (form.type === key ? ' on' : ''), onClick: () => {
        form.type = key;
        [...typeRow.children].forEach((c, i) => c.classList.toggle('on', Object.keys(S.FOOTBALL_TYPES)[i] === key));
        matchBox.classList.toggle('hidden', key !== 'match');
      }
    }, [h('span', { class: 'type-icon', text: t.icon }), h('span', { class: 'small', text: t.name })])));

  // --- дата и длительность
  const dateIn = h('input', { class: 'input', type: 'date', value: toDateValue(form.date) });
  const minutesIn = h('input', { class: 'input', type: 'number', inputmode: 'numeric', value: String(form.minutes) });
  const quickMin = h('div', { class: 'scroll-chips' }, [45, 60, 75, 90, 120].map(m =>
    h('button', { class: 'chip tap', text: m + ' мин', onClick: () => { minutesIn.value = m; } })));

  // --- RPE
  const rpeValue = h('span', { class: 'rpe-value', text: `${form.rpe} — ${RPE_HINTS[form.rpe]}` });
  const rpeIn = h('input', { class: 'range', type: 'range', min: '1', max: '10', step: '1', value: String(form.rpe) });
  rpeIn.addEventListener('input', () => {
    form.rpe = parseInt(rpeIn.value, 10);
    rpeValue.textContent = `${form.rpe} — ${RPE_HINTS[form.rpe]}`;
  });

  // --- матч
  const opponentIn = h('input', { class: 'input', type: 'text', placeholder: 'Соперник', value: form.opponent });
  const forIn = h('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '—', value: form.scoreFor ?? '' });
  const againstIn = h('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '—', value: form.scoreAgainst ?? '' });
  const matchBox = h('div', { class: 'stack' + (form.type === 'match' ? '' : ' hidden') }, [
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Соперник' }), opponentIn]),
    h('div', { class: 'score-row' }, [
      h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Мы' }), forIn]),
      h('span', { class: 'score-sep', text: ':' }),
      h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Они' }), againstIn])
    ])
  ]);

  const goalsIn = counter(form.goals);
  const assistsIn = counter(form.assists);
  const distanceIn = h('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: 'например 8.4', value: form.distance ?? '' });
  const positionIn = h('input', { class: 'input', type: 'text', placeholder: 'Например: центральный полузащитник', value: form.position });
  const notesIn = h('textarea', { class: 'input area', rows: 3, placeholder: 'Что получалось, что нет, самочувствие, задачи на следующий раз' });
  notesIn.value = form.notes;

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Что это было' }),
    typeRow,
    h('div', { class: 'grid-2' }, [
      h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Дата' }), dateIn]),
      h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Длительность, мин' }), minutesIn])
    ]),
    quickMin,
    matchBox
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Насколько тяжело было?' }),
    rpeValue,
    rpeIn,
    h('div', { class: 'row between' }, [
      h('span', { class: 'muted tiny', text: '1 — прогулка' }),
      h('span', { class: 'muted tiny', text: '10 — максимум' })
    ]),
    h('p', { class: 'muted small', text: 'По этой оценке и длительности считается тренировочная нагрузка — она показывает, не растёт ли объём слишком резко.' })
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Показатели' }),
    h('div', { class: 'grid-2' }, [
      h('div', { class: 'field' }, [h('span', { class: 'label', text: 'Голы' }), goalsIn.node]),
      h('div', { class: 'field' }, [h('span', { class: 'label', text: 'Голевые передачи' }), assistsIn.node])
    ]),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Дистанция, км (если знаете)' }), distanceIn]),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Позиция' }), positionIn]),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Заметки' }), notesIn])
  ]));

  root.appendChild(h('button', {
    class: 'btn block', text: editing ? 'Сохранить изменения' : 'Записать',
    onClick: () => {
      const minutes = parseInt(minutesIn.value, 10) || 0;
      if (!minutes) return toast('Укажите длительность');
      const d = dateIn.value ? new Date(dateIn.value + 'T12:00:00') : new Date();
      const rec = S.saveFootball({
        id: editing?.id,
        type: form.type,
        title: S.footballTypeName(form.type) + (opponentIn.value.trim() && form.type === 'match' ? ` · ${opponentIn.value.trim()}` : ''),
        date: d.getTime(),
        minutes,
        rpe: parseInt(rpeIn.value, 10),
        distance: parseFloat(String(distanceIn.value).replace(',', '.')) || null,
        goals: goalsIn.get(),
        assists: assistsIn.get(),
        opponent: opponentIn.value.trim(),
        scoreFor: forIn.value === '' ? null : parseInt(forIn.value, 10),
        scoreAgainst: againstIn.value === '' ? null : parseInt(againstIn.value, 10),
        position: positionIn.value.trim(),
        notes: notesIn.value.trim()
      });
      toast(editing ? 'Изменения сохранены' : 'Записано ⚽️');
      location.hash = `#/history/${rec.id}`;
    }
  }));

  if (editing) return root;

  // --- сводка и последние занятия
  const st = S.footballStats();
  if (st.total) {
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Футбольная статистика' }),
      h('div', { class: 'stats' }, [
        tile(String(st.total), 'занятий'),
        tile(String(st.matches), 'матчей'),
        tile(String(st.goals), 'голов'),
        tile(String(st.assists), 'передач'),
        tile(Math.round(st.minutes / 60) + ' ч', 'на поле'),
        st.distance ? tile(fmtNum(st.distance, 1) + ' км', 'пробежано') : null
      ].filter(Boolean)),
      st.matches ? h('p', { class: 'muted small', text: `Матчи: ${st.wins} побед · ${st.draws} ничьих · ${st.losses} поражений` }) : null
    ]));

    const list = S.footballSessions().slice(-6).reverse();
    root.appendChild(h('section', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Последние занятия' }),
      h('div', { class: 'list' }, list.map(s => h('a', { class: 'list-row', href: `#/history/${s.id}` }, [
        h('span', { class: 'ex-icon', text: (S.FOOTBALL_TYPES[s.type] || {}).icon || '⚽️' }),
        h('div', { class: 'grow' }, [
          h('div', { class: 'list-title', text: s.title }),
          h('div', { class: 'muted small', text: `${fmtDateShort(s.startedAt)} · ${s.minutes} мин · RPE ${s.rpe || '—'}` + (s.goals ? ` · ${s.goals} ${plural(s.goals, 'гол', 'гола', 'голов')}` : '') })
        ]),
        h('span', { class: 'chev', text: '›' })
      ])))
    ]));
  } else {
    root.appendChild(emptyState('⚽️', 'Пока нет футбольных записей',
      'Заполните форму выше после ближайшей тренировки или матча — дальше приложение само посчитает минуты, голы и нагрузку.'));
  }

  root.appendChild(h('section', { class: 'card info' }, [
    h('h3', { class: 'card-title', text: 'Футбольные упражнения и программы' }),
    h('p', { class: 'muted small', text: 'В базе есть техника, скорость, выносливость, вратарские упражнения и профилактика травм, а также программы «Предсезонка», «В сезоне» и разминка перед матчем.' }),
    h('div', { class: 'row gap wrap' }, [
      h('a', { class: 'btn small', href: '#/program/fb_preseason', text: 'Предсезонка' }),
      h('a', { class: 'btn small ghost', href: '#/program/fb_inseason', text: 'В сезоне' }),
      h('a', { class: 'btn small ghost', href: '#/program/fb_warmup', text: 'Разминка' }),
      h('a', { class: 'btn small ghost', href: '#/exercises?g=football', text: 'Упражнения' })
    ])
  ]));

  return root;
}

function tile(v, l) { return h('div', { class: 'stat' }, [h('div', { class: 'stat-value', text: v }), h('div', { class: 'stat-label', text: l })]); }

function counter(initial) {
  let v = initial || 0;
  const out = h('span', { class: 'counter-value', text: String(v) });
  const node = h('div', { class: 'counter' }, [
    h('button', { class: 'counter-btn', text: '−', onClick: () => { v = Math.max(0, v - 1); out.textContent = String(v); } }),
    out,
    h('button', { class: 'counter-btn', text: '+', onClick: () => { v++; out.textContent = String(v); } })
  ]);
  return { node, get: () => v };
}

function toDateValue(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
