// Общение с Клодом напрямую из браузера.
//
// Приложение — статический сайт без сборки и с офлайн-режимом, поэтому официальный
// SDK (@anthropic-ai/sdk) сюда не подключить без бандлера и внешнего CDN. Используем
// прямые HTTP-запросы к Messages API в задокументированном формате.
// Ключ хранится только в этом браузере и уходит исключительно на api.anthropic.com.
import * as S from './store.js';
import { context } from './coach.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY_STORE = 'fitpro.apikey';

export const MODELS = [
  { id: 'claude-opus-5', name: 'Claude Opus 5', note: 'самый умный, дороже' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', note: 'дешевле, быстрее' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', note: 'самый дешёвый' }
];

export function getKey() {
  try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; }
}
export function setKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORE, key.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch (e) {}
}
export function hasKey() { return !!getKey(); }

// ------------------------------------------------------------------ подсказка модели
function exerciseCatalogue() {
  return S.allExercises().map(e => `${e.id}|${e.name}`).join('\n');
}

const RULES = `Ты — опытный тренер по силовой подготовке и футболу. Отвечаешь внутри мобильного приложения-дневника тренировок.

Как отвечать:
- Только по-русски, коротко и по делу: 3–6 предложений или короткий список. Без вступлений вроде «отличный вопрос».
- Всегда объясняй «почему» одним-двумя предложениями: пользователь должен понимать логику, а не просто получать список.
- Учитывай план недели, историю тренировок и нагрузку, которые даны ниже. Ссылайся на них конкретно («завтра у вас игра», «на этой неделе уже две тяжёлых»).
- За 24 часа до игры: никаких тяжёлых приседов, выпадов, становой и плиометрики. Можно верх тела, кор, мобильность и короткие ускорения по нарастающей.
- В день после игры: восстановление — лёгкое кардио и растяжка, без силовой работы до отказа.
- Не давай медицинских советов. При острой или точечной боли советуй обратиться к врачу и не тренировать это место.
- Не выдумывай данные о пользователе, которых нет в контексте. Если чего-то не хватает — спроси одним вопросом.

Если уместно предложить конкретную тренировку, добавь в конце ответа блок:
\`\`\`workout
{"title": "Название", "minutes": 30, "items": [{"id": "ид_упражнения", "sets": 3, "reps": "10-12", "rest": 90, "note": "необязательно"}]}
\`\`\`
Правила блока: используй ТОЛЬКО идентификаторы из каталога ниже, 4–9 упражнений, поле reps — строка. Один блок на ответ, без пояснений внутри блока. Если тренировка не нужна (вопрос теоретический или нужен отдых) — блок не добавляй.

Каталог упражнений (идентификатор|название):
`;

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/** Меняющаяся часть подсказки: кто пользователь, что в плане, что было. */
export function userContextBlock() {
  const ctx = context();
  const lines = [];
  const now = new Date();
  lines.push(`Сегодня: ${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
  if (ctx.profile && ctx.profile.name) lines.push(`Пользователь: ${ctx.profile.name}.`);
  lines.push(`Обычно тренируется: ${{ gym: 'в зале', home: 'дома', outdoor: 'на улице' }[ctx.place] || 'в зале'}.`);
  lines.push(`Цель по частоте: ${ctx.goal} тренировок в неделю, на этой неделе уже ${ctx.week}.`);

  const ap = S.state.activeProgram ? S.programById(S.state.activeProgram.id) : null;
  if (ap) {
    const di = (S.state.activeProgram.nextDay || 0) % ap.days.length;
    lines.push(`Активная программа: «${ap.name}», следующий день — «${ap.days[di].title}».`);
  } else lines.push('Активной программы нет.');

  const plan = S.WEEKDAYS.map(d => {
    const l = S.planLabel(S.planFor(d.n));
    return `${d.short}: ${l ? l.title : '—'}`;
  }).join(', ');
  lines.push(`План недели: ${plan}.`);

  const t = S.planLabel(S.todayPlan());
  const tm = S.planLabel(S.tomorrowPlan());
  lines.push(`Сегодня по плану: ${t ? t.title : 'ничего не задано'}. Завтра: ${tm ? tm.title : 'ничего не задано'}.`);

  if (ctx.hist.length) {
    lines.push('Последние тренировки (свежие сверху):');
    ctx.hist.forEach(s => {
      if (s.kind === 'football') {
        lines.push(`- ${fmtDate(s.endedAt || s.startedAt)}: ${s.title}, ${s.minutes} мин, тяжесть ${s.rpe || '?'}/10` +
          (s.goals ? `, голов ${s.goals}` : ''));
      } else {
        const names = (s.items || []).map(i => (S.exerciseById(i.exId) || {}).name).filter(Boolean).slice(0, 6).join(', ');
        lines.push(`- ${fmtDate(s.endedAt || s.startedAt)}: ${s.title}, ${S.sessionSets(s)} подходов, ${Math.round(S.sessionVolume(s))} кг` +
          (s.rpe ? `, тяжесть ${s.rpe}/10` : '') + (names ? ` (${names})` : ''));
      }
    });
  } else lines.push('История тренировок пока пустая.');

  const zone = { none: 'данных мало', low: 'ниже обычной', ok: 'в норме', warn: 'растёт быстро', high: 'резкий скачок, риск перегруза' }[ctx.load.zone];
  lines.push(`Тренировочная нагрузка: за 7 дней ${ctx.load.acute}, средняя неделя ${ctx.load.chronic}, оценка — ${zone}.`);

  return lines.join('\n');
}

// ------------------------------------------------------------------ запрос
export class AiError extends Error {
  constructor(message, kind) { super(message); this.kind = kind; }
}

/**
 * Отправляет переписку в Messages API и отдаёт текст по мере генерации.
 * @param {{messages: Array, onDelta: Function, signal: AbortSignal}} opts
 */
export async function ask({ messages, onDelta, signal }) {
  const key = getKey();
  if (!key) throw new AiError('Не добавлен ключ API', 'nokey');

  const model = S.state.settings.aiModel || 'claude-opus-5';
  const body = {
    model,
    max_tokens: 4000,
    stream: true,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: [
      // Стабильная часть — кэшируется на стороне API и удешевляет следующие вопросы.
      { type: 'text', text: RULES + exerciseCatalogue(), cache_control: { type: 'ephemeral' } },
      { type: 'text', text: 'Контекст пользователя:\n' + userContextBlock() }
    ],
    messages
  };
  // Если модель откажется отвечать по политике, запрос автоматически переедет на запасную.
  if (model === 'claude-opus-5') body.fallbacks = 'default';

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        ...(model === 'claude-opus-5' ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new AiError('Нет связи с сервером. Проверьте интернет.', 'network');
  }

  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) {}
    if (res.status === 401) throw new AiError('Ключ API не принят. Проверьте его в настройках тренера.', 'auth');
    if (res.status === 400 && /credit|balance/i.test(detail)) throw new AiError('На балансе Anthropic закончились средства.', 'billing');
    if (res.status === 429) throw new AiError('Слишком много запросов подряд. Попробуйте через минуту.', 'rate');
    if (res.status >= 500) throw new AiError('Сервер Anthropic временно недоступен.', 'server');
    throw new AiError(detail || `Ошибка запроса (${res.status})`, 'api');
  }

  // Разбор потока событий (SSE)
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', text = '', stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      const line = part.split('\n').find(l => l.startsWith('data:'));
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
        text += ev.delta.text;
        if (onDelta) onDelta(ev.delta.text, text);
      } else if (ev.type === 'message_delta' && ev.delta) {
        stopReason = ev.delta.stop_reason || stopReason;
      } else if (ev.type === 'error') {
        throw new AiError((ev.error && ev.error.message) || 'Ошибка потока', 'api');
      }
    }
  }

  if (stopReason === 'refusal') {
    throw new AiError('Модель не смогла ответить на этот запрос. Переформулируйте вопрос.', 'refusal');
  }
  return { text, stopReason };
}

// ------------------------------------------------------------------ разбор тренировки
/** Достаёт из ответа блок ```workout и превращает его в тренировку приложения. */
export function extractWorkout(text) {
  const m = text.match(/```workout\s*([\s\S]*?)```/i);
  if (!m) return { clean: text.trim(), workout: null };
  let parsed = null;
  try { parsed = JSON.parse(m[1].trim()); } catch (e) { parsed = null; }
  const clean = text.replace(m[0], '').trim();
  if (!parsed || !Array.isArray(parsed.items)) return { clean, workout: null };

  const items = parsed.items
    .map(i => ({
      id: String(i.id || '').trim(),
      sets: Math.max(1, Math.min(10, parseInt(i.sets, 10) || 3)),
      reps: String(i.reps ?? '10-12'),
      rest: Math.max(0, Math.min(600, parseInt(i.rest, 10) || 90)),
      note: String(i.note || '')
    }))
    .filter(i => S.exerciseById(i.id));

  if (!items.length) return { clean, workout: null };
  return {
    clean,
    workout: {
      title: String(parsed.title || 'Тренировка от тренера').slice(0, 60),
      minutes: parseInt(parsed.minutes, 10) || null,
      items,
      fromAi: true
    }
  };
}
