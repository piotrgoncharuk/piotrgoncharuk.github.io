import { h, toast, confirmDialog, promptDialog, sheet, mmss, fmtDuration, fmtNum, plural, emptyState, haptic } from '../ui.js';
import * as S from '../store.js';
import { restTimer, unlockAudio } from '../timer.js';
import { shareSession } from '../share.js';

let tickHandle = null;

function setsLabel(s) {
  const n = S.sessionSets(s);
  return `${n} ${plural(n, 'подход', 'подхода', 'подходов')}`;
}

export function render() {
  const root = h('div', { class: 'view workout-view' });
  const s = S.state.session;

  if (!s) {
    root.appendChild(emptyState('🏁', 'Тренировка не запущена',
      'Выберите день программы или начните пустую тренировку.',
      h('div', { class: 'row gap' }, [
        h('a', { class: 'btn', href: '#/programs', text: 'К программам' }),
        h('button', {
          class: 'btn ghost', text: 'Пустая тренировка',
          onClick: () => { S.startSession({ title: 'Своя тренировка', items: [] }); location.hash = '#/workout'; window.dispatchEvent(new HashChangeEvent('hashchange')); }
        })
      ])));
    return root;
  }

  unlockAudio();

  const elapsed = h('span', { class: 'mono', text: '00:00' });
  clearInterval(tickHandle);
  tickHandle = setInterval(() => {
    if (!S.state.session) return clearInterval(tickHandle);
    elapsed.textContent = mmss(S.sessionDuration(S.state.session));
  }, 1000);
  elapsed.textContent = mmss(S.sessionDuration(s));

  root.appendChild(h('header', { class: 'workout-head' }, [
    h('div', {}, [
      h('h1', { class: 'wh-title', text: s.title }),
      h('div', { class: 'muted small' }, [h('span', { text: 'Идёт ' }), elapsed,
        h('span', { class: 'sep', text: ' · ' }), h('span', { id: 'w-sets', text: setsLabel(s) })])
    ]),
    h('button', { class: 'btn small', text: 'Завершить', onClick: () => finish(root) })
  ]));

  const list = h('div', { class: 'ex-blocks' });
  root.appendChild(list);
  paint(list, root);

  root.appendChild(h('div', { class: 'row gap' }, [
    h('button', { class: 'btn ghost block', text: '+ Добавить упражнение', onClick: () => addExercise(list, root) }),
  ]));

  const notes = h('textarea', { class: 'input area', placeholder: 'Заметки о тренировке: самочувствие, боли, идеи на следующий раз…', rows: 3 });
  notes.value = s.notes || '';
  notes.addEventListener('input', () => { S.state.session.notes = notes.value; S.save(false); });
  root.appendChild(h('section', { class: 'card' }, [h('h3', { class: 'card-title', text: 'Заметки' }), notes]));

  root.appendChild(h('button', {
    class: 'btn ghost danger-text block', text: 'Отменить тренировку', onClick: async () => {
      if (!await confirmDialog('Отменить тренировку?', 'Все записанные подходы будут потеряны.', 'Отменить тренировку')) return;
      S.discardSession(); restTimer.stop(); location.hash = '#/';
    }
  }));

  return root;
}

function paint(list, root) {
  const s = S.state.session;
  list.innerHTML = '';
  if (!s.items.length) {
    list.appendChild(h('p', { class: 'muted', text: 'Пока нет упражнений — добавьте первое.' }));
    return;
  }
  s.items.forEach((item, idx) => list.appendChild(exBlock(item, idx, list, root)));
}

function exBlock(item, idx, list, root) {
  const s = S.state.session;
  const ex = S.exerciseById(item.exId) || { name: item.exId, def: {} };
  const doneSets = item.sets.filter(x => x.done).length;
  const complete = doneSets === item.sets.length && item.sets.length > 0;

  const block = h('section', { class: 'card ex-block' + (complete ? ' done' : '') });

  block.appendChild(h('div', { class: 'row between center' }, [
    h('div', { class: 'grow' }, [
      h('h3', { class: 'card-title' }, [
        item.ss ? h('span', { class: 'ss-badge', text: 'суперсет ' + item.ss }) : null,
        h('span', { text: ex.name })
      ]),
      h('p', { class: 'muted small', text: `Цель: ${item.sets.length} × ${item.targetReps || '—'}${item.note ? ' · ' + item.note : ''}` }),
      item.lastHint ? h('p', { class: 'muted small', text: 'Прошлый раз: ' + item.lastHint }) : null
    ]),
    h('button', { class: 'icon-btn', text: '⋯', onClick: () => exMenu(item, idx, list, root) })
  ]));

  const table = h('div', { class: 'sets' });
  table.appendChild(h('div', { class: 'set-row head' }, [
    h('span', { text: '#' }), h('span', { text: `Вес, ${S.unit()}` }), h('span', { text: 'Повт.' }), h('span', { text: '' })
  ]));

  item.sets.forEach((set, si) => {
    const wIn = h('input', { class: 'input cell', type: 'text', inputmode: 'decimal', placeholder: '—', value: set.w != null ? String(S.toDisplayWeight(set.w)) : '' });
    const rIn = h('input', { class: 'input cell', type: 'text', inputmode: 'numeric', placeholder: item.targetReps || '—', value: set.r != null ? String(set.r) : '' });
    wIn.addEventListener('change', () => { set.w = S.fromDisplayWeight(wIn.value); S.save(false); });
    rIn.addEventListener('change', () => { set.r = parseInt(rIn.value, 10) || null; S.save(false); });

    const check = h('button', {
      class: 'set-check' + (set.done ? ' on' : ''), text: set.done ? '✓' : '○',
      onClick: () => {
        if (!set.done) {
          if (set.w === null) set.w = S.fromDisplayWeight(wIn.value);
          if (set.r === null) {
            const parsed = parseInt(rIn.value, 10);
            set.r = parsed || parseInt(String(item.targetReps || '').match(/\d+/)?.[0] || '0', 10) || null;
            if (set.r) rIn.value = set.r;
          }
          if (!set.r) { toast('Укажите количество повторов'); rIn.focus(); return; }
          set.done = true;
          haptic(15);
          const rest = item.targetRest ?? S.state.settings.defaultRest;
          if (S.state.settings.autoRest && rest > 0) restTimer.start(rest, ex.name);
        } else { set.done = false; }
        S.save(false);
        paint(list, root);
        const cnt = root.querySelector('#w-sets');
        if (cnt) cnt.textContent = setsLabel(S.state.session);
      }
    });

    table.appendChild(h('div', { class: 'set-row' + (set.done ? ' done' : '') + (set.type === 'warmup' ? ' warmup' : '') }, [
      h('span', { class: 'set-n', text: set.type === 'warmup' ? 'Р' : String(si + 1 - item.sets.slice(0, si).filter(x => x.type === 'warmup').length) }),
      wIn, rIn, check
    ]));
  });

  block.appendChild(table);

  block.appendChild(h('div', { class: 'row gap small-actions' }, [
    h('button', { class: 'mini', text: '+ подход', onClick: () => { item.sets.push({ w: item.sets.at(-1)?.w ?? null, r: null, done: false, type: 'work' }); S.save(false); paint(list, root); } }),
    h('button', { class: 'mini', text: '+ разминочный', onClick: () => { item.sets.unshift({ w: null, r: null, done: false, type: 'warmup' }); S.save(false); paint(list, root); } }),
    item.sets.length > 1 ? h('button', { class: 'mini', text: '− подход', onClick: () => { item.sets.pop(); S.save(false); paint(list, root); } }) : null,
    h('button', { class: 'mini', text: '⏱ отдых', onClick: () => restTimer.start(item.targetRest ?? S.state.settings.defaultRest, ex.name) }),
    h('a', { class: 'mini', href: `#/exercise/${item.exId}`, text: '🎬 техника' })
  ]));

  return block;
}

function exMenu(item, idx, list, root) {
  const s = S.state.session;
  const ex = S.exerciseById(item.exId) || {};
  const body = h('div', { class: 'list' }, [
    row('🎬 Открыть видео-инструкцию', () => { location.hash = `#/exercise/${item.exId}`; }),
    row('🔁 Заменить упражнение', () => swap(item, list, root)),
    row('📝 Заметка к упражнению', async () => {
      const v = await promptDialog('Заметка', { value: item.note || '', placeholder: 'Например: локти ближе к корпусу' });
      if (v !== null) { item.note = v; S.save(false); paint(list, root); }
    }),
    row('⏱ Изменить время отдыха', async () => {
      const v = await promptDialog('Отдых, секунд', { value: String(item.targetRest ?? 90), type: 'number' });
      if (v !== null) { item.targetRest = parseInt(v, 10) || 0; S.save(false); paint(list, root); }
    }),
    idx > 0 ? row('⬆️ Выше', () => { s.items.splice(idx - 1, 0, s.items.splice(idx, 1)[0]); S.save(false); paint(list, root); }) : null,
    idx < s.items.length - 1 ? row('⬇️ Ниже', () => { s.items.splice(idx + 1, 0, s.items.splice(idx, 1)[0]); S.save(false); paint(list, root); }) : null,
    row('🗑 Убрать из тренировки', () => { s.items.splice(idx, 1); S.save(false); paint(list, root); }, true)
  ].filter(Boolean));

  const sh = sheet(ex.name || 'Упражнение', body);
  function row(text, fn, danger) {
    return h('button', { class: 'list-row btn-row' + (danger ? ' danger-text' : ''), text, onClick: () => { sh.close(); setTimeout(fn, 200); } });
  }
}

function swap(item, list, root) {
  const cur = S.exerciseById(item.exId);
  const candidates = [
    ...(cur?.alt || []),
    ...S.allExercises().filter(e => e.group === cur?.group && e.id !== item.exId).map(e => e.id)
  ];
  const uniq = [...new Set(candidates)].slice(0, 30);
  const body = h('div', { class: 'list' }, uniq.map(id => {
    const e = S.exerciseById(id);
    return e ? h('button', {
      class: 'list-row btn-row', onClick: () => {
        item.exId = id;
        item.targetRest = e.def?.rest ?? item.targetRest;
        item.targetReps = e.def?.reps ?? item.targetReps;
        const last = S.lastPerformance(id);
        item.lastHint = last ? last.sets.map(x => `${x.w ? x.w + '×' : ''}${x.r}`).join(', ') : null;
        item.sets.forEach(st => { st.done = false; st.r = null; st.w = last?.sets?.at(-1)?.w ?? null; });
        S.save(false); sh.close(); paint(list, root);
      }
    }, [h('div', {}, [h('div', { class: 'list-title', text: e.name }), h('div', { class: 'muted small', text: (e.eq || []).join(', ') })])]) : null;
  }).filter(Boolean));
  const sh = sheet('Заменить на', body);
}

function addExercise(list, root) {
  const input = h('input', { class: 'input search', type: 'search', placeholder: '🔍 Поиск…' });
  const results = h('div', { class: 'list scroll-list' });
  const body = h('div', { class: 'stack' }, [input, results]);
  const sh = sheet('Добавить упражнение', body, { wide: true });

  function paintResults() {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = '';
    S.allExercises()
      .filter(e => !q || e.name.toLowerCase().includes(q) || (e.en || '').toLowerCase().includes(q) || (e.primary || []).join(' ').toLowerCase().includes(q))
      .slice(0, 60)
      .forEach(e => results.appendChild(h('button', {
        class: 'list-row btn-row', onClick: () => {
          const last = S.lastPerformance(e.id);
          S.state.session.items.push({
            exId: e.id, note: '', targetReps: e.def?.reps || '8-12', targetRest: e.def?.rest ?? S.state.settings.defaultRest,
            lastHint: last ? last.sets.map(x => `${x.w ? x.w + '×' : ''}${x.r}`).join(', ') : null,
            sets: Array.from({ length: e.def?.sets || 3 }, () => ({ w: last?.sets?.at(-1)?.w ?? null, r: null, done: false, type: 'work' }))
          });
          S.save(false); sh.close(); paint(list, root);
        }
      }, [h('div', {}, [h('div', { class: 'list-title', text: e.name }), h('div', { class: 'muted small', text: (e.primary || []).join(', ') })])])));
  }
  input.addEventListener('input', paintResults);
  paintResults();
  setTimeout(() => input.focus(), 250);
}

async function finish(root) {
  const s = S.state.session;
  const done = S.sessionSets(s);
  if (!done) {
    if (!await confirmDialog('Ни одного подхода', 'Тренировка не будет сохранена. Закрыть?', 'Закрыть')) return;
    S.discardSession(); restTimer.stop(); location.hash = '#/'; return;
  }
  const prsBefore = Object.fromEntries(S.personalRecords().map(r => [r.exId, r.e1rm]));
  const finished = S.finishSession();
  restTimer.stop();
  clearInterval(tickHandle);

  const prsAfter = S.personalRecords();
  const newPRs = prsAfter.filter(r => !prsBefore[r.exId] || r.e1rm > prsBefore[r.exId] + 0.01)
    .filter(r => finished.items.some(i => i.exId === r.exId));

  const RPE_HINTS = { 1: 'очень легко', 2: 'легко', 3: 'умеренно', 4: 'средне', 5: 'заметно тяжело', 6: 'тяжело', 7: 'очень тяжело', 8: 'на пределе', 9: 'почти максимум', 10: 'максимум' };
  const rpeStart = 7;
  finished.rpe = rpeStart;
  S.save(false);
  const rpeLabel = h('div', { class: 'rpe-value', text: `${rpeStart} — ${RPE_HINTS[rpeStart]}` });
  const rpeInput = h('input', { class: 'range', type: 'range', min: '1', max: '10', step: '1', value: String(rpeStart) });
  rpeInput.addEventListener('input', () => {
    const v = parseInt(rpeInput.value, 10);
    finished.rpe = v;
    rpeLabel.textContent = `${v} — ${RPE_HINTS[v]}`;
    S.save(false);
  });

  const body = h('div', { class: 'stack center-text' }, [
    h('div', { class: 'big-emoji', text: '🎉' }),
    h('h2', { text: 'Тренировка завершена' }),
    h('div', { class: 'stats' }, [
      tile(fmtDuration(S.sessionDuration(finished)), 'длительность'),
      tile(String(S.sessionSets(finished)), 'подходов'),
      tile(fmtNum(S.sessionVolume(finished)) + ' кг', 'тоннаж'),
      tile(String(S.sessionReps(finished)), 'повторов')
    ]),
    h('div', { class: 'card' }, [
      h('h3', { class: 'card-title', text: 'Насколько тяжело было?' }),
      rpeLabel,
      rpeInput,
      h('p', { class: 'muted small', text: 'Оценка нужна для расчёта тренировочной нагрузки — она подскажет, когда объём растёт слишком резко.' })
    ]),
    newPRs.length ? h('div', { class: 'card tip' }, [
      h('h3', { class: 'card-title', text: '🏆 Новые рекорды' }),
      h('ul', { class: 'bullets' }, newPRs.map(r => h('li', { text: `${S.exerciseById(r.exId)?.name || r.exId}: ${fmtNum(r.w, 1)} кг × ${r.r} (1ПМ ≈ ${fmtNum(r.e1rm, 1)} кг)` })))
    ]) : null
  ]);

  const sh = sheet('Отлично!', body, {
    actions: [
      h('button', { class: 'btn ghost', text: '📤 Поделиться', onClick: () => shareSession(finished) }),
      h('button', { class: 'btn', text: 'Готово', onClick: () => { sh.close(); location.hash = '#/'; } })
    ]
  });
  function tile(v, l) { return h('div', { class: 'stat' }, [h('div', { class: 'stat-value', text: v }), h('div', { class: 'stat-label', text: l })]); }
}
