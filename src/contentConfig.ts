import { Cat, Wind, Waveform, MusicNotes, type IconProps } from '@phosphor-icons/react';
export interface LessonConfig {
  id: string;
  title: string;
  mdxPath: string;
  position: { row: number; column: number };
  prerequisites: string[];
  linkedHomeworks: string[];
  linkedTests: string[];
  linkedChains: string[];
}

export interface HomeworkConfig {
  id: string;
  title: string;
  mdxPath: string;
}
export interface ChainConfig {
  id: string;
  title: string;
  mdxPath: string;
  icon?: React.FC<IconProps>;
}

export const chainsConfig: ChainConfig[] = [
  {
    id: 'chain1',
    title: 'Подготовка тела',
    mdxPath: '/src/content/chains/bodyChain.mdx',
    icon: Cat,
  },
  {
    id: 'chain2',
    title: 'Работа с диафрагмой',
    mdxPath: '/src/content/chains/breathChain.mdx',
    icon: Wind,
  },
  {
    id: 'chain3',
    title: 'Разогрев связок',
    mdxPath: '/src/content/chains/warmingChain.mdx',
    icon: Waveform,
  },
  {
    id: 'chain4',
    title: 'Артикуляция',
    mdxPath: '/src/content/chains/articulationChain.mdx',
    icon: MusicNotes,
  },
  {
    id: 'chain5',
    title: 'Расширение диапазона',
    mdxPath: '/src/content/chains/rangeChain.mdx',
    icon: MusicNotes,
  },
  {
    id: 'chain6',
    title: 'Переход к песне',
    mdxPath: '/src/content/chains/accessChain.mdx',
    icon: MusicNotes,
  },
];

export const homeworksConfig: Record<string, HomeworkConfig> = {
  // Урок 1
  hw_intro_1: {
    id: 'hw_intro_1',
    title: 'Дыхание "Насос"',
    mdxPath: '/src/content/homeworks/l1/pumpHomework1.mdx',
  },
  hw_intro_2: {
    id: 'hw_intro_2',
    title: 'Детектив',
    mdxPath: '/src/content/homeworks/l1/detectiveHomework2.mdx',
  },
  hw_intro_3: {
    id: 'hw_intro_3',
    title: 'Свободная челюсть',
    mdxPath: '/src/content/homeworks/l1/freedomJawHomework3.mdx',
  },

  // Урок 2
  hw_body_1: {
    id: 'hw_body_1',
    title: 'Тряпичная кукла',
    mdxPath: '/src/content/homeworks/l2/dollHomework1.mdx',
  },
  hw_body_2: {
    id: 'hw_body_2',
    title: 'Сброс груза',
    mdxPath: '/src/content/homeworks/l2/cargoHomework2.mdx',
  },
  hw_body_3: {
    id: 'hw_body_3',
    title: 'Сонное лицо',
    mdxPath: '/src/content/homeworks/l2/faceHomework3.mdx',
  },

  // Урок 3
  hw_breath_1: {
    id: 'hw_breath_1',
    title: 'Собачка',
    mdxPath: '/src/content/homeworks/l3/dogHomework1.mdx',
  },
  hw_breath_2: {
    id: 'hw_breath_2',
    title: 'Проколотая шина',
    mdxPath: '/src/content/homeworks/l3/tireHomework.mdx',
  },
  hw_breath_3: {
    id: 'hw_breath_3',
    title: 'Зов через улицу',
    mdxPath: '/src/content/homeworks/l3/callHomework.mdx',
  },

  // Урок 4
  hw_lip_1: {
    id: 'hw_lip_1',
    title: 'Моторчик',
    mdxPath: '/src/content/homeworks/l4/motorHomework1.mdx',
  },
  hw_lip_2: {
    id: 'hw_lip_2',
    title: 'Полицейская сирена',
    mdxPath: '/src/content/homeworks/l4/policeHomework2.mdx',
  },

  // Урок 5
  hw_beat_1: {
    id: 'hw_beat_1',
    title: 'Следи за барабаном',
    mdxPath: '/src/content/homeworks/l5/drumsHomework1.mdx',
  },
  hw_beat_2: {
    id: 'hw_beat_2',
    title: 'Шаг и счет',
    mdxPath: '/src/content/homeworks/l5/scoreHomework2.mdx',
  },
  hw_beat_3: {
    id: 'hw_beat_3',
    title: 'Шаг в пустоту',
    mdxPath: '/src/content/homeworks/l5/emptinessHomework3.mdx',
  },
  hw_beat_4: {
    id: 'hw_beat_4',
    title: 'Ритмический вдох',
    mdxPath: '/src/content/homeworks/l5/inhaleHomework4.mdx',
  },
  hw_beat_5: {
    id: 'hw_beat_5',
    title: 'Скандирование на одной ноте',
    mdxPath: '/src/content/homeworks/l5/scandirovanieHomework5.mdx',
  },

  // Урок 6
  hw_not_1: {
    id: 'hw_not_1',
    title: 'Система координат',
    mdxPath: '/src/content/homeworks/l6/coordsHomework1.mdx',
  },
  hw_not_2: {
    id: 'hw_not_2',
    title: 'Собери нотный стан',
    mdxPath: '/src/content/homeworks/l6/gammaHomework2.mdx',
  },
  hw_not_3: {
    id: 'hw_not_3',
    title: 'Ритмический пульс',
    mdxPath: '/src/content/homeworks/l6/pulseHomework3.mdx',
  },

  // Урок 7
  hw_register_1: {
    id: 'hw_register_1',
    title: 'Скрипучая дверь',
    mdxPath: '/src/content/homeworks/l7/doorHomework1.mdx',
  },
  hw_register_2: {
    id: 'hw_register_2',
    title: 'Сирена',
    mdxPath: '/src/content/homeworks/l7/buzzerHomework2.mdx',
  },
  hw_register_3: {
    id: 'hw_register_3',
    title: 'Тумблер',
    mdxPath: '/src/content/homeworks/l7/tumblerHomework3.mdx',
  },
  hw_register_4: {
    id: 'hw_register_4',
    title: 'Контролируемый срыв',
    mdxPath: '/src/content/homeworks/l7/breakdownHomework4.mdx',
  },
  hw_register_5: {
    id: 'hw_register_5',
    title: 'Поиск Анкера',
    mdxPath: '/src/content/homeworks/l7/ankerHomework5.mdx',
  },

  // Урок 8
  hw_un_1: {
    id: 'hw_un_1',
    title: 'Бытовой унисон',
    mdxPath: '/src/content/homeworks/l8/everydayHomework1.mdx',
  },
  hw_un_2: {
    id: 'hw_un_2',
    title: 'Нотная уборка',
    mdxPath: '/src/content/homeworks/l8/cleanHomework2.mdx',
  },

  // Урок 9
  hw_int_1: {
    id: 'hw_int_1',
    title: 'Радар настроения',
    mdxPath: '/src/content/homeworks/l9/radarMoodHomework1.mdx',
  },
  hw_int_2: {
    id: 'hw_int_2',
    title: 'Звуковая рулетка',
    mdxPath: '/src/content/homeworks/l9/rouletteHomework2.mdx',
  },
  hw_int_3: {
    id: 'hw_int_3',
    title: 'Интервальный тир',
    mdxPath: '/src/content/homeworks/l9/tirHomework3.mdx',
  },
  hw_int_4: {
    id: 'hw_int_4',
    title: 'Ртутные капли',
    mdxPath: '/src/content/homeworks/l9/dropHomework4.mdx',
  },
  hw_int_5: {
    id: 'hw_int_5',
    title: 'Построение снеговиков',
    mdxPath: '/src/content/homeworks/l9/snowmanHomework5.mdx',
  },
  hw_int_7: {
    id: 'hw_int_7',
    title: 'Внутреннее радио',
    mdxPath: '/src/content/homeworks/l9/radioHomework7.mdx',
  },
  hw_int_8: {
    id: 'hw_int_8',
    title: 'Первый «полигон»',
    mdxPath: '/src/content/homeworks/l9/polygonHomework8.mdx',
  },

  // Урок 10
  hw_art_1: {
    id: 'hw_art_1',
    title: 'Правило переноса',
    mdxPath: '/src/content/homeworks/l10/transferRuleHomework1.mdx',
  },
  hw_art_2: {
    id: 'hw_art_2',
    title: 'Спящий пассажир',
    mdxPath: '/src/content/homeworks/l10/sleepingPassengerHomework2.mdx',
  },
  hw_art_3: {
    id: 'hw_art_3',
    title: 'Правило хвоста',
    mdxPath: '/src/content/homeworks/l10/tailRuleHomework3.mdx',
  },
  hw_art_4: {
    id: 'hw_art_4',
    title: 'Скороговорка с акцентом',
    mdxPath: '/src/content/homeworks/l10/patterHomework4.mdx',
  },
  hw_art_5: {
    id: 'hw_art_5',
    title: 'Однотонные гласные',
    mdxPath: '/src/content/homeworks/l10/monophonicVowelsHomework5.mdx',
  },
  hw_art_6: {
    id: 'hw_art_6',
    title: 'Горячая картошка',
    mdxPath: '/src/content/homeworks/l10/hotPotatoHomework6.mdx',
  },
  hw_art_7: {
    id: 'hw_art_7',
    title: 'Фитнес для губ',
    mdxPath: '/src/content/homeworks/l10/fitnessLipsHomework7.mdx',
  },
  hw_art_8: {
    id: 'hw_art_8',
    title: 'Независимый язык',
    mdxPath: '/src/content/homeworks/l10/independenceLanguageHomework8.mdx',
  },
  hw_art_9: {
    id: 'hw_art_9',
    title: 'Битбоксер',
    mdxPath: '/src/content/homeworks/l10/beatboxerHomework9.mdx',
  },

  // Урок 11
  hw_regime_1: {
    id: 'hw_regime_1',
    title: 'Воздушный клапан',
    mdxPath: '/src/content/homeworks/l11/airValveHomework1.mdx',
  },
  hw_regime_2: {
    id: 'hw_regime_2',
    title: 'Динамическая волна',
    mdxPath: '/src/content/homeworks/l11/dynamicWaveHomework2.mdx',
  },
  hw_regime_3: {
    id: 'hw_regime_3',
    title: 'Открытие гласных',
    mdxPath: '/src/content/homeworks/l11/openingVowelsHomework3.mdx',
  },
  hw_regime_4: {
    id: 'hw_regime_4',
    title: 'Вокальная анатомия',
    mdxPath: '/src/content/homeworks/l11/vocalAnatomyHomework4.mdx',
  },
  hw_regime_5: {
    id: 'hw_regime_5',
    title: 'Вокальная раскраска',
    mdxPath: '/src/content/homeworks/l11/regimeHomework5.mdx',
  },

  // Урок 12
  hw_decor_1: {
    id: 'hw_decor_1',
    title: 'Подчинение волны',
    mdxPath: '/src/content/homeworks/l12/submittingWaveHomework1.mdx',
  },
  hw_decor_2: {
    id: 'hw_decor_2',
    title: 'Копирование по частям',
    mdxPath: '/src/content/homeworks/l12/copyPartHomework2.mdx',
  },
  hw_decor_3: {
    id: 'hw_decor_3',
    title: 'Вертолет',
    mdxPath: '/src/content/homeworks/l12/helicopterHomework3.mdx',
  },
  hw_decor_4: {
    id: 'hw_decor_4',
    title: 'Дизайнер звука',
    mdxPath: '/src/content/homeworks/l12/designerHomework4.mdx',
  },

  // Урок 13
  hw_split_1: {
    id: 'hw_split_1',
    title: 'Поиск ложных связок',
    mdxPath: '/src/content/homeworks/l13/searchFalseConnectionsHomework1.mdx',
  },

  // Урок 14
  hw_phras_1: {
    id: 'hw_phras_1',
    title: 'Смещение акцента',
    mdxPath: '/src/content/homeworks/l14/offsetAccentHomework1.mdx',
  },
  hw_phras_2: {
    id: 'hw_phras_2',
    title: 'Одна фраза — пять настроений',
    mdxPath: '/src/content/homeworks/l14/differentMoodsHomework2.mdx',
  },
  hw_phras_3: {
    id: 'hw_phras_3',
    title: 'Режиссер',
    mdxPath: '/src/content/homeworks/l14/directorHomework3.mdx',
  },

  // Урок 15
  hw_din_1: {
    id: 'hw_din_1',
    title: 'Карта динамики',
    mdxPath: '/src/content/homeworks/l15/dynamicMapHomework1.mdx',
  },
  hw_din_2: {
    id: 'hw_din_2',
    title: 'Самолёт',
    mdxPath: '/src/content/homeworks/l15/planeHomework2.mdx',
  },
  hw_din_3: {
    id: 'hw_din_3',
    title: 'В тихом омуте',
    mdxPath: '/src/content/homeworks/l15/poolHomework3.mdx',
  },

  // Урок 16
  hw_story_1: {
    id: 'hw_story_1',
    title: 'Чтец',
    mdxPath: '/src/content/homeworks/l16/writterHomework1.mdx',
  },
  hw_story_2: {
    id: 'hw_story_2',
    title: 'Внутреннее кино',
    mdxPath: '/src/content/homeworks/l16/filmHomework2.mdx',
  },

  // Урок 17
  hw_micro_1: {
    id: 'hw_micro_1',
    title: 'Разговор свечи',
    mdxPath: '/src/content/homeworks/l17/fireHomework1.mdx',
  },
  hw_micro_2: {
    id: 'hw_micro_2',
    title: 'Практика у зеркала',
    mdxPath: '/src/content/homeworks/l17/mirrorPracticeHomework2.mdx',
  },
};

export const contentConfig: LessonConfig[] = [
  {
    id: 'lesson_1',
    title: 'Введение',
    mdxPath: '/src/content/lectures/introductionLecture.mdx',
    position: { row: 0, column: 2 },
    prerequisites: [],
    linkedHomeworks: ['hw_intro_1', 'hw_intro_2', 'hw_intro_3'],
    linkedTests: ['test1'],
    linkedChains: [],
  },
  {
    id: 'lesson_2',
    title: 'Подготовка тела',
    mdxPath: '/src/content/lectures/bodyLecture.mdx',
    position: { row: 1, column: 2 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: ['hw_body_1', 'hw_body_2', 'hw_body_3'],
    linkedTests: ['test2'],
    linkedChains: ['chain1'],
  },
  {
    id: 'lesson_3',
    title: 'Дыхание и опора',
    mdxPath: '/src/content/lectures/breathLecture.mdx',
    position: { row: 2, column: 2 },
    prerequisites: ['lesson_2'],
    linkedHomeworks: ['hw_breath_1', 'hw_breath_2', 'hw_breath_3'],
    linkedTests: ['test3'],
    linkedChains: ['chain2'],
  },
  {
    id: 'lesson_4',
    title: 'Лип-трилл',
    mdxPath: '/src/content/lectures/lipTrillLecture.mdx',
    position: { row: 3, column: 1 },
    prerequisites: ['lesson_3'],
    linkedHomeworks: ['hw_lip_1', 'hw_lip_2'],
    linkedTests: ['test4'],
    linkedChains: ['chain3'],
  },
  {
    id: 'lesson_5',
    title: 'Ритм',
    mdxPath: '/src/content/lectures/beatLecture.mdx',
    position: { row: 3, column: 2 },
    prerequisites: ['lesson_3'],
    linkedHomeworks: ['hw_beat_1', 'hw_beat_2', 'hw_beat_3', 'hw_beat_4', 'hw_beat_5'],
    linkedTests: ['test5'],
    linkedChains: [],
  },
  {
    id: 'lesson_6',
    title: 'Нотная грамота',
    mdxPath: '/src/content/lectures/notaLecture.mdx',
    position: { row: 3, column: 3 },
    prerequisites: ['lesson_3'],
    linkedHomeworks: ['hw_not_1', 'hw_not_2', 'hw_not_3'],
    linkedTests: ['test6'],
    linkedChains: [],
  },
  {
    id: 'lesson_7',
    title: 'Регистры голоса',
    mdxPath: '/src/content/lectures/registersLecture.mdx',
    position: { row: 4, column: 1 },
    prerequisites: ['lesson_4'],
    linkedHomeworks: [
      'hw_register_1',
      'hw_register_2',
      'hw_register_3',
      'hw_register_4',
      'hw_register_5',
    ],
    linkedTests: ['test7'],
    linkedChains: [],
  },
  {
    id: 'lesson_8',
    title: 'Унисон',
    mdxPath: '/src/content/lectures/unisonLecture.mdx',
    position: { row: 4, column: 3 },
    prerequisites: ['lesson_6'],
    linkedHomeworks: ['hw_un_1', 'hw_un_2'],
    linkedTests: ['test8'],
    linkedChains: [],
  },
  {
    id: 'lesson_9',
    title: 'Интервалы',
    mdxPath: '/src/content/lectures/intervalsLecture.mdx',
    position: { row: 5, column: 3 },
    prerequisites: ['lesson_8'],
    linkedHomeworks: [
      'hw_int_1',
      'hw_int_2',
      'hw_int_3',
      'hw_int_4',
      'hw_int_5',
      'hw_int_6',
      'hw_int_7',
      'hw_int_8',
    ],
    linkedTests: ['test9'],
    linkedChains: ['chain5'],
  },
  {
    id: 'lesson_10',
    title: 'Артикуляция и дикция',
    mdxPath: '/src/content/lectures/articulationLecture.mdx',
    position: { row: 6, column: 2 },
    prerequisites: ['lesson_7', 'lesson_9'],
    linkedHomeworks: [
      'hw_art_1',
      'hw_art_2',
      'hw_art_3',
      'hw_art_4',
      'hw_art_5',
      'hw_art_6',
      'hw_art_7',
      'hw_art_8',
      'hw_art_9',
    ],
    linkedTests: ['test10'],
    linkedChains: ['chain4'],
  },
  {
    id: 'lesson_11',
    title: 'Вокальные режимы',
    mdxPath: '/src/content/lectures/regimeLecture.mdx',
    position: { row: 7, column: 1 },
    prerequisites: ['lesson_10'],
    linkedHomeworks: ['hw_regime_1', 'hw_regime_2', 'hw_regime_3', 'hw_regime_4', 'hw_regime_5'],
    linkedTests: ['test11'],
    linkedChains: [],
  },
  {
    id: 'lesson_12',
    title: 'Вокальные украшения',
    mdxPath: '/src/content/lectures/decorationsLecture.mdx',
    position: { row: 7, column: 2 },
    prerequisites: ['lesson_10'],
    linkedHomeworks: ['hw_decor_1', 'hw_decor_2', 'hw_decor_3', 'hw_decor_4'],
    linkedTests: ['test12'],
    linkedChains: [],
  },
  {
    id: 'lesson_13',
    title: 'Расщепление',
    mdxPath: '/src/content/lectures/splittingLecture.mdx',
    position: { row: 7, column: 3 },
    prerequisites: ['lesson_10'],
    linkedHomeworks: ['hw_split_1'],
    linkedTests: ['test13'],
    linkedChains: [],
  },
  {
    id: 'lesson_14',
    title: 'Вокальная фразировка',
    mdxPath: '/src/content/lectures/phrasingLecture.mdx',
    position: { row: 8, column: 2 },
    prerequisites: ['lesson_11', 'lesson_12', 'lesson_13'],
    linkedHomeworks: ['hw_phras_1', 'hw_phras_2', 'hw_phras_3'],
    linkedTests: ['test14'],
    linkedChains: [],
  },
  {
    id: 'lesson_15',
    title: 'Динамика',
    mdxPath: '/src/content/lectures/dinamicLecture.mdx',
    position: { row: 9, column: 2 },
    prerequisites: ['lesson_14'],
    linkedHomeworks: ['hw_din_1', 'hw_din_2', 'hw_din_3'],
    linkedTests: ['test15'],
    linkedChains: [],
  },
  {
    id: 'lesson_16',
    title: 'Сторителлинг',
    mdxPath: '/src/content/lectures/storytellingLecture.mdx',
    position: { row: 10, column: 2 },
    prerequisites: ['lesson_15'],
    linkedHomeworks: ['hw_story_1', 'hw_story_2'],
    linkedTests: ['test16'],
    linkedChains: ['chain6'],
  },
  {
    id: 'lesson_17',
    title: 'Искусство работы с микрофоном',
    mdxPath: '/src/content/lectures/microphoneLecture.mdx',
    position: { row: 11, column: 2 },
    prerequisites: ['lesson_16'],
    linkedHomeworks: ['hw_micro_1'],
    linkedTests: ['test17'],
    linkedChains: [],
  },
];
