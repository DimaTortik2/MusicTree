import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ShortcutAction =
  | 'togglePianoHints'
  | 'openPiano'
  | 'rightPianoOctaveUp'
  | 'rightPianoOctaveDown'
  | 'leftPianoOctaveUp'
  | 'leftPianoOctaveDown'
  | 'togglePianoTracking'
  | 'togglePianoMute'
  | 'toggleTheme'
  | 'navTree'
  | 'navCurrentLecture'
  | 'navHomework'
  | 'navWarmupChain'
  | 'navVocalTrainer'
  | 'navTests'
  | 'navSettings'
  | 'navFriends';

export interface ShortcutMetadata {
  label: string;
  category: string;
  defaultCode: string;
}

export const SHORTCUTS_METADATA: Record<ShortcutAction, ShortcutMetadata> = {
  // Пианино
  togglePianoHints: {
    label: 'Подсказки на клавишах',
    category: 'Пианино',
    defaultCode: 'Alt+KeyH',
  },
  openPiano: { label: 'Открыть пианино', category: 'Пианино', defaultCode: 'Alt+KeyP' },
  rightPianoOctaveUp: {
    label: 'Октава правого пианино вверх',
    category: 'Пианино',
    defaultCode: 'Alt+Equal',
  },
  rightPianoOctaveDown: {
    label: 'Октава правого пианино вниз',
    category: 'Пианино',
    defaultCode: 'Alt+Minus',
  },
  leftPianoOctaveUp: {
    label: 'Октава левого пианино вверх',
    category: 'Пианино',
    defaultCode: 'Alt+BracketRight',
  },
  leftPianoOctaveDown: {
    label: 'Октава левого пианино вниз',
    category: 'Пианино',
    defaultCode: 'Alt+BracketLeft',
  },
  togglePianoTracking: {
    label: 'Режим отслеживания клавиш пианино',
    category: 'Пианино',
    defaultCode: 'Alt+KeyT',
  },
  togglePianoMute: { label: 'Мьют пианино', category: 'Пианино', defaultCode: 'Alt+KeyM' },

  // Тема
  toggleTheme: { label: 'Смена темы', category: 'Тема', defaultCode: 'Alt+KeyD' },

  // Навигация
  navTree: { label: 'Дерево', category: 'Навигация', defaultCode: 'Alt+Digit1' },
  navCurrentLecture: { label: 'Текущая лекция', category: 'Навигация', defaultCode: 'Alt+Digit2' },
  navHomework: { label: 'Домашние задания', category: 'Навигация', defaultCode: 'Alt+Digit3' },
  navWarmupChain: { label: 'Цепь распевки', category: 'Навигация', defaultCode: 'Alt+Digit4' },
  navVocalTrainer: {
    label: 'Вокальный тренажер',
    category: 'Навигация',
    defaultCode: 'Alt+Digit5',
  },
  navTests: { label: 'Тесты', category: 'Навигация', defaultCode: 'Alt+Digit6' },
  navFriends: { label: 'Друзья', category: 'Навигация', defaultCode: 'Alt+Digit7' },
  navSettings: { label: 'Настройки', category: 'Навигация', defaultCode: 'Alt+Digit8' },
};

interface ShortcutState {
  shortcuts: Record<ShortcutAction, string>;
  updateShortcut: (action: ShortcutAction, code: string) => void;
  resetShortcuts: () => void;
}

const getInitialShortcuts = (): Record<ShortcutAction, string> => {
  const defaults = {} as Record<ShortcutAction, string>;
  (Object.keys(SHORTCUTS_METADATA) as ShortcutAction[]).forEach((key) => {
    defaults[key] = SHORTCUTS_METADATA[key].defaultCode;
  });
  return defaults;
};

export const useShortcutStore = create<ShortcutState>()(
  persist(
    (set) => ({
      shortcuts: getInitialShortcuts(),
      updateShortcut: (action, code) =>
        set((state) => ({ shortcuts: { ...state.shortcuts, [action]: code } })),
      resetShortcuts: () =>
        set(() => ({
          shortcuts: getInitialShortcuts(),
        })),
    }),
    { name: 'app-shortcuts-storage' },
  ),
);
