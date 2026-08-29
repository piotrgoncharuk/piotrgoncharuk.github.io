// Встроенный тренер: подбирает тренировку по ситуации без интернета и без ключей.
import * as S from './store.js';

const ex = (id, sets, reps, rest, note = '') => ({ id, sets, reps, rest, note });

/** Контекст пользователя — им пользуются и офлайн-тренер, и запрос к Клоду. */
export function context() {
  const today = S.todayPlan();
  const tomorrow = S.tomorrowPlan();
  const hist = S.state.history.slice(-8).reverse();
  const last = hist[0] || null;
  const daysSince = last ? Math.floor((Date.now() - (last.endedAt || last.startedAt)) / 864e5) : null;
  const yesterdayFootball = hist.some(s => s.kind === 'football' &&
    Math.floor((Date.now() - (s.endedAt || s.startedAt)) / 864e5) <= 1);
  const load = S.acwr();
  return {
    profile: S.activeProfile(),
    place: S.state.settings.place || 'gym',
    today, tomorrow, hist, last, daysSince, yesterdayFootball, load,
    week: S.thisWeekSessions().length,
    goal: S.state.settings.weeklyGoal
  };
}

function isFootball(entry) { return !!entry && entry.type === 'football'; }

// ------------------------------------------------------------------ сценарии
const SCENARIOS = {
  pre_match: (ctx) => ({
    title: 'Лёгкая активация перед игрой',
    minutes: 30,
    why: [
      'Завтра футбол, поэтому сегодня главное — не забить ноги: никаких тяжёлых приседов, выпадов и прыжков.',
      'Короткие ускорения включают нервную систему, но почти не утомляют — завтра будете быстрее, а не «деревяннее».',
      'Верх тела и кор можно нагрузить спокойно: они не мешают бегу.',
      'Заканчиваем растяжкой сгибателей бедра и задней поверхности — именно они дают ощущение «забитых» ног.'
    ],
    items: [
      ex('worlds_greatest', 2, '6 на сторону', 30, 'Разминка'),
      ex('glute_bridge', 2, '15', 30, 'Активация ягодиц'),
      ex('fb_sprints', 4, '20 м', 90, 'По нарастающей: 60-70-80-85%, не в полную силу'),
      ex('ph_single_leg_balance', 2, '30 сек на ногу', 30),
      ex('db_bench_press', 3, '10-12', 90, 'Средний вес, 2 повтора в запасе'),
      ex('db_row', 3, '10-12', 90),
      ex('plank', 3, '40 сек', 45),
      ex('hip_flexor_stretch', 2, '40 сек на сторону', 20, 'Обязательно'),
      ex('hamstring_stretch', 2, '40 сек', 20)
    ],
    tips: ['Ни одного подхода до отказа.', 'Если чувствуете тяжесть в ногах — уберите ускорения и оставьте только растяжку.']
  }),

  post_match: () => ({
    title: 'Восстановление после игры',
    minutes: 25,
    why: [
      'После матча мышцы уже получили нагрузку — добавлять силовую сегодня смысла нет.',
      'Лёгкая аэробная работа разгоняет кровь и ускоряет восстановление лучше, чем полный покой.',
      'Растяжка снимает то самое ощущение «деревянных» ног на следующий день.'
    ],
    items: [
      ex('fb_tempo_run', 1, '15 мин', 60, 'Очень лёгкий темп, можно спокойно разговаривать'),
      ex('cat_cow', 2, '10', 20),
      ex('figure_four', 2, '40 сек на сторону', 15),
      ex('hip_flexor_stretch', 2, '40 сек на сторону', 15),
      ex('hamstring_stretch', 2, '40 сек', 15),
      ex('quad_stretch', 2, '30 сек на ногу', 15),
      ex('child_pose', 2, '45 сек', 15)
    ],
    tips: ['Сон и еда сегодня важнее любой тренировки.', 'Если что-то болит резко и точечно — это не «забитость», дайте отдых и покажитесь врачу.']
  }),

  short20: (ctx) => ({
    title: 'Круговая на 20 минут',
    minutes: 20,
    why: [
      'Три круга без длинных пауз дают и силовую нагрузку, и пульс.',
      'Упражнения не требуют оборудования, поэтому подойдут где угодно.'
    ],
    items: [
      ex('jumping_jack', 1, '60 сек', 20, 'Разминка'),
      ex('air_squat', 3, '15', 20, 'Круг 1/4'),
      ex('pushup', 3, '10-15', 20, 'Круг 2/4'),
      ex('inverted_row', 3, '10', 20, 'Круг 3/4 (или тяга резины)'),
      ex('plank', 3, '40 сек', 90, 'Круг 4/4, затем отдых 90 секунд')
    ],
    tips: ['Отдых внутри круга — только на переход между упражнениями.']
  }),

  tired: () => ({
    title: 'Лёгкий день: мобильность',
    minutes: 15,
    why: [
      'Недосып и усталость снижают качество тренировки и повышают риск травмы — тяжёлая работа сегодня даст меньше, чем отнимет.',
      'Мобильность и дыхание помогают восстановиться и сохраняют привычку тренироваться.'
    ],
    items: [
      ex('cat_cow', 2, '10-12', 20),
      ex('worlds_greatest', 2, '6 на сторону', 20),
      ex('thoracic_rotation', 2, '10 на сторону', 20),
      ex('figure_four', 2, '40 сек на сторону', 15),
      ex('child_pose', 2, '45 сек', 15)
    ],
    tips: ['Добавьте 20–30 минут спокойной ходьбы — этого сегодня достаточно.']
  }),

  home_none: () => ({
    title: 'Дома без оборудования',
    minutes: 35,
    why: ['Полноценная работа на всё тело: толчок, тяга, ноги и кор.'],
    items: [
      ex('jumping_jack', 1, '60 сек', 20, 'Разминка'),
      ex('air_squat', 4, '15-20', 60),
      ex('pushup', 4, '10-20', 60),
      ex('lunge', 3, '10 на ногу', 60),
      ex('inverted_row', 3, '10-15', 60, 'Под столом или на низкой перекладине'),
      ex('glute_bridge', 3, '15-20', 45),
      ex('plank', 3, '40 сек', 45),
      ex('dead_bug', 3, '10 на сторону', 45)
    ],
    tips: ['Замедляйте опускание до 3 секунд — так вес тела становится тяжелее.']
  }),

  legs: () => ({
    title: 'Ноги: силовая',
    minutes: 55,
    why: ['Базовое движение + тазовый толчок + односторонняя работа закрывают всю нижнюю часть тела.'],
    items: [
      ex('worlds_greatest', 1, '6 на сторону', 30, 'Разминка'),
      ex('back_squat', 4, '6-8', 150),
      ex('romanian_deadlift', 3, '8-10', 120),
      ex('bulgarian_split_squat', 3, '8-10 на ногу', 90),
      ex('leg_curl', 3, '10-15', 75),
      ex('calf_raise', 4, '15-20', 45),
      ex('plank', 3, '45 сек', 45)
    ],
    tips: ['Не ставьте такую тренировку за 48 часов до игры.']
  }),

  upper: () => ({
    title: 'Верх тела',
    minutes: 50,
    why: ['Жим и тяга в равном объёме — так плечи остаются здоровыми.'],
    items: [
      ex('pushup', 2, '10', 45, 'Разминка'),
      ex('db_bench_press', 4, '8-12', 120),
      ex('barbell_row', 4, '8-12', 120),
      ex('db_shoulder_press', 3, '10-12', 90),
      ex('lat_pulldown', 3, '10-12', 90),
      ex('lateral_raise', 3, '12-20', 60),
      ex('face_pull', 3, '15-20', 60),
      ex('hammer_curl', 3, '10-12', 60),
      ex('triceps_pushdown', 3, '12-15', 60)
    ],
    tips: []
  }),

  core: () => ({
    title: 'Кор и пресс',
    minutes: 20,
    why: ['Стабилизация и динамика вместе: кор любит частоту, а не изнурение.'],
    items: [
      ex('plank', 3, '40 сек', 40),
      ex('side_plank', 3, '30 сек на сторону', 40),
      ex('dead_bug', 3, '10 на сторону', 40),
      ex('lying_leg_raise', 3, '12-20', 40),
      ex('bicycle_crunch', 3, '20-30', 40)
    ],
    tips: []
  }),

  football_skill: () => ({
    title: 'Индивидуальная работа с мячом',
    minutes: 40,
    why: ['Техника растёт от количества касаний, а не от усталости — работаем свежими.'],
    items: [
      ex('fb_juggling', 3, '2 мин', 45, 'Разминка с мячом'),
      ex('fb_first_touch', 4, '2 мин', 60),
      ex('fb_dribble_cones', 5, '1 проход', 45),
      ex('fb_1v1_moves', 5, '6 подходов', 45),
      ex('fb_pass_wall', 3, '60 пасов', 60),
      ex('fb_shooting', 4, '10 ударов', 60)
    ],
    tips: ['Голову держите поднятой — это главное отличие тренировки от «просто потыкать мяч».']
  })
};

export const QUICK_ASKS = [
  { id: 'auto', label: 'Что мне сегодня делать?' },
  { id: 'pre_match', label: 'Завтра футбол — что сегодня?' },
  { id: 'post_match', label: 'Сегодня была игра' },
  { id: 'short20', label: 'Есть только 20 минут' },
  { id: 'tired', label: 'Устал, не выспался' },
  { id: 'home_none', label: 'Дома, без оборудования' },
  { id: 'legs', label: 'Хочу ноги' },
  { id: 'upper', label: 'Хочу верх тела' },
  { id: 'core', label: 'Пресс и кор' },
  { id: 'football_skill', label: 'Поработать с мячом' }
];

/** Подбирает сценарий по ситуации, когда пользователь спрашивает «что сегодня». */
export function autoScenario(ctx = context()) {
  if (isFootball(ctx.today)) return 'today_football';
  if (isFootball(ctx.tomorrow)) return 'pre_match';
  if (ctx.yesterdayFootball) return 'post_match';
  if (ctx.load.zone === 'high') return 'tired';
  if (ctx.today && ctx.today.type === 'rest') return 'rest_day';
  if (ctx.today && (ctx.today.type === 'program' || ctx.today.type === 'program_auto')) return 'today_program';
  if (ctx.place === 'home') return 'home_none';
  return 'upper';
}

/** Возвращает готовый ответ тренера: текст + при необходимости тренировку. */
export function answer(scenarioId, ctx = context()) {
  const id = scenarioId === 'auto' ? autoScenario(ctx) : scenarioId;

  if (id === 'today_football') {
    const label = S.planLabel(ctx.today);
    return {
      text: [
        `Сегодня по плану ${label.title.toLowerCase()} — это и есть ваша основная нагрузка.`,
        'Перед выходом на поле сделайте разминку: 4 минуты лёгкого бега, динамическая растяжка, активация ягодиц и 3–4 ускорения по нарастающей.',
        'После игры отметьте её во вкладке «Футбол» — приложение посчитает нагрузку.'
      ],
      program: { id: 'fb_warmup', dayIndex: 0, title: 'Разминка перед матчем' }
    };
  }

  if (id === 'rest_day') {
    return {
      text: [
        'Сегодня по плану отдых — и это часть тренировки, а не пропуск: мышцы растут именно в дни восстановления.',
        'Если очень хочется подвигаться, подойдёт спокойная прогулка 30–40 минут или лёгкая растяжка.'
      ],
      workout: buildWorkout('tired', ctx)
    };
  }

  if (id === 'today_program') {
    const label = S.planLabel(ctx.today);
    const entry = ctx.today;
    const programId = entry.type === 'program' ? entry.programId : (S.state.activeProgram || {}).id;
    const dayIndex = entry.type === 'program' ? entry.dayIndex
      : ((S.state.activeProgram || {}).nextDay || 0);
    return {
      text: [
        `Сегодня по плану: ${label.title}${label.sub ? ' (' + label.sub + ')' : ''}.`,
        ctx.load.zone === 'warn' ? 'Нагрузка на этой неделе выше обычной — оставьте 2 повтора в запасе в каждом подходе.' : 'Держите 1–2 повтора в запасе в рабочих подходах, это лучший режим для прогресса.'
      ],
      program: programId ? { id: programId, dayIndex, title: label.title } : null
    };
  }

  return { workout: buildWorkout(id, ctx) };
}

export function buildWorkout(scenarioId, ctx = context()) {
  const make = SCENARIOS[scenarioId] || SCENARIOS.upper;
  const w = make(ctx);
  return {
    ...w,
    scenario: scenarioId,
    items: w.items.filter(i => S.exerciseById(i.id))
  };
}

/** Превращает предложение тренера в запущенную тренировку. */
export function startWorkout(workout) {
  S.startSession({
    title: workout.title,
    items: workout.items.map(i => {
      const last = S.lastPerformance(i.id);
      return {
        exId: i.id,
        note: i.note || '',
        targetReps: i.reps,
        targetRest: i.rest,
        lastHint: last ? last.sets.map(x => `${x.w ? x.w + '×' : ''}${x.r}`).join(', ') : null,
        sets: Array.from({ length: i.sets }, () => ({
          w: last && last.sets.length ? last.sets[last.sets.length - 1].w : null,
          r: null, done: false, type: 'work'
        }))
      };
    })
  });
}
