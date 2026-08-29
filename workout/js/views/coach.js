import { h, toast, sheet, confirmDialog, promptDialog, esc, plural } from '../ui.js';
import * as S from '../store.js';
import * as Coach from '../coach.js';
import * as AI from '../ai.js';

let controller = null;

export function render() {
  const root = h('div', { class: 'view coach-view' });

  root.appendChild(h('header', { class: 'view-head' }, [
    h('div', { class: 'row between center' }, [
      h('h1', { text: '💬 Тренер' }),
      h('button', { class: 'icon-btn', text: '⚙️', onClick: settingsSheet })
    ]),
    h('p', { class: 'muted', text: 'Спросите, что делать сегодня — тренер учитывает ваш план недели, историю и нагрузку.' })
  ]));

  // Быстрые вопросы
  const chips = h('div', { class: 'scroll-chips' }, Coach.QUICK_ASKS.map(q =>
    h('button', { class: 'chip tap', text: q.label, onClick: () => askOffline(q) })));
  root.appendChild(chips);

  const thread = h('div', { class: 'chat' });
  root.appendChild(thread);

  // Поле ввода (работает при подключённом Клоде)
  const input = h('textarea', { class: 'input area chat-input', rows: 2, placeholder: AI.hasKey()
    ? 'Спросите что угодно: «завтра игра утром, что сделать сегодня?»'
    : 'Подключите Клода, чтобы задавать свои вопросы' });
  const sendBtn = h('button', { class: 'btn', text: '↑', title: 'Отправить' });
  const composer = h('div', { class: 'composer' }, [input, sendBtn]);

  const connectCard = h('section', { class: 'card info' }, [
    h('h3', { class: 'card-title', text: 'Свои вопросы — через Клода' }),
    h('p', { class: 'muted small', text: 'Кнопки выше работают всегда и бесплатно. Чтобы задавать любые вопросы своими словами, подключите Клода: понадобится ключ API от Anthropic (платный, примерно 2–4 рубля за ответ).' }),
    h('button', { class: 'btn small', text: 'Подключить', onClick: settingsSheet })
  ]);

  root.appendChild(AI.hasKey() ? composer : connectCard);

  sendBtn.addEventListener('click', () => send());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  });

  paint();

  // ---------------------------------------------------------------- отрисовка
  function paint() {
    thread.innerHTML = '';
    const msgs = S.state.chat || [];
    if (!msgs.length) {
      thread.appendChild(h('div', { class: 'card' }, [
        h('h3', { class: 'card-title', text: 'С чего начнём?' }),
        h('p', { class: 'muted small', text: 'Нажмите вопрос выше — тренер сразу предложит готовую тренировку, которую можно запустить одной кнопкой. Например: «Завтра футбол — что сегодня?»' })
      ]));
      return;
    }
    msgs.forEach((m, i) => thread.appendChild(bubble(m, i)));
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  }

  function bubble(m, idx) {
    if (m.role === 'user') return h('div', { class: 'msg user' }, [h('div', { class: 'msg-text', text: m.text })]);

    const node = h('div', { class: 'msg coach' }, [
      h('div', { class: 'msg-text', html: formatText(m.text || '') })
    ]);
    if (m.workout) node.appendChild(workoutCard(m.workout));
    if (m.program) node.appendChild(programCard(m.program));
    if (m.error) node.classList.add('error');
    return node;
  }

  function workoutCard(w) {
    return h('div', { class: 'card workout-suggest' }, [
      h('div', { class: 'row between center' }, [
        h('h3', { class: 'card-title', text: w.title }),
        w.minutes ? h('span', { class: 'pill', text: `~${w.minutes} мин` }) : null
      ]),
      h('div', { class: 'list' }, w.items.map(i => {
        const e = S.exerciseById(i.id);
        return h('a', { class: 'list-row', href: `#/exercise/${i.id}` }, [
          h('div', { class: 'grow' }, [
            h('div', { class: 'list-title', text: e ? e.name : i.id }),
            h('div', { class: 'muted small', text: `${i.sets} × ${i.reps}${i.rest ? ' · отдых ' + i.rest + ' с' : ''}${i.note ? ' · ' + i.note : ''}` })
          ]),
          h('span', { class: 'chev', text: '›' })
        ]);
      })),
      w.why && w.why.length ? h('details', { class: 'why' }, [
        h('summary', { text: 'Почему именно так' }),
        h('ul', { class: 'bullets' }, w.why.map(t => h('li', { text: t })))
      ]) : null,
      w.tips && w.tips.length ? h('ul', { class: 'bullets muted small' }, w.tips.map(t => h('li', { text: t }))) : null,
      h('button', {
        class: 'btn block', text: '▶︎ Начать эту тренировку', onClick: async () => {
          if (S.state.session && !await confirmDialog('Есть незавершённая тренировка', 'Начать новую? Текущая будет потеряна.', 'Начать новую')) return;
          Coach.startWorkout(w);
          location.hash = '#/workout';
        }
      })
    ]);
  }

  function programCard(p) {
    return h('div', { class: 'card workout-suggest' }, [
      h('h3', { class: 'card-title', text: p.title }),
      h('div', { class: 'row gap wrap' }, [
        h('button', {
          class: 'btn', text: '▶︎ Начать', onClick: async () => {
            if (S.state.session && !await confirmDialog('Есть незавершённая тренировка', 'Начать новую?', 'Начать новую')) return;
            S.startSession({ programId: p.id, dayIndex: p.dayIndex || 0 });
            location.hash = '#/workout';
          }
        }),
        h('a', { class: 'btn ghost', href: `#/program/${p.id}`, text: 'Посмотреть план' })
      ])
    ]);
  }

  // ---------------------------------------------------------------- действия
  function push(msg) {
    S.state.chat = (S.state.chat || []).concat([{ ...msg, ts: Date.now() }]).slice(-40);
    S.save(false);
    paint();
  }

  function askOffline(q) {
    push({ role: 'user', text: q.label });
    const res = Coach.answer(q.id);
    const w = res.workout;
    push({
      role: 'coach',
      text: res.text ? res.text.join('\n\n') : (w ? `Вот что предлагаю: **${w.title}**, примерно ${w.minutes} минут.` : ''),
      workout: w || null,
      program: res.program || null
    });
  }

  async function send() {
    const text = input.value.trim();
    if (!text) return;
    if (!AI.hasKey()) return settingsSheet();
    input.value = '';
    push({ role: 'user', text });

    // Пустой ответ, который будем наполнять по мере генерации
    const placeholder = { role: 'coach', text: '', streaming: true };
    S.state.chat.push({ ...placeholder, ts: Date.now() });
    paint();
    const idx = S.state.chat.length - 1;
    const node = thread.lastChild;
    const textNode = node ? node.querySelector('.msg-text') : null;
    if (textNode) textNode.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';

    // Для модели отправляем только переписку без служебных полей
    const history = S.state.chat.slice(0, -1).filter(m => m.text).slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    controller = new AbortController();
    sendBtn.disabled = true;
    try {
      const { text: full } = await AI.ask({
        messages: history,
        signal: controller.signal,
        onDelta: (_, acc) => { if (textNode) textNode.innerHTML = formatText(acc); }
      });
      const { clean, workout } = AI.extractWorkout(full);
      S.state.chat[idx] = { role: 'coach', text: clean, workout, ts: Date.now(), ai: true };
      S.save(false);
      paint();
    } catch (e) {
      if (e.name === 'AbortError') { S.state.chat.splice(idx, 1); S.save(false); paint(); return; }
      S.state.chat[idx] = { role: 'coach', text: '⚠️ ' + e.message, error: true, ts: Date.now() };
      S.save(false);
      paint();
      if (e.kind === 'nokey' || e.kind === 'auth') settingsSheet();
    } finally {
      sendBtn.disabled = false;
      controller = null;
    }
  }

  return root;
}

// ------------------------------------------------------------------ настройки
function settingsSheet() {
  const keyInput = h('input', { class: 'input', type: 'password', value: AI.getKey(), placeholder: 'sk-ant-…', autocomplete: 'off', spellcheck: 'false' });
  const modelSel = h('select', { class: 'input select' }, AI.MODELS.map(m =>
    h('option', { value: m.id, text: `${m.name} — ${m.note}` })));
  modelSel.value = S.state.settings.aiModel || 'claude-opus-5';

  const body = h('div', { class: 'stack' }, [
    h('p', { class: 'small', text: 'Кнопки с готовыми вопросами работают всегда и бесплатно. Ключ нужен только для свободного диалога.' }),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Ключ API Anthropic' }), keyInput]),
    h('p', { class: 'muted small', text: 'Получить: console.anthropic.com → Settings → API keys. Это платный сервис Anthropic, оплата по факту использования — один ответ тренера стоит примерно 2–4 рубля.' }),
    h('label', { class: 'field' }, [h('span', { class: 'label', text: 'Модель' }), modelSel]),
    h('p', { class: 'muted small', text: 'Ключ хранится только в этом браузере и отправляется напрямую в Anthropic — приложение не имеет сервера и никуда его не пересылает. Не используйте ключ с высоким лимитом на чужом устройстве.' }),
    h('button', {
      class: 'btn ghost block', text: '🗑 Очистить переписку', onClick: async () => {
        if (!await confirmDialog('Очистить переписку?', 'История диалога с тренером будет удалена.', 'Очистить')) return;
        S.state.chat = []; S.save(false);
        sh.close();
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    })
  ]);

  const sh = sheet('Настройки тренера', body, {
    actions: [
      h('button', { class: 'btn ghost', text: 'Отмена', onClick: () => sh.close() }),
      h('button', {
        class: 'btn', text: 'Сохранить', onClick: () => {
          AI.setKey(keyInput.value);
          S.state.settings.aiModel = modelSel.value;
          S.save(false);
          sh.close();
          toast(keyInput.value.trim() ? 'Клод подключён' : 'Ключ удалён');
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
      })
    ]
  });
}

// ------------------------------------------------------------------ текст
function formatText(text) {
  const safe = esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return safe.split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) {
      return '<ul>' + lines.map(l => `<li>${l.replace(/^\s*[-•]\s+/, '')}</li>`).join('') + '</ul>';
    }
    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
}
