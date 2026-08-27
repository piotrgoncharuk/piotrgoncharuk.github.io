import { h, toast, fmtDateShort, promptDialog, confirmDialog, sheet, plural } from '../ui.js';
import * as S from '../store.js';

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [
    h('h1', { text: 'Профили' }),
    h('p', { class: 'muted', text: 'Несколько человек могут пользоваться приложением на одном телефоне: у каждого своя история, программы, рекорды и настройки.' })
  ]));

  root.appendChild(h('div', { class: 'list' }, S.profiles.map(p => {
    const sum = S.profileSummary(p.id);
    const active = p.id === S.activeProfileId;
    return h('div', { class: 'profile-row' + (active ? ' active' : '') }, [
      h('button', {
        class: 'profile-main', onClick: () => { if (!active) S.switchProfile(p.id); }
      }, [
        h('span', { class: 'profile-emoji', text: p.emoji || '💪' }),
        h('div', { class: 'grow' }, [
          h('div', { class: 'list-title', text: p.name }),
          h('div', { class: 'muted small', text: `${sum.sessions} ${plural(sum.sessions, 'тренировка', 'тренировки', 'тренировок')}` + (sum.last ? ` · последняя ${fmtDateShort(sum.last)}` : '') })
        ]),
        active ? h('span', { class: 'pill live', text: 'активный' }) : h('span', { class: 'chev', text: '›' })
      ]),
      h('button', { class: 'icon-btn', text: '⋯', onClick: () => menu(p) })
    ]);
  })));

  root.appendChild(h('button', {
    class: 'btn block', text: '+ Добавить профиль', onClick: async () => {
      const name = await promptDialog('Новый профиль', { label: 'Имя', placeholder: 'Например: Аня' });
      if (!name || !name.trim()) return;
      const emoji = await pickEmoji();
      const p = S.addProfile(name, emoji || '💪');
      toast('Профиль создан');
      S.switchProfile(p.id);
    }
  }));

  root.appendChild(h('section', { class: 'card info' }, [
    h('h3', { class: 'card-title', text: 'Как пользоваться вдвоём' }),
    h('p', { class: 'small', text: 'На одном телефоне: создайте второй профиль и переключайтесь одним нажатием — данные не смешиваются.' }),
    h('p', { class: 'small', text: 'На разных телефонах: пусть второй человек просто откроет ту же ссылку и добавит иконку на свой экран «Домой». У него будет своё независимое приложение со своей историей.' }),
    h('p', { class: 'muted small', text: 'Перенести данные между телефонами можно файлом: «Настройки → Данные → Экспорт», отправить файл, затем «Импорт». Резервная копия содержит все профили устройства.' })
  ]));

  return root;
}

function menu(p) {
  const sh = sheet(p.name, h('div', { class: 'list' }, [
    h('button', {
      class: 'list-row btn-row', text: '✏️ Переименовать', onClick: async () => {
        sh.close();
        const name = await promptDialog('Имя профиля', { value: p.name });
        if (name && name.trim()) { S.updateProfile(p.id, { name: name.trim() }); rerender(); }
      }
    }),
    h('button', {
      class: 'list-row btn-row', text: '🙂 Сменить значок', onClick: async () => {
        sh.close();
        const emoji = await pickEmoji();
        if (emoji) { S.updateProfile(p.id, { emoji }); rerender(); }
      }
    }),
    p.id !== S.activeProfileId ? h('button', {
      class: 'list-row btn-row', text: '↔️ Переключиться', onClick: () => { sh.close(); S.switchProfile(p.id); }
    }) : null,
    S.profiles.length > 1 ? h('button', {
      class: 'list-row btn-row danger-text', text: '🗑 Удалить профиль', onClick: async () => {
        sh.close();
        if (!await confirmDialog('Удалить профиль?', `Вся история «${p.name}» будет удалена безвозвратно. Сделайте резервную копию, если данные ещё нужны.`, 'Удалить')) return;
        S.deleteProfile(p.id);
        toast('Профиль удалён');
        rerender();
      }
    }) : null
  ].filter(Boolean)));
}

function pickEmoji() {
  return new Promise(resolve => {
    const grid = h('div', { class: 'emoji-grid' }, S.PROFILE_EMOJI.map(e =>
      h('button', { class: 'emoji-btn', text: e, onClick: () => { sh.close(); resolve(e); } })));
    const sh = sheet('Выберите значок', grid, {
      actions: [h('button', { class: 'btn ghost', text: 'Отмена', onClick: () => { sh.close(); resolve(null); } })]
    });
  });
}

function rerender() { window.dispatchEvent(new HashChangeEvent('hashchange')); }
