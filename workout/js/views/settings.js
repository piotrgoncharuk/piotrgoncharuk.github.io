import { h, segmented, toast, confirmDialog, promptDialog } from '../ui.js';
import * as S from '../store.js';
import { applyTheme } from '../app.js';

export function render() {
  const root = h('div', { class: 'view' });
  const st = S.state.settings;
  root.appendChild(h('header', { class: 'view-head' }, [h('h1', { text: 'Настройки' })]));

  // Профиль
  const nameIn = h('input', { class: 'input', type: 'text', value: st.name || '', placeholder: 'Как к вам обращаться' });
  nameIn.addEventListener('change', () => { st.name = nameIn.value.trim(); S.save(); });
  root.appendChild(card('Профиль', [
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Имя' }), nameIn]),
    field('Цель: тренировок в неделю', numInput(st.weeklyGoal, v => { st.weeklyGoal = v; S.save(); }))
  ]));

  // Внешний вид
  root.appendChild(card('Внешний вид', [
    field('Тема', segmented([
      { value: 'auto', label: 'Авто' }, { value: 'dark', label: 'Тёмная' }, { value: 'light', label: 'Светлая' }
    ], st.theme, v => { st.theme = v; S.save(); applyTheme(); window.dispatchEvent(new HashChangeEvent('hashchange')); })),
    field('Единицы веса', segmented([
      { value: 'kg', label: 'Килограммы' }, { value: 'lb', label: 'Фунты' }
    ], st.units, v => { st.units = v; S.save(); window.dispatchEvent(new HashChangeEvent('hashchange')); }))
  ]));

  // Тренировка
  root.appendChild(card('Тренировка', [
    toggle('Таймер отдыха автоматически', st.autoRest, v => { st.autoRest = v; S.save(); }),
    field('Отдых по умолчанию, с', numInput(st.defaultRest, v => { st.defaultRest = v; S.save(); })),
    toggle('Звуковые сигналы', st.sound, v => { st.sound = v; S.save(); }),
    toggle('Вибрация', st.vibrate, v => { st.vibrate = v; S.save(); }),
    toggle('Не гасить экран во время таймера', st.keepAwake, v => { st.keepAwake = v; S.save(); }),
    field('Вес грифа, кг', numInput(st.barWeight, v => { st.barWeight = v; S.save(); }))
  ]));

  // Данные
  root.appendChild(card('Данные', [
    h('p', { class: 'muted small', text: 'Всё хранится только на этом устройстве. Делайте резервную копию перед сменой телефона или очисткой браузера.' }),
    h('button', {
      class: 'btn ghost block', text: '⬇️ Экспорт (файл .json)', onClick: () => {
        const blob = new Blob([S.exportData()], { type: 'application/json' });
        const a = h('a', { href: URL.createObjectURL(blob), download: `fitpro-backup-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.appendChild(a); a.click(); a.remove();
        toast('Файл сохранён');
      }
    }),
    h('button', {
      class: 'btn ghost block', text: '📋 Копировать данные в буфер', onClick: async () => {
        try { await navigator.clipboard.writeText(S.exportData()); toast('Скопировано'); }
        catch (e) { toast('Не удалось скопировать'); }
      }
    }),
    (() => {
      const file = h('input', { type: 'file', accept: 'application/json', class: 'hidden' });
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        try { S.importData(await f.text()); toast('Данные восстановлены'); location.hash = '#/'; }
        catch (e) { toast('Файл повреждён'); }
      });
      const btn = h('button', { class: 'btn ghost block', text: '⬆️ Импорт из файла', onClick: () => file.click() });
      return h('div', {}, [btn, file]);
    })(),
    h('button', {
      class: 'btn ghost danger-text block', text: '🗑 Стереть все данные', onClick: async () => {
        if (!await confirmDialog('Стереть всё?', 'История, программы и настройки будут удалены безвозвратно.', 'Стереть')) return;
        S.resetAll(); location.hash = '#/'; toast('Данные удалены');
      }
    })
  ]));

  root.appendChild(card('Приложение', [
    h('a', { class: 'list-row', href: '#/install' }, [h('span', { class: 'list-title', text: '📱 Установить на iPhone / Android' }), h('span', { class: 'chev', text: '›' })]),
    h('div', { class: 'list-row' }, [h('span', { text: 'Версия' }), h('span', { class: 'muted', id: 'app-version', text: '1.0.0' })]),
    h('button', {
      class: 'list-row btn-row', text: '🔄 Проверить обновление', onClick: async () => {
        if (!('serviceWorker' in navigator)) return toast('Не поддерживается');
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) { await reg.update(); toast('Проверка запущена — перезапустите приложение'); }
      }
    }),
    h('p', { class: 'muted small', text: 'Приложение работает офлайн и не требует регистрации. Данные никуда не отправляются.' })
  ]));

  root.appendChild(h('p', { class: 'muted small center-text disclaimer', text: 'Информация носит образовательный характер. При хронических заболеваниях, травмах или беременности проконсультируйтесь с врачом перед началом тренировок.' }));

  return root;
}

function card(title, children) {
  return h('section', { class: 'card' }, [h('h3', { class: 'card-title', text: title }), ...children]);
}
function field(label, control) {
  return h('div', { class: 'setting-row' }, [h('span', { class: 'label', text: label }), control]);
}
function numInput(value, onChange) {
  const i = h('input', { class: 'input narrow', type: 'number', inputmode: 'numeric', value: String(value) });
  i.addEventListener('change', () => onChange(parseFloat(i.value) || 0));
  return i;
}
function toggle(label, value, onChange) {
  const input = h('input', { type: 'checkbox', checked: value ? '' : null });
  input.checked = !!value;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'setting-row toggle' }, [
    h('span', { class: 'label', text: label }),
    h('span', { class: 'switch' }, [input, h('span', { class: 'slider' })])
  ]);
}
