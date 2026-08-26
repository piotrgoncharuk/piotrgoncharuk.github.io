import { h, mmss, toast, fmtNum } from '../ui.js';
import * as S from '../store.js';
import { IntervalTimer, restTimer, unlockAudio, beep } from '../timer.js';

let iv = null;

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Инструменты' }),
    h('p', { class: 'muted', text: 'Таймеры и калькуляторы, которые нужны прямо во время тренировки.' })
  ]));

  root.appendChild(intervalCard());
  root.appendChild(quickRestCard());
  root.appendChild(oneRmCard());
  root.appendChild(plateCard());
  root.appendChild(warmupCard());
  root.appendChild(tdeeCard());
  return root;
}

// ------------------------------------------------------------ интервальный таймер
function intervalCard() {
  const presets = {
    tabata: { name: 'Табата', work: 20, rest: 10, rounds: 8, prep: 10 },
    hiit: { name: 'HIIT 30/30', work: 30, rest: 30, rounds: 10, prep: 10 },
    emom: { name: 'EMOM 10', work: 60, rest: 0, rounds: 10, prep: 10 },
    custom: { name: 'Свой', work: 40, rest: 20, rounds: 6, prep: 10 }
  };
  let cfg = { ...presets.tabata };

  const display = h('div', { class: 'timer-display' }, [
    h('div', { class: 'timer-phase', text: 'Готовы?' }),
    h('div', { class: 'timer-time mono', text: mmss(cfg.work) }),
    h('div', { class: 'timer-round muted', text: `Раунд 1 / ${cfg.rounds}` })
  ]);
  const bar = h('div', { class: 'timer-bar' }, [h('span', { class: 'timer-fill' })]);

  const fields = h('div', { class: 'grid-3' }, [
    numField('Работа, с', cfg.work, v => { cfg.work = v; build(); }),
    numField('Отдых, с', cfg.rest, v => { cfg.rest = v; build(); }),
    numField('Раундов', cfg.rounds, v => { cfg.rounds = v; build(); })
  ]);

  const presetRow = h('div', { class: 'scroll-chips' }, Object.entries(presets).map(([k, p]) =>
    h('button', {
      class: 'chip tap' + (p.name === cfg.name ? ' on' : ''), text: p.name, onClick: (e) => {
        cfg = { ...p };
        [...presetRow.children].forEach(c => c.classList.remove('on'));
        e.target.classList.add('on');
        fields.querySelectorAll('input')[0].value = cfg.work;
        fields.querySelectorAll('input')[1].value = cfg.rest;
        fields.querySelectorAll('input')[2].value = cfg.rounds;
        build();
      }
    })));

  function build() {
    if (iv) iv.stop();
    iv = new IntervalTimer(cfg.rest > 0 ? [{ name: 'Работа', seconds: cfg.work }, { name: 'Отдых', seconds: cfg.rest }]
      : [{ name: 'Работа', seconds: cfg.work }], cfg.rounds);
    iv.subscribe(s => {
      display.querySelector('.timer-phase').textContent = s.done ? 'Готово! 🎉' : s.phase;
      display.querySelector('.timer-time').textContent = mmss(s.left);
      display.querySelector('.timer-round').textContent = `Раунд ${Math.min(s.round, s.rounds)} / ${s.rounds}`;
      bar.querySelector('.timer-fill').style.width = Math.round((s.progress || 0) * 100) + '%';
      display.classList.toggle('work', s.phase === 'Работа' && s.running);
      display.classList.toggle('rest', s.phase === 'Отдых' && s.running);
    });
  }
  build();

  const startBtn = h('button', {
    class: 'btn', text: '▶︎ Старт', onClick: () => {
      unlockAudio();
      if (iv.running) { iv.pause(); startBtn.textContent = '▶︎ Продолжить'; }
      else { iv.start(); startBtn.textContent = '⏸ Пауза'; }
    }
  });

  return h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '⏱ Интервальный таймер' }),
    presetRow, display, bar, fields,
    h('div', { class: 'row gap' }, [
      startBtn,
      h('button', { class: 'btn ghost', text: 'Сброс', onClick: () => { iv.stop(); startBtn.textContent = '▶︎ Старт'; } })
    ]),
    h('p', { class: 'muted small', text: 'Сигнал звучит за 3 секунды до конца фазы. Экран не гаснет, пока таймер идёт.' })
  ]);
}

function quickRestCard() {
  const btns = [30, 45, 60, 90, 120, 180].map(s => h('button', {
    class: 'chip tap', text: s + ' с', onClick: () => { unlockAudio(); restTimer.start(s, 'Отдых'); toast(`Таймер отдыха ${s} с`); }
  }));
  return h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '⏳ Быстрый отдых' }),
    h('div', { class: 'scroll-chips' }, btns),
    h('p', { class: 'muted small', text: 'Таймер продолжит идти в любом разделе приложения.' })
  ]);
}

// ------------------------------------------------------------ 1ПМ
function oneRmCard() {
  const w = numInput(60), r = numInput(5);
  const out = h('div', { class: 'calc-out' });
  function calc() {
    const kg = parseFloat(w.value) || 0, reps = parseInt(r.value, 10) || 0;
    if (!kg || !reps) { out.innerHTML = ''; return; }
    const max = kg * (1 + reps / 30);
    const rows = [[100, 1], [95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15]];
    out.innerHTML = '';
    out.appendChild(h('p', { class: 'big-stat', text: `1ПМ ≈ ${fmtNum(max, 1)} ${S.unit()}` }));
    out.appendChild(h('div', { class: 'list' }, rows.map(([p, reps2]) => h('div', { class: 'list-row' }, [
      h('span', { text: `${p}% — ${fmtNum(max * p / 100, 1)} ${S.unit()}` }),
      h('span', { class: 'muted', text: `≈${reps2} повт.` })
    ]))));
  }
  w.addEventListener('input', calc); r.addEventListener('input', calc);
  const card = h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🧮 Расчёт 1ПМ' }),
    h('div', { class: 'grid-2' }, [labeled(`Вес, ${S.unit()}`, w), labeled('Повторы', r)]),
    out,
    h('p', { class: 'muted small', text: 'Формула Эпли. Оценка, а не повод проверять максимум без подготовки.' })
  ]);
  calc();
  return card;
}

// ------------------------------------------------------------ блины
function plateCard() {
  const target = numInput(100);
  const bar = numInput(S.state.settings.barWeight);
  const out = h('div', { class: 'calc-out' });
  function calc() {
    const t = parseFloat(target.value) || 0, b = parseFloat(bar.value) || 0;
    out.innerHTML = '';
    if (t < b) { out.appendChild(h('p', { class: 'muted', text: 'Вес меньше грифа.' })); return; }
    let side = (t - b) / 2;
    const used = [];
    S.state.settings.plates.forEach(p => {
      let n = Math.floor(side / p + 1e-9);
      if (n > 0) { used.push({ p, n }); side -= n * p; }
    });
    out.appendChild(h('div', { class: 'plates' }, used.map(u => h('span', { class: 'plate', text: `${u.p}×${u.n}` }))));
    out.appendChild(h('p', { class: 'muted small', text: side > 0.01 ? `Не хватает ${fmtNum(side * 2, 2)} кг — округлите вес.` : 'На каждую сторону грифа.' }));
  }
  target.addEventListener('input', calc); bar.addEventListener('input', () => { S.state.settings.barWeight = parseFloat(bar.value) || 20; S.save(false); calc(); });
  const card = h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🏋️ Калькулятор блинов' }),
    h('div', { class: 'grid-2' }, [labeled('Целевой вес, кг', target), labeled('Гриф, кг', bar)]),
    out
  ]);
  calc();
  return card;
}

// ------------------------------------------------------------ разминочные подходы
function warmupCard() {
  const work = numInput(100);
  const out = h('div', { class: 'calc-out' });
  function calc() {
    const t = parseFloat(work.value) || 0;
    out.innerHTML = '';
    if (!t) return;
    const plan = [[0.4, 8], [0.6, 5], [0.75, 3], [0.9, 1]];
    out.appendChild(h('div', { class: 'list' }, plan.map(([p, r], i) => h('div', { class: 'list-row' }, [
      h('span', { text: `Разминка ${i + 1}: ${fmtNum(t * p, 1)} кг` }),
      h('span', { class: 'muted', text: `${r} повт.` })
    ])).concat([h('div', { class: 'list-row' }, [h('span', { class: 'list-title', text: `Рабочий: ${fmtNum(t, 1)} кг` })])])));
  }
  work.addEventListener('input', calc);
  const card = h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🔥 Разминочные подходы' }),
    labeled('Рабочий вес, кг', work), out,
    h('p', { class: 'muted small', text: 'Отдых между разминочными — 45–60 секунд.' })
  ]);
  calc();
  return card;
}

// ------------------------------------------------------------ калории
function tdeeCard() {
  const sex = h('select', { class: 'input select' }, [h('option', { value: 'm', text: 'Мужчина' }), h('option', { value: 'f', text: 'Женщина' })]);
  const age = numInput(30), height = numInput(178), weight = numInput(80);
  const act = h('select', { class: 'input select' }, [
    h('option', { value: '1.2', text: 'Сидячий образ жизни' }),
    h('option', { value: '1.375', text: '1–3 тренировки в неделю' }),
    h('option', { value: '1.55', text: '3–5 тренировок' }),
    h('option', { value: '1.725', text: '6–7 тренировок' }),
    h('option', { value: '1.9', text: 'Тяжёлый физический труд' })
  ]);
  act.value = '1.55';
  const out = h('div', { class: 'calc-out' });
  function calc() {
    const a = parseInt(age.value, 10) || 0, hgt = parseFloat(height.value) || 0, w = parseFloat(weight.value) || 0;
    if (!a || !hgt || !w) return;
    const bmr = 10 * w + 6.25 * hgt - 5 * a + (sex.value === 'm' ? 5 : -161);
    const tdee = bmr * parseFloat(act.value);
    const bmi = w / Math.pow(hgt / 100, 2);
    out.innerHTML = '';
    out.appendChild(h('p', { class: 'big-stat', text: `${Math.round(tdee)} ккал в день` }));
    out.appendChild(h('div', { class: 'list' }, [
      row('Похудение (−20%)', `${Math.round(tdee * 0.8)} ккал`),
      row('Поддержание', `${Math.round(tdee)} ккал`),
      row('Набор массы (+10%)', `${Math.round(tdee * 1.1)} ккал`),
      row('Белок', `${Math.round(w * 1.8)} г в день`),
      row('ИМТ', fmtNum(bmi, 1))
    ]));
  }
  function row(a, b) { return h('div', { class: 'list-row' }, [h('span', { text: a }), h('span', { class: 'list-value', text: b })]); }
  [age, height, weight].forEach(i => i.addEventListener('input', calc));
  [sex, act].forEach(i => i.addEventListener('change', calc));
  const card = h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🍎 Калории и белок' }),
    h('div', { class: 'grid-2' }, [labeled('Пол', sex), labeled('Возраст', age), labeled('Рост, см', height), labeled('Вес, кг', weight)]),
    labeled('Активность', act), out,
    h('p', { class: 'muted small', text: 'Формула Миффлина—Сан Жеора. Ориентир, а не медицинская рекомендация.' })
  ]);
  calc();
  return card;
}

// ------------------------------------------------------------ мелочи
function numInput(value) { return h('input', { class: 'input', type: 'number', inputmode: 'decimal', value: String(value) }); }
function labeled(label, input) { return h('label', { class: 'field' }, [h('span', { class: 'label', text: label }), input]); }
function numField(label, value, onChange) {
  const i = numInput(value);
  i.addEventListener('input', () => onChange(Math.max(0, parseInt(i.value, 10) || 0)));
  return labeled(label, i);
}
