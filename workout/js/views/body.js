import { h, fmtDateShort, fmtNum, toast, confirmDialog, emptyState } from '../ui.js';
import { lineChart } from '../charts.js';
import * as S from '../store.js';

const FIELDS = [
  ['weight', 'Вес, кг'], ['chest', 'Грудь, см'], ['waist', 'Талия, см'],
  ['hips', 'Бёдра, см'], ['arm', 'Рука, см'], ['thigh', 'Бедро, см'], ['fat', 'Жир, %']
];

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Замеры тела' }),
    h('p', { class: 'muted', text: 'Взвешивайтесь утром натощак, замеры делайте раз в 1–2 недели.' })
  ]));

  const inputs = {};
  const form = h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Новая запись' }),
    h('div', { class: 'grid-2' }, FIELDS.map(([k, label]) => {
      const i = h('input', { class: 'input', type: 'number', inputmode: 'decimal', placeholder: '—' });
      inputs[k] = i;
      return h('label', { class: 'field' }, [h('span', { class: 'label', text: label }), i]);
    })),
    h('button', {
      class: 'btn block', text: 'Сохранить замер', onClick: () => {
        const rec = { date: Date.now() };
        let any = false;
        FIELDS.forEach(([k]) => {
          const v = parseFloat(String(inputs[k].value).replace(',', '.'));
          if (!isNaN(v)) { rec[k] = v; any = true; }
        });
        if (!any) return toast('Заполните хотя бы одно поле');
        S.state.body.push(rec);
        S.state.body.sort((a, b) => a.date - b.date);
        S.save();
        FIELDS.forEach(([k]) => inputs[k].value = '');
        toast('Записано');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    })
  ]);
  root.appendChild(form);

  if (!S.state.body.length) {
    root.appendChild(emptyState('⚖️', 'Пока нет данных', 'Первая запись станет точкой отсчёта.'));
    return root;
  }

  // Графики
  FIELDS.forEach(([k, label]) => {
    const pts = S.state.body.filter(b => b[k] != null).map(b => ({ label: fmtDateShort(b.date), y: b[k] }));
    if (pts.length < 2) return;
    const first = pts[0].y, last = pts.at(-1).y, diff = last - first;
    root.appendChild(h('section', { class: 'card' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: label }),
        h('span', { class: 'pill' + (diff < 0 ? ' down' : diff > 0 ? ' up' : ''), text: `${diff > 0 ? '+' : ''}${fmtNum(diff, 1)}` })
      ]),
      lineChart(pts, { format: v => fmtNum(v, 1) })
    ]));
  });

  // Таблица
  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: 'Все записи' }),
    h('div', { class: 'list' }, [...S.state.body].reverse().map(b => h('div', { class: 'list-row' }, [
      h('div', {}, [
        h('div', { class: 'list-title', text: fmtDateShort(b.date) }),
        h('div', { class: 'muted small', text: FIELDS.filter(([k]) => b[k] != null).map(([k, l]) => `${l.split(',')[0]} ${b[k]}`).join(' · ') })
      ]),
      h('button', {
        class: 'icon-btn', text: '🗑', onClick: async () => {
          if (!await confirmDialog('Удалить запись?', 'Действие нельзя отменить.', 'Удалить')) return;
          S.state.body = S.state.body.filter(x => x.date !== b.date);
          S.save(); window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      })
    ])))
  ]));

  return root;
}
