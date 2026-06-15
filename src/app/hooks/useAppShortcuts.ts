import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useShortcut } from '@/shared/hooks/useShortcut';
import { useTheme } from '@/app/providers/ThemeProvider';

const TAB_ROUTES: Record<string, string> = {
  tree: '/app/tree',
  lesson: '/app/current/lecture',
  homeworks: '/app/homeworks',
  chains: '/app/chains',
  vocal: '/app/mic',
  tests: '/app/tests',
  friends: '/app/friends',
  debug: '/app/debug',
  settings: '/app/settings',
};

interface UseAppShortcutsProps {
  togglePiano: () => void;
}

export const useAppShortcuts = ({ togglePiano }: UseAppShortcutsProps) => {
  const navigate = useNavigate();

  const {
    showPianoHints,
    setShowPianoHints,
    togglePianoMute,
    isKeyboardPianoActive,
    setKeyboardPianoActive,
    leftOctaveShift,
    setLeftOctaveShift,
    rightOctaveShift,
    setRightOctaveShift,
  } = useProgressStore();

  // ================= НАВИГАЦИЯ =================
  useShortcut('navTree', () => navigate(TAB_ROUTES.tree));
  useShortcut('navCurrentLecture', () => navigate(TAB_ROUTES.lesson));
  useShortcut('navHomework', () => navigate(TAB_ROUTES.homeworks));
  useShortcut('navWarmupChain', () => navigate(TAB_ROUTES.chains));
  useShortcut('navVocalTrainer', () => navigate(TAB_ROUTES.vocal));
  useShortcut('navTests', () => navigate(TAB_ROUTES.tests));
  useShortcut('navSettings', () => navigate(TAB_ROUTES.settings));
  useShortcut('navFriends', () => navigate(TAB_ROUTES.friends));

  // ================= ТЕМА =================
  const { theme, setTheme } = useTheme();
  useShortcut('toggleTheme', () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  });

  // ================= ПИАНИНО =================
  useShortcut('openPiano', togglePiano);
  useShortcut('togglePianoHints', () => setShowPianoHints(!showPianoHints));
  useShortcut('togglePianoMute', togglePianoMute);
  useShortcut('togglePianoTracking', () => setKeyboardPianoActive(!isKeyboardPianoActive));

  // Октавы левая рука
  useShortcut('leftPianoOctaveUp', () => setLeftOctaveShift(Math.min(leftOctaveShift + 1, 3)));
  useShortcut('leftPianoOctaveDown', () => setLeftOctaveShift(Math.max(leftOctaveShift - 1, -3)));

  // Октавы правая рука
  useShortcut('rightPianoOctaveUp', () => setRightOctaveShift(Math.min(rightOctaveShift + 1, 2)));
  useShortcut('rightPianoOctaveDown', () =>
    setRightOctaveShift(Math.max(rightOctaveShift - 1, -4)),
  );
};
