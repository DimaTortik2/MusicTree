// src/content/testsData.ts

export interface TestQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswers: number[]; // Массив индексов правильных ответов (множественный выбор)
}

export interface TestConfig {
  id: string;
  title: string;
  questions: TestQuestion[];
}

export const testsData: Record<string, TestConfig> = {
  test_intro: {
    id: 'test_intro',
    title: 'Введение',
    questions: [
      {
        id: 'q1',
        text: 'Какие элементы обязательны для хорошего пения?',
        options: ['Правильное дыхание', 'Громкий крик', 'Свободная гортань', 'Напряженный пресс'],
        correctAnswers: [0, 2],
      },
      {
        id: 'q2',
        text: 'Выберите верные утверждения о голосовых связках:',
        options: [
          'Это мышцы',
          'Они находятся в легких',
          'Они смыкаются при пении',
          'Их длину нельзя изменить',
        ],
        correctAnswers: [0, 2],
      },
    ],
  },
  test_rhythm: {
    id: 'test_rhythm',
    title: 'Основы ритма',
    questions: [
      {
        id: 'q1',
        text: 'Какие длительности нот существуют?',
        options: ['Четвертная', 'Половинная', 'Тройная', 'Шестнадцатая'],
        correctAnswers: [0, 1, 3],
      },
      {
        id: 'q2',
        text: 'Что такое метроном?',
        options: [
          'Инструмент для настройки гитары',
          'Прибор, отмечающий короткие промежутки времени равномерными ударами',
          'Музыкальный интервал',
          'Помощник вокалиста для удержания темпа',
        ],
        correctAnswers: [1, 3],
      },
    ],
  },
  test_intervals: {
    id: 'test_intervals',
    title: 'Интервалы',
    questions: [
      {
        id: 'q1',
        text: 'Какие из перечисленных интервалов являются чистыми?',
        options: ['Кварта', 'Секунда', 'Квинта', 'Терция'],
        correctAnswers: [0, 2],
      },
    ],
  },
};
