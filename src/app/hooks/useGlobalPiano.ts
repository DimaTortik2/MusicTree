import { useEffect, useRef } from 'react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { toneEngine } from '@/shared/lib/toneEngine';

export const useGlobalPiano = () => {
  const { isKeyboardPianoActive, pianoBindings, leftOctaveShift, rightOctaveShift } =
    useProgressStore();

  const bindingsRef = useRef(pianoBindings);
  const shiftsRef = useRef({ left: leftOctaveShift, right: rightOctaveShift });

  // Синхронизируем рефы, чтобы слушатель всегда имел актуальные данные без пересоздания
  bindingsRef.current = pianoBindings;
  shiftsRef.current = { left: leftOctaveShift, right: rightOctaveShift };

  useEffect(() => {
    if (!isKeyboardPianoActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;

      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
        if (tag === 'input' || tag === 'textarea' || isContentEditable) return;
      }

      // Ищем БАЗОВУЮ ноту по нажатой клавише
      const baseNote = Object.keys(bindingsRef.current).find(
        (key) => bindingsRef.current[key] === e.code,
      );

      if (baseNote) {
        e.preventDefault();
        useActiveKeysStore.getState().addKey(baseNote); // Подсвечиваем клавишу на UI

        // Высчитываем реальную звучащую ноту со сдвигом октавы
        let shift = 0;
        if (baseNote.includes('4')) shift = shiftsRef.current.left;
        if (baseNote.includes('5')) shift = shiftsRef.current.right;

        const pitchClass = baseNote.slice(0, -1);
        const baseOctave = parseInt(baseNote.slice(-1), 10);
        const playNote = `${pitchClass}${baseOctave + shift}`;

        toneEngine.playNote(playNote);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const baseNote = Object.keys(bindingsRef.current).find(
        (key) => bindingsRef.current[key] === e.code,
      );
      if (baseNote) {
        useActiveKeysStore.getState().removeKey(baseNote); // Убираем подсветку на UI

        let shift = 0;
        if (baseNote.includes('4')) shift = shiftsRef.current.left;
        if (baseNote.includes('5')) shift = shiftsRef.current.right;

        const pitchClass = baseNote.slice(0, -1);
        const baseOctave = parseInt(baseNote.slice(-1), 10);
        const playNote = `${pitchClass}${baseOctave + shift}`;

        toneEngine.releaseNote(playNote);
      }
    };

    const handleBlur = () => {
      toneEngine.releaseAll();
      useActiveKeysStore.getState().clearKeys(); // Очищаем залипшие UI-клавиши
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      toneEngine.releaseAll();
      useActiveKeysStore.getState().clearKeys();
    };
  }, [isKeyboardPianoActive]);

  useEffect(() => {
    return () => {
      toneEngine.disposeEngine();
    };
  }, []);
};
