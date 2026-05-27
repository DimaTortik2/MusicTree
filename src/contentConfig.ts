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

export const homeworksConfig: Record<string, HomeworkConfig> = {
  // Урок 2
  hw_breath_1: { id: 'hw_breath_1', title: 'Пылесоссс', mdxPath: '/src/content/hw_breath_1.mdx' },
  hw_breath_2: { id: 'hw_breath_2', title: 'Шарик', mdxPath: '/src/content/hw_breath_2.mdx' },
  hw_breath_3: {
    id: 'hw_breath_3',
    title: 'Задуть свечу',
    mdxPath: '/src/content/hw_breath_3.mdx',
  },

  // Урок 3
  hw_rhythm_1: { id: 'hw_rhythm_1', title: 'Круговорот', mdxPath: '/src/content/hw_rhythm_1.mdx' },
  hw_rhythm_2: { id: 'hw_rhythm_2', title: 'Метроном', mdxPath: '/src/content/hw_rhythm_2.mdx' },

  // Урок 4
  hw_path_1: { id: 'hw_path_1', title: 'Осознание', mdxPath: '/src/content/hw_path_1.mdx' },

  // Урок 5
  hw_intervals_1: {
    id: 'hw_intervals_1',
    title: 'Голосовой дождь',
    mdxPath: '/src/content/hw_intervals_1.mdx',
  },
  hw_intervals_2: {
    id: 'hw_intervals_2',
    title: 'Прыжки по октавам',
    mdxPath: '/src/content/hw_intervals_2.mdx',
  },
  hw_intervals_3: {
    id: 'hw_intervals_3',
    title: 'Ступеньки',
    mdxPath: '/src/content/hw_intervals_3.mdx',
  },

  // Урок 6
  hw_chords_1: {
    id: 'hw_chords_1',
    title: 'Мажор и минор',
    mdxPath: '/src/content/hw_chords_1.mdx',
  },
  hw_chords_2: { id: 'hw_chords_2', title: 'Трезвучия', mdxPath: '/src/content/hw_chords_2.mdx' },

  // Урок 7
  hw_vocal_1: { id: 'hw_vocal_1', title: 'Фальцет', mdxPath: '/src/content/hw_vocal_1.mdx' },
  hw_vocal_2: { id: 'hw_vocal_2', title: 'Микст', mdxPath: '/src/content/hw_vocal_2.mdx' },
};

// SSOT: Дерево уроков (с привязанными домашками)
export const contentConfig: LessonConfig[] = [
  {
    id: 'lesson_1',
    title: 'Введение',
    mdxPath: '/src/content/lesson_1.mdx',
    position: { row: 0, column: 2 },
    prerequisites: [],
    linkedHomeworks: [],
    linkedTests: ['test_intro'],
    linkedChains: [],
  },
  {
    id: 'lesson_2',
    title: 'Дыхание',
    mdxPath: '/src/content/lesson_2.mdx',
    position: { row: 1, column: 0 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: ['hw_breath_1', 'hw_breath_2', 'hw_breath_3'],
    linkedTests: [],
    linkedChains: ['chain_1'],
  },
  {
    id: 'lesson_3',
    title: 'Ритм',
    mdxPath: '/src/content/lesson_3.mdx',
    position: { row: 1, column: 2 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: ['hw_rhythm_1', 'hw_rhythm_2'],
    linkedTests: ['test_rhythm'],
    linkedChains: [],
  },
  {
    id: 'lesson_4',
    title: 'Путь',
    mdxPath: '/src/content/lesson_4.mdx',
    position: { row: 1, column: 4 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: ['hw_path_1'],
    linkedTests: [],
    linkedChains: [],
  },
  {
    id: 'lesson_5',
    title: 'Интервалы',
    mdxPath: '/src/content/lesson_5.mdx',
    position: { row: 2, column: 2 },
    prerequisites: ['lesson_2', 'lesson_3', 'lesson_4'],
    linkedHomeworks: ['hw_intervals_1', 'hw_intervals_2', 'hw_intervals_3'],
    linkedTests: ['test_intervals'],
    linkedChains: [],
  },
  {
    id: 'lesson_6',
    title: 'Аккорды',
    mdxPath: '/src/content/lesson_6.mdx',
    position: { row: 3, column: 2 },
    prerequisites: ['lesson_5'],
    linkedHomeworks: ['hw_chords_1', 'hw_chords_2'],
    linkedTests: [],
    linkedChains: [],
  },
  {
    id: 'lesson_7',
    title: 'Вокал',
    mdxPath: '/src/content/lesson_7.mdx',
    position: { row: 4, column: 2 },
    prerequisites: ['lesson_6'],
    linkedHomeworks: ['hw_vocal_1', 'hw_vocal_2'],
    linkedTests: ['test_final'],
    linkedChains: ['chain_final'],
  },
];
