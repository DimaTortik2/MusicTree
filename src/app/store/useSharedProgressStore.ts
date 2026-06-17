import { create } from "zustand";
import { type AppState } from "./useProgressStore";

export const useSharedProgressStore = create<AppState>((set) => ({
  passedLessons: [],
  passedHomeworks: [],
  unlockedChains: [],
  passedTests: {},
  currentLesson: "lesson_1",
  lastUncompletedLesson: "lesson_1",
  audioRecordIds: [],
  lessonScrollPositions: {},
  halfPassedLessons: {}, // 🔥 НОВОЕ

  // Методы прогресса
  passLesson: (id) =>
    set((state) => {
      const newHalf = { ...state.halfPassedLessons };
      delete newHalf[id];
      return {
        passedLessons: [...new Set([...state.passedLessons, id])],
        halfPassedLessons: newHalf,
      };
    }),

  halfPassLesson: (id, userId) =>
    set((state) => ({
      halfPassedLessons: { ...state.halfPassedLessons, [id]: userId },
    })),

  setCurrentLesson: (id) =>
    set((state) => ({
      currentLesson: id,
      lastUncompletedLesson: state.passedLessons.includes(id)
        ? state.lastUncompletedLesson
        : id,
    })),

  passTest: (testId, result) =>
    set((state) => ({
      passedTests: { ...state.passedTests, [testId]: result },
    })),
  clearTestResult: (testId) =>
    set((state) => {
      const newTests = { ...state.passedTests };
      delete newTests[testId];
      return { passedTests: newTests };
    }),
  passHomework: (id) =>
    set((state) => ({
      passedHomeworks: [...new Set([...state.passedHomeworks, id])],
    })),
  returnHomeworkFromArchive: (id) =>
    set((state) => ({
      passedHomeworks: state.passedHomeworks.filter((hwId) => hwId !== id),
    })),
  setLessonScrollPosition: (id, position) =>
    set((state) => ({
      lessonScrollPositions: {
        ...(state.lessonScrollPositions || {}),
        [id]: position,
      },
    })),

  // Заглушки для UI-настроек, так как UI берется из личного стора
  theme: "dark",
  mediaVolume: 50,
  pianoVolume: 50,
  pianoBindings: {},
  uiSize: "md",
  activeTabs: [],
  inactiveTabs: [],
  isKeyboardPianoActive: false,
  leftOctaveShift: 0,
  rightOctaveShift: 0,
  pianoSoundType: "synth",
  enableAmbientGlow: true,
  wallpaperMouseTracking: true,
  showPianoHints: true,
  isPianoMuted: false,
  previousPianoVolume: 50,
  _hasHydrated: true,
  setHasHydrated: () => {},
  setUiSize: () => {},
  setActiveTabs: () => {},
  setInactiveTabs: () => {},
  setKeyboardPianoActive: () => {},
  setPianoVolume: () => {},
  setLeftOctaveShift: () => {},
  setRightOctaveShift: () => {},
  setMediaVolume: () => {},
  updatePianoBinding: () => {},
  setPianoSoundType: () => {},
  setEnableAmbientGlow: () => {},
  setWallpaperMouseTracking: () => {},
  resetPianoBindings: () => {},
  setShowPianoHints: () => {},
  togglePianoMute: () => {},
}));
