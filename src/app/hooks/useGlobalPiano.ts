import { useEffect, useRef } from 'react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { toneEngine } from '@/shared/lib/toneEngine';
import { toast } from '@/app/utils/toast';

export const useGlobalPiano = () => {
  const {
    isKeyboardPianoActive,
    pianoBindings,
    leftOctaveShift,
    rightOctaveShift,
    isPianoMuted,
    pianoVolume,
  } = useProgressStore();

  const bindingsRef = useRef(pianoBindings);
  const shiftsRef = useRef({ left: leftOctaveShift, right: rightOctaveShift });
  const volumeStateRef = useRef({ isMuted: isPianoMuted, volume: pianoVolume });

  bindingsRef.current = pianoBindings;
  shiftsRef.current = { left: leftOctaveShift, right: rightOctaveShift };
  volumeStateRef.current = { isMuted: isPianoMuted, volume: pianoVolume };

  useEffect(() => {
    if (!isKeyboardPianoActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;

      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';

        // ✨ ФИКС: Проверяем, не является ли input ползунком (range)
        const isRange = tag === 'input' && activeEl.getAttribute('type') === 'range';

        // Если это input (но НЕ range), textarea или contenteditable - игнорируем нажатие
        if ((tag === 'input' && !isRange) || tag === 'textarea' || isContentEditable) return;
      }

      const baseNote = Object.keys(bindingsRef.current).find(
        (key) => bindingsRef.current[key] === e.code,
      );

      if (baseNote) {
        e.preventDefault();

        const { isMuted, volume } = volumeStateRef.current;
        if (isMuted || volume === 0) {
          toast.error('Пианино отслеживает клавиатуру, но звук выключен!', {
            toastId: 'piano-muted-error',
            autoClose: 3000,
          });
        }

        useActiveKeysStore.getState().addKey(baseNote);

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
        useActiveKeysStore.getState().removeKey(baseNote);

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
      useActiveKeysStore.getState().clearKeys();
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
