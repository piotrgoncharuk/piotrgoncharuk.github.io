import { h } from '../ui.js';

export function render() {
  const root = h('div', { class: 'view' });
  const url = location.origin + location.pathname.replace(/index\.html$/, '');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Установка на телефон' }),
    h('p', { class: 'muted', text: 'Приложение бесплатное, без регистрации и работает офлайн. App Store не нужен.' })
  ]));

  if (standalone) root.appendChild(h('section', { class: 'card tip' }, [
    h('h3', { class: 'card-title', text: '✅ Уже установлено' }),
    h('p', { class: 'muted small', text: 'Вы открыли приложение с домашнего экрана — всё работает как надо.' })
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🍎 iPhone и iPad' }),
    h('ol', { class: 'steps' }, [
      h('li', { text: 'Откройте эту страницу в Safari (важно: именно Safari, не Chrome).' }),
      h('li', { text: 'Нажмите кнопку «Поделиться» — квадрат со стрелкой вверх внизу экрана.' }),
      h('li', { text: 'Пролистайте меню и выберите «На экран «Домой»».' }),
      h('li', { text: 'Нажмите «Добавить» — иконка появится рядом с обычными приложениями.' })
    ]),
    h('p', { class: 'muted small', text: 'После установки приложение открывается на весь экран, без адресной строки, и работает без интернета.' })
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🤖 Android' }),
    h('ol', { class: 'steps' }, [
      h('li', { text: 'Откройте страницу в Chrome.' }),
      h('li', { text: 'Меню «⋮» → «Установить приложение» либо «Добавить на главный экран».' }),
      h('li', { text: 'Подтвердите установку.' })
    ])
  ]));

  root.appendChild(h('section', { class: 'card' }, [
    h('h3', { class: 'card-title', text: '🔗 Ссылка на приложение' }),
    h('p', { class: 'mono link-box', text: url }),
    h('button', {
      class: 'btn ghost block', text: 'Скопировать ссылку', onClick: async () => {
        try { await navigator.clipboard.writeText(url); alert('Ссылка скопирована'); } catch (e) { alert(url); }
      }
    })
  ]));

  root.appendChild(h('section', { class: 'card warn' }, [
    h('h3', { class: 'card-title', text: '⚠️ Важно про данные' }),
    h('p', { class: 'muted small', text: 'История тренировок хранится только в вашем браузере. Не очищайте данные сайта и делайте резервную копию в разделе «Настройки → Данные» перед сменой телефона.' })
  ]));

  if (isIOS && !standalone) root.appendChild(h('p', { class: 'muted small center-text', text: 'Подсказка: кнопка «Поделиться» находится в нижней панели Safari.' }));

  return root;
}
