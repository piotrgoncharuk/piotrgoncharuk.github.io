import { h, toast } from '../ui.js';
import * as S from '../store.js';
import { VERSION, forceUpdate } from '../app.js';

const LINKS = [
  ['#/help', '❓', 'Как пользоваться', 'Инструкция, частые вопросы, обозначения'],
  ['#/plan', '🗓', 'План недели', 'Футбол, программы и отдых по дням'],
  ['#/programs', '📋', 'Программы', '13 готовых планов тренировок'],
  ['#/exercises', '🎬', 'Упражнения', '130 движений с техникой и видео'],
  ['#/history', '📓', 'История тренировок', 'Все завершённые сессии и календарь'],
  ['#/profiles', '👥', 'Профили', 'Несколько человек на одном телефоне'],
  ['#/achievements', '🏆', 'Достижения', 'Бейджи, серии и цели'],
  ['#/tools', '⏱', 'Таймеры и калькуляторы', 'Табата, HIIT, 1ПМ, блины, калории'],
  ['#/body', '⚖️', 'Замеры тела', 'Вес и объёмы с графиками'],
  ['#/builder', '🧩', 'Мои программы', 'Создать или изменить свой план'],
  ['#/install', '📱', 'Установить на телефон', 'Иконка на домашнем экране, работа офлайн'],
  ['#/settings', '⚙️', 'Настройки', 'Тема, единицы, звук, резервная копия']
];

export function render() {
  const root = h('div', { class: 'view' });
  root.appendChild(h('header', { class: 'view-head' }, [h('h1', { text: 'Ещё' })]));
  root.appendChild(h('div', { class: 'list' }, LINKS.map(([href, icon, title, sub]) =>
    h('a', { class: 'list-row big', href }, [
      h('span', { class: 'ex-icon', text: icon }),
      h('div', { class: 'grow' }, [
        h('div', { class: 'list-title', text: title }),
        h('div', { class: 'muted small', text: sub })
      ]),
      h('span', { class: 'chev', text: '›' })
    ]))));

  root.appendChild(h('section', { class: 'card' }, [
    h('div', { class: 'row between center' }, [
      h('h3', { class: 'card-title', text: 'Коротко о приложении' }),
      h('span', { class: 'pill', text: 'v' + VERSION })
    ]),
    h('p', { class: 'muted small', text: `${S.allExercises().length} упражнений с техникой и видео, ${S.allPrograms().length} программ, дневник, статистика и таймеры. Без рекламы, без подписки, без аккаунта — все данные остаются на вашем устройстве.` }),
    h('button', {
      class: 'btn ghost small', text: '🔄 Обновить до последней версии', onClick: async () => {
        toast('Загружаю свежую версию…');
        await forceUpdate();
      }
    })
  ]));
  return root;
}
