// Готовые программы тренировок.
// item: [id упражнения, подходы, повторы, отдых(сек), заметка?, суперсет-группа?]
import { FOOTBALL_PROGRAMS } from './football.js';

const it = (id, sets, reps, rest, note = '', ss = null) => ({ id, sets, reps, rest, note, ss });

const BASE_PROGRAMS = [
  {
    id: 'fullbody_start',
    name: 'Старт: всё тело',
    short: 'Первая программа новичка',
    goal: 'Мышцы и общая форма',
    level: 1,
    daysPerWeek: 3,
    weeks: 8,
    place: 'Зал',
    equipment: ['штанга', 'гантели', 'тренажёр'],
    color: '#4f8cff',
    about: 'Классическая схема для тех, кто начинает с нуля или возвращается после перерыва. Каждая тренировка прорабатывает всё тело, поэтому даже 3 занятия в неделю дают быстрый прогресс.',
    progression: 'Держите 1–2 повтора в запасе. Если в последнем подходе выполнили верхнюю границу повторов во всех подходах — добавьте 2.5 кг (для верха тела) или 5 кг (для низа) на следующей тренировке.',
    schedule: 'Пн / Ср / Пт — между тренировками минимум один день отдыха.',
    days: [
      { title: 'День A', focus: 'Всё тело — присед в фокусе', items: [
        it('worlds_greatest', 1, '6 на сторону', 30, 'Разминка'),
        it('goblet_squat', 4, '10-12', 90),
        it('db_bench_press', 4, '8-12', 90),
        it('seated_row', 4, '10-12', 90),
        it('lateral_raise', 3, '12-15', 60),
        it('plank', 3, '30-45 сек', 45)
      ]},
      { title: 'День B', focus: 'Всё тело — тяга в фокусе', items: [
        it('cat_cow', 1, '10', 30, 'Разминка'),
        it('romanian_deadlift', 4, '8-12', 120),
        it('lat_pulldown', 4, '10-12', 90),
        it('db_shoulder_press', 3, '8-12', 90),
        it('lunge', 3, '10 на ногу', 75),
        it('dead_bug', 3, '10 на сторону', 45)
      ]},
      { title: 'День C', focus: 'Всё тело — жим и руки', items: [
        it('jumping_jack', 1, '45 сек', 30, 'Разминка'),
        it('leg_press', 4, '10-15', 90),
        it('incline_db_press', 4, '8-12', 90),
        it('db_row', 3, '10-12', 90),
        it('db_curl', 3, '10-12', 60, '', 'A'),
        it('triceps_pushdown', 3, '12-15', 60, '', 'A'),
        it('calf_raise', 3, '15-20', 45)
      ]}
    ]
  },

  {
    id: 'upper_lower',
    name: 'Верх / Низ 4 дня',
    short: 'Баланс объёма и восстановления',
    goal: 'Гипертрофия',
    level: 2,
    daysPerWeek: 4,
    weeks: 10,
    place: 'Зал',
    equipment: ['штанга', 'гантели', 'блок', 'тренажёр'],
    color: '#ff7a45',
    about: 'Лучший компромисс для среднего уровня: каждая мышца получает нагрузку дважды в неделю при разумной длительности тренировок (60–75 минут).',
    progression: 'Двойная прогрессия: набрали верх диапазона повторов во всех подходах — поднимайте вес на 2.5–5 кг и возвращайтесь к нижней границе.',
    schedule: 'Пн — Верх, Вт — Низ, Чт — Верх, Пт — Низ.',
    days: [
      { title: 'Верх 1', focus: 'Жимовой акцент', items: [
        it('bench_press', 4, '6-8', 150),
        it('barbell_row', 4, '8-10', 120),
        it('incline_db_press', 3, '10-12', 90),
        it('lat_pulldown', 3, '10-12', 90),
        it('lateral_raise', 4, '12-20', 60, '', 'A'),
        it('face_pull', 4, '15-20', 60, '', 'A'),
        it('triceps_pushdown', 3, '12-15', 60)
      ]},
      { title: 'Низ 1', focus: 'Присед в фокусе', items: [
        it('back_squat', 4, '6-8', 180),
        it('romanian_deadlift', 3, '8-10', 120),
        it('leg_press', 3, '10-12', 120),
        it('leg_curl', 3, '10-15', 75),
        it('calf_raise', 4, '15-20', 45),
        it('hanging_leg_raise', 3, '10-15', 60)
      ]},
      { title: 'Верх 2', focus: 'Тяговый акцент', items: [
        it('pullup', 4, '5-10', 150),
        it('overhead_press', 4, '6-10', 150),
        it('seated_row', 3, '10-12', 90),
        it('db_bench_press', 3, '10-12', 90),
        it('rear_delt_fly', 3, '15-20', 60, '', 'B'),
        it('hammer_curl', 3, '10-12', 60, '', 'B'),
        it('overhead_triceps', 3, '10-15', 60)
      ]},
      { title: 'Низ 2', focus: 'Тазовый акцент', items: [
        it('deadlift', 3, '3-5', 180),
        it('hip_thrust', 4, '8-12', 120),
        it('bulgarian_split_squat', 3, '8-12 на ногу', 90),
        it('leg_extension', 3, '12-15', 60),
        it('calf_raise', 3, '15-20', 45),
        it('ab_wheel', 3, '8-12', 60)
      ]}
    ]
  },

  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    short: 'Максимум объёма, 6 дней',
    goal: 'Гипертрофия',
    level: 3,
    daysPerWeek: 6,
    weeks: 12,
    place: 'Зал',
    equipment: ['штанга', 'гантели', 'блок', 'тренажёр', 'турник'],
    color: '#a855f7',
    about: 'Программа для тех, у кого есть год-два стажа и время на 6 тренировок. Каждая мышечная группа тренируется дважды в неделю с высоким объёмом.',
    progression: 'Первую неделю цикла работайте с запасом 3 повтора, к концу цикла доводите до 1. Каждые 6–8 недель делайте разгрузочную неделю (−40% объёма).',
    schedule: 'Пн Push, Вт Pull, Ср Legs, Чт Push, Пт Pull, Сб Legs, Вс отдых.',
    days: [
      { title: 'Push', focus: 'Грудь, плечи, трицепс', items: [
        it('bench_press', 4, '6-8', 150),
        it('db_shoulder_press', 4, '8-12', 120),
        it('incline_db_press', 3, '10-12', 90),
        it('cable_fly', 3, '12-15', 60),
        it('lateral_raise', 4, '12-20', 60),
        it('skullcrusher', 3, '10-12', 75, '', 'A'),
        it('triceps_pushdown', 3, '12-15', 60, '', 'A')
      ]},
      { title: 'Pull', focus: 'Спина, задняя дельта, бицепс', items: [
        it('pullup', 4, '6-10', 150),
        it('barbell_row', 4, '8-10', 120),
        it('seated_row', 3, '10-12', 90),
        it('straight_arm_pulldown', 3, '12-15', 60),
        it('face_pull', 4, '15-20', 60),
        it('barbell_curl', 3, '8-12', 75, '', 'B'),
        it('hammer_curl', 3, '10-12', 60, '', 'B')
      ]},
      { title: 'Legs', focus: 'Ноги и кор', items: [
        it('back_squat', 4, '6-8', 180),
        it('romanian_deadlift', 4, '8-10', 120),
        it('leg_press', 3, '10-15', 120),
        it('leg_curl', 3, '10-15', 75),
        it('calf_raise', 4, '15-20', 45),
        it('hanging_leg_raise', 3, '10-15', 60)
      ]}
    ]
  },

  {
    id: 'home_bodyweight',
    name: 'Дома без оборудования',
    short: 'Только вес тела, 30 минут',
    goal: 'Форма и выносливость',
    level: 1,
    daysPerWeek: 3,
    weeks: 6,
    place: 'Дом',
    equipment: ['вес тела'],
    color: '#22c55e',
    about: 'Ничего не нужно, кроме коврика и места 2×2 метра. Отлично подходит для старта, командировок и дней, когда до зала не добраться.',
    progression: 'Усложняйте не весом, а техникой: замедляйте негативную фазу до 4 секунд, добавляйте паузы, сокращайте отдых на 10 секунд каждую неделю.',
    schedule: 'Пн / Ср / Пт или через день.',
    days: [
      { title: 'День A', focus: 'Толкающие движения', items: [
        it('jumping_jack', 1, '60 сек', 30, 'Разминка'),
        it('air_squat', 4, '15-20', 60),
        it('pushup', 4, '10-20', 60),
        it('lunge', 3, '10 на ногу', 60),
        it('pike_pushup', 3, '8-12', 60),
        it('plank', 3, '30-45 сек', 45)
      ]},
      { title: 'День B', focus: 'Тянущие движения и кор', items: [
        it('cat_cow', 1, '10', 30, 'Разминка'),
        it('inverted_row', 4, '10-15', 75, 'Стол или низкая перекладина'),
        it('glute_bridge', 4, '15-20', 45),
        it('bench_dip', 3, '10-15', 60),
        it('side_plank', 3, '30 сек на сторону', 45),
        it('dead_bug', 3, '10 на сторону', 45)
      ]},
      { title: 'День C', focus: 'Круговая на всё тело', items: [
        it('high_knees', 1, '45 сек', 20, 'Разминка'),
        it('burpee', 4, '10-12', 60),
        it('jump_squat', 4, '10-15', 60),
        it('diamond_pushup', 3, '8-15', 60),
        it('mountain_climber', 4, '30-45 сек', 45),
        it('hollow_hold', 3, '20-40 сек', 45)
      ]}
    ]
  },

  {
    id: 'home_dumbbells',
    name: 'Дома с гантелями',
    short: 'Пара гантелей — полноценная тренировка',
    goal: 'Мышцы дома',
    level: 2,
    daysPerWeek: 3,
    weeks: 8,
    place: 'Дом',
    equipment: ['гантели', 'вес тела'],
    color: '#0ea5e9',
    about: 'Всё, что нужно — разборные гантели. Программа покрывает все крупные мышечные группы за три занятия в неделю.',
    progression: 'Когда верхняя граница повторов даётся легко, добавьте блин или переходите на односторонние варианты.',
    schedule: 'Пн / Ср / Пт.',
    days: [
      { title: 'День A', focus: 'Ноги и плечи', items: [
        it('worlds_greatest', 1, '6 на сторону', 30, 'Разминка'),
        it('goblet_squat', 4, '10-15', 90),
        it('romanian_deadlift', 4, '10-12', 90, 'С гантелями'),
        it('db_shoulder_press', 3, '8-12', 90),
        it('lateral_raise', 3, '12-20', 60),
        it('russian_twist', 3, '20-30', 45)
      ]},
      { title: 'День B', focus: 'Верх тела', items: [
        it('pushup', 3, '12-20', 60, 'Разминка/активация'),
        it('db_bench_press', 4, '8-12', 90, 'На полу или скамье'),
        it('db_row', 4, '10-12', 75),
        it('arnold_press', 3, '10-12', 75),
        it('hammer_curl', 3, '10-12', 60, '', 'A'),
        it('overhead_triceps', 3, '10-15', 60, '', 'A')
      ]},
      { title: 'День C', focus: 'Ягодицы, кор, кардио', items: [
        it('glute_bridge', 3, '15-20', 45, 'Разминка'),
        it('bulgarian_split_squat', 4, '8-12 на ногу', 90),
        it('single_leg_rdl', 3, '8-10 на ногу', 75),
        it('sumo_squat', 3, '12-15', 75),
        it('thruster', 3, '10-12', 90),
        it('plank', 3, '45 сек', 45)
      ]}
    ]
  },

  {
    id: 'fatloss',
    name: 'Жиросжигание',
    short: 'Силовые + HIIT, 4 дня',
    goal: 'Снижение жира',
    level: 2,
    daysPerWeek: 4,
    weeks: 8,
    place: 'Зал / дом',
    equipment: ['гантели', 'гиря', 'вес тела'],
    color: '#ef4444',
    about: 'Силовая работа сохраняет мышцы, интервалы поднимают расход калорий. Главный фактор всё равно питание — программа даёт тренировочную часть.',
    progression: 'Каждую вторую неделю сокращайте отдых между кругами на 10 секунд либо добавляйте один круг.',
    schedule: 'Пн силовая верх, Вт HIIT, Чт силовая низ, Сб круговая.',
    days: [
      { title: 'Силовая: верх', focus: 'Сохраняем мышцы', items: [
        it('db_bench_press', 4, '8-12', 75),
        it('db_row', 4, '10-12', 75),
        it('db_shoulder_press', 3, '10-12', 60),
        it('lat_pulldown', 3, '10-12', 60),
        it('bench_dip', 3, '12-15', 45, '', 'A'),
        it('db_curl', 3, '12-15', 45, '', 'A')
      ]},
      { title: 'HIIT-интервалы', focus: '20–25 минут', items: [
        it('jumping_jack', 1, '2 мин', 60, 'Разминка'),
        it('burpee', 6, '30 сек', 30, 'Работа 30 / отдых 30'),
        it('kb_swing', 6, '30 сек', 30),
        it('mountain_climber', 6, '30 сек', 30),
        it('steady_cardio', 1, '10 мин', 0, 'Заминка в лёгком темпе')
      ]},
      { title: 'Силовая: низ', focus: 'Крупные мышцы = больше расход', items: [
        it('goblet_squat', 4, '12-15', 75),
        it('romanian_deadlift', 4, '10-12', 75),
        it('lunge', 3, '12 на ногу', 60),
        it('hip_thrust', 3, '12-15', 60),
        it('calf_raise', 3, '15-20', 45),
        it('plank', 3, '45 сек', 45)
      ]},
      { title: 'Круговая', focus: '4 круга без отдыха внутри круга', items: [
        it('thruster', 4, '12', 0, 'Круг 1/5', 'C'),
        it('burpee', 4, '10', 0, 'Круг 2/5', 'C'),
        it('kb_swing', 4, '15', 0, 'Круг 3/5', 'C'),
        it('jump_squat', 4, '12', 0, 'Круг 4/5', 'C'),
        it('mountain_climber', 4, '40 сек', 120, 'Круг 5/5, затем отдых 2 мин', 'C')
      ]}
    ]
  },

  {
    id: 'strength_5x5',
    name: 'Сила 5×5',
    short: 'Базовая сила, 3 дня',
    goal: 'Сила',
    level: 2,
    daysPerWeek: 3,
    weeks: 12,
    place: 'Зал',
    equipment: ['штанга'],
    color: '#f59e0b',
    about: 'Минимум упражнений, максимум результата в базовых движениях. Проверенная десятилетиями линейная прогрессия.',
    progression: 'Выполнили все 5×5 — добавляйте 2.5 кг в жимах и 5 кг в приседе/тяге на следующей тренировке. Три неудачи подряд — сбросьте вес на 10% и идите заново.',
    schedule: 'A / B / A на первой неделе, B / A / B на второй. Отдых между тренировками — день.',
    days: [
      { title: 'Тренировка A', focus: 'Присед, жим, тяга', items: [
        it('back_squat', 5, '5', 180),
        it('bench_press', 5, '5', 180),
        it('barbell_row', 5, '5', 150),
        it('plank', 3, '45 сек', 60)
      ]},
      { title: 'Тренировка B', focus: 'Присед, жим стоя, становая', items: [
        it('back_squat', 5, '5', 180),
        it('overhead_press', 5, '5', 180),
        it('deadlift', 1, '5', 240, 'Один рабочий подход после разминочных'),
        it('hanging_leg_raise', 3, '10', 60)
      ]}
    ]
  },

  {
    id: 'glutes',
    name: 'Ягодицы и ноги',
    short: 'Акцент на нижнюю часть тела',
    goal: 'Форма ног и ягодиц',
    level: 2,
    daysPerWeek: 3,
    weeks: 8,
    place: 'Зал',
    equipment: ['штанга', 'гантели', 'тренажёр', 'резина'],
    color: '#ec4899',
    about: 'Три разные по акценту тренировки: тазовый толчок, присед и односторонняя работа. Верх тела поддерживается двумя упражнениями в неделю.',
    progression: 'В hip thrust добавляйте вес каждую неделю, пока держится техника. В односторонних упражнениях сначала выравнивайте слабую сторону.',
    schedule: 'Пн / Ср / Пт.',
    days: [
      { title: 'Тазовый акцент', focus: 'Ягодицы', items: [
        it('glute_bridge', 2, '15-20', 45, 'Активация'),
        it('hip_thrust', 4, '8-12', 120),
        it('romanian_deadlift', 4, '10-12', 90),
        it('leg_curl', 3, '12-15', 60),
        it('back_extension', 3, '12-15', 60),
        it('side_plank', 3, '30 сек на сторону', 45)
      ]},
      { title: 'Присед', focus: 'Квадрицепс и ягодицы', items: [
        it('worlds_greatest', 1, '6 на сторону', 30, 'Разминка'),
        it('back_squat', 4, '8-10', 150),
        it('leg_press', 3, '12-15', 90, 'Высокая постановка стоп'),
        it('sumo_squat', 3, '12-15', 75),
        it('calf_raise', 4, '15-20', 45),
        it('lat_pulldown', 3, '10-12', 75, 'Поддержка верха тела')
      ]},
      { title: 'Односторонняя', focus: 'Симметрия и стабилизация', items: [
        it('bulgarian_split_squat', 4, '8-12 на ногу', 90),
        it('single_leg_rdl', 3, '8-10 на ногу', 75),
        it('step_up', 3, '10-12 на ногу', 75),
        it('glute_bridge', 3, '15-20', 45),
        it('db_shoulder_press', 3, '10-12', 75, 'Поддержка верха тела'),
        it('dead_bug', 3, '10 на сторону', 45)
      ]}
    ]
  },

  {
    id: 'core15',
    name: 'Пресс за 15 минут',
    short: 'Короткие сессии 5 дней в неделю',
    goal: 'Крепкий кор',
    level: 1,
    daysPerWeek: 5,
    weeks: 4,
    place: 'Где угодно',
    equipment: ['вес тела'],
    color: '#14b8a6',
    about: 'Добавьте к своей основной программе или используйте отдельно. Кор любит частоту, а не изнурительные редкие тренировки.',
    progression: 'Прибавляйте по 5 секунд к статике и по 2 повтора к динамике каждую неделю.',
    schedule: 'Пн–Пт после основной тренировки или утром.',
    days: [
      { title: 'Кор A', focus: 'Стабилизация', items: [
        it('plank', 3, '30-60 сек', 40),
        it('dead_bug', 3, '10 на сторону', 40),
        it('bird_dog', 3, '10 на сторону', 40),
        it('side_plank', 2, '30 сек на сторону', 40)
      ]},
      { title: 'Кор B', focus: 'Динамика', items: [
        it('crunch', 3, '15-25', 40),
        it('lying_leg_raise', 3, '12-20', 40),
        it('bicycle_crunch', 3, '20-30', 40),
        it('russian_twist', 3, '20-30', 40)
      ]},
      { title: 'Кор C', focus: 'Сила кора', items: [
        it('hollow_hold', 3, '20-40 сек', 45),
        it('hanging_leg_raise', 3, '8-15', 60),
        it('ab_wheel', 3, '6-12', 60),
        it('vacuum', 4, '15-20 сек', 30)
      ]}
    ]
  },

  {
    id: 'mobility',
    name: 'Мобильность и осанка',
    short: '10–15 минут каждый день',
    goal: 'Подвижность и здоровье спины',
    level: 1,
    daysPerWeek: 7,
    weeks: 4,
    place: 'Где угодно',
    equipment: ['вес тела', 'нет'],
    color: '#8b5cf6',
    about: 'Комплекс для тех, кто много сидит. Утром — разгоняющий комплекс, вечером — расслабляющий. Можно делать каждый день без риска перетренированности.',
    progression: 'Увеличивайте время удержания, а не силу давления. Никогда не тянитесь через острую боль.',
    schedule: 'Ежедневно, утром или перед сном.',
    days: [
      { title: 'Утренний комплекс', focus: 'Разбудить тело', items: [
        it('cat_cow', 2, '10-12', 20),
        it('worlds_greatest', 2, '6 на сторону', 20),
        it('thoracic_rotation', 2, '10 на сторону', 20),
        it('shoulder_dislocate', 2, '10-12', 20),
        it('glute_bridge', 2, '15', 20)
      ]},
      { title: 'Вечерний комплекс', focus: 'Расслабить и растянуть', items: [
        it('hip_flexor_stretch', 2, '40 сек на сторону', 15),
        it('figure_four', 2, '40 сек на сторону', 15),
        it('hamstring_stretch', 2, '40 сек', 15),
        it('doorway_chest_stretch', 2, '40 сек', 15),
        it('neck_release', 2, '30 сек на сторону', 15),
        it('child_pose', 2, '45 сек', 15)
      ]},
      { title: 'Разминка перед тренировкой', focus: '5–7 минут', items: [
        it('jumping_jack', 1, '60 сек', 20),
        it('cat_cow', 1, '10', 15),
        it('worlds_greatest', 1, '6 на сторону', 15),
        it('air_squat', 2, '12', 20),
        it('shoulder_dislocate', 1, '12', 15)
      ]}
    ]
  }
];

export const PROGRAMS = [...BASE_PROGRAMS, ...FOOTBALL_PROGRAMS];
export const PROG_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p]));
