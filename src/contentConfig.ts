// src/contentConfig.ts
export interface LessonConfig {
  id: string;
  title: string;
  prerequisites: string[];
  pos: { x: number; y: number };
}

export const contentConfig: LessonConfig[] = [
  { id: 'lesson_1', title: 'Введение', prerequisites: [], pos: { x: 500, y: 100 } },

  { id: 'lesson_2', title: 'Дыхание', prerequisites: ['lesson_1'], pos: { x: 200, y: 300 } },
  { id: 'lesson_3', title: 'Ритм', prerequisites: ['lesson_1'], pos: { x: 500, y: 300 } },
  { id: 'lesson_4', title: 'Путь', prerequisites: ['lesson_1'], pos: { x: 800, y: 300 } },

  {
    id: 'lesson_5',
    title: 'Интервалы',
    prerequisites: ['lesson_2', 'lesson_3', 'lesson_4'],
    pos: { x: 500, y: 500 },
  },

  { id: 'lesson_6', title: 'Аккорды', prerequisites: ['lesson_5'], pos: { x: 500, y: 700 } },
  { id: 'lesson_7', title: 'Вокал', prerequisites: ['lesson_6'], pos: { x: 500, y: 900 } },
];
