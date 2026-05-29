import {
  GitFork,
  TextAlignCenter,
  Highlighter,
  Microphone,
  PianoKeys,
  Link,
  GraduationCap,
  Wrench,
  Gear,
  PencilSimple,
} from '@phosphor-icons/react';

export const TABS_INFO: Record<string, { icon: any; title: string; desc: string }> = {
  tree: { icon: GitFork, title: 'Дерево', desc: 'Улучшай свои навыки, двигаясь по дереву' },
  lesson: { icon: TextAlignCenter, title: 'Текущая лекция', desc: 'Последняя открытая лекция' },
  homeworks: {
    icon: Highlighter,
    title: 'Домашние задания',
    desc: 'Выполняйте упражнения, полученные из лекций',
  },
  vocal: {
    icon: Microphone,
    title: 'Вокальный тренажер',
    desc: 'Практикуйте интонирование и записывайте свои результаты',
  },
  piano: { icon: PianoKeys, title: 'Пианино', desc: 'Ваше личное пианино для практики' },
  chains: {
    icon: Link,
    title: 'Цепь распевки',
    desc: 'Перед пением всегда нужно выполнять некоторые упражнения',
  },
  tests: {
    icon: GraduationCap,
    title: 'Тесты',
    desc: 'Проверяйте усвоение материала, проходя тесты',
  },
  debug: { icon: Wrench, title: 'Для разработчиков', desc: 'Симуляция любой ситуации' },
  settings: { icon: Gear, title: 'Настройки', desc: 'Громкость, хоткеи, данные и т.д.' },
  customize: {
    icon: PencilSimple,
    title: 'Настройка вкладок',
    desc: 'Настройте расположение вкладок на свой вкус',
  },
};
