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
    linkedHomeworks: ['hw_breath_1'],
    linkedTests: [],
    linkedChains: ['chain_1'],
  },
  {
    id: 'lesson_3',
    title: 'Ритм',
    mdxPath: '/src/content/lesson_3.mdx',
    position: { row: 1, column: 2 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: ['hw_rhythm'],
    linkedTests: ['test_rhythm'],
    linkedChains: [],
  },
  {
    id: 'lesson_4',
    title: 'Путь',
    mdxPath: '/src/content/lesson_4.mdx',
    position: { row: 1, column: 4 },
    prerequisites: ['lesson_1'],
    linkedHomeworks: [],
    linkedTests: [],
    linkedChains: [],
  },
  {
    id: 'lesson_5',
    title: 'Интервалы',
    mdxPath: '/src/content/lesson_5.mdx',
    position: { row: 2, column: 2 },
    prerequisites: ['lesson_2', 'lesson_3', 'lesson_4'],
    linkedHomeworks: ['hw_intervals'],
    linkedTests: ['test_intervals'],
    linkedChains: [],
  },
  {
    id: 'lesson_6',
    title: 'Аккорды',
    mdxPath: '/src/content/lesson_6.mdx',
    position: { row: 3, column: 2 },
    prerequisites: ['lesson_5'],
    linkedHomeworks: [],
    linkedTests: [],
    linkedChains: [],
  },
  {
    id: 'lesson_7',
    title: 'Вокал',
    mdxPath: '/src/content/lesson_7.mdx',
    position: { row: 4, column: 2 },
    prerequisites: ['lesson_6'],
    linkedHomeworks: [],
    linkedTests: ['test_final'],
    linkedChains: ['chain_final'],
  },
];
