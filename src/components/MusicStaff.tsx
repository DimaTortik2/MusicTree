import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { MusicNotes } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';
import { toneEngine } from '@/shared/lib/toneEngine';

interface NoteOnStaff {
  id: string;
  x: number;
  stepIndex: number;
  name: string;
  octave: number;
  accidental: 'none' | 'sharp' | 'flat';
  fullNote: string;
}

const NOTE_STEPS = [
  { name: 'C', octave: 4 },
  { name: 'D', octave: 4 },
  { name: 'E', octave: 4 },
  { name: 'F', octave: 4 },
  { name: 'G', octave: 4 },
  { name: 'A', octave: 4 },
  { name: 'B', octave: 4 },
  { name: 'C', octave: 5 },
  { name: 'D', octave: 5 },
  { name: 'E', octave: 5 },
  { name: 'F', octave: 5 },
  { name: 'G', octave: 5 },
  { name: 'A', octave: 5 },
];

const getYForStep = (stepIndex: number): number => {
  const startY = 140;
  return startY - stepIndex * 10;
};

const generateId = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
  ) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export function MusicStaff() {
  const componentId = useId();
  const [notes, setNotes] = useState<NoteOnStaff[]>([]);
  const [activeAccidental, setActiveAccidental] = useState<'none' | 'sharp' | 'flat'>('none');

  const staffRef = useRef<HTMLDivElement>(null);
  const activeNoteRef = useRef<string | null>(null);

  const stopAudio = useCallback(() => {
    if (activeNoteRef.current) {
      toneEngine.releaseNote(activeNoteRef.current);
      activeNoteRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      if (e.type === 'play' && e.target instanceof HTMLAudioElement) stopAudio();
      if (e.type === 'app-media-play') {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.id !== componentId) stopAudio();
      }
    };
    document.addEventListener('play', handleGlobalPlay, true);
    document.addEventListener('app-media-play', handleGlobalPlay);

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      stopAudio();
    };
  }, [stopAudio, componentId]);

  const handleStaffClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!staffRef.current) return;

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    const rect = staffRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 85) return;

    const clickedNoteIndex = notes.findIndex((note) => {
      const noteY = getYForStep(note.stepIndex);
      const distanceX = Math.abs(note.x - clickX);
      const distanceY = Math.abs(noteY - clickY);
      return distanceX < 14 && distanceY < 10;
    });

    if (clickedNoteIndex !== -1) {
      setNotes((prev) => prev.filter((_, idx) => idx !== clickedNoteIndex));
      return;
    }

    document.querySelectorAll('audio').forEach((a) => a.pause());
    document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

    stopAudio();

    let closestStep = 0;
    let minDistance = Infinity;

    for (let i = 0; i < NOTE_STEPS.length; i++) {
      const stepY = getYForStep(i);
      const distance = Math.abs(clickY - stepY);
      if (distance < minDistance) {
        minDistance = distance;
        closestStep = i;
      }
    }

    const baseNote = NOTE_STEPS[closestStep];
    let noteName = baseNote.name;
    let fullNote = `${baseNote.name}${baseNote.octave}`;

    if (activeAccidental === 'sharp') {
      noteName += '#';
      fullNote = `${baseNote.name}#${baseNote.octave}`;
    } else if (activeAccidental === 'flat') {
      noteName += 'b';
      fullNote = `${baseNote.name}b${baseNote.octave}`;
    }

    activeNoteRef.current = fullNote;
    toneEngine.playNote(fullNote);

    setTimeout(() => {
      if (activeNoteRef.current === fullNote) {
        toneEngine.releaseNote(fullNote);
        activeNoteRef.current = null;
      }
    }, 500);

    const newNote: NoteOnStaff = {
      id: generateId(),
      x: clickX,
      stepIndex: closestStep,
      name: noteName,
      octave: baseNote.octave,
      accidental: activeAccidental,
      fullNote,
    };

    setNotes((prev) => [...prev, newNote].sort((a, b) => a.x - b.x));
  };

  const clearStaff = () => {
    setNotes([]);
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-2xl border-3 border-primary/20 bg-surface p-4 shadow-lg md:p-8">
      {/* ... Весь остальной JSX остается прежним ... */}
      <div className="flex flex-col items-center px-2 text-center">
        <h3 className="flex items-center gap-2 text-xl font-bold text-text">
          <MusicNotes size={24} className="animate-pulse text-primary" />
          Попробуй написать ноты сам
        </h3>
        <p className="mt-1 text-sm text-text/40">
          Кликни на стан, чтобы добавить ноту. Повторный клик на ноту — удалит её.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-background p-1">
        <button
          onClick={() => setActiveAccidental('none')}
          className={cn(
            'flex h-11 w-12 items-center justify-center rounded-md text-lg font-bold transition-all',
            activeAccidental === 'none' ? 'bg-primary text-white' : 'text-text/60 hover:text-text',
          )}
        >
          ♮
        </button>
        <button
          onClick={() => setActiveAccidental('sharp')}
          className={cn(
            'flex h-11 w-12 items-center justify-center rounded-md text-lg font-bold transition-all',
            activeAccidental === 'sharp' ? 'bg-primary text-white' : 'text-text/60 hover:text-text',
          )}
        >
          ♯
        </button>
        <button
          onClick={() => setActiveAccidental('flat')}
          className={cn(
            'flex h-11 w-12 items-center justify-center rounded-md text-lg font-bold transition-all',
            activeAccidental === 'flat' ? 'bg-primary text-white' : 'text-text/60 hover:text-text',
          )}
        >
          ♭
        </button>
      </div>

      <div className="w-full scrollbar-none overflow-x-auto rounded-xl border border-text/10 bg-background/50 select-none">
        <div
          ref={staffRef}
          onClick={handleStaffClick}
          className="relative h-[200px] w-full min-w-[550px] cursor-pointer overflow-hidden"
        >
          {[120, 100, 80, 60, 40].map((y) => (
            <div
              key={y}
              className="pointer-events-none absolute right-0 left-0 h-[2px] bg-text/20"
              style={{ top: `${y}px` }}
            />
          ))}

          <svg
            viewBox="0 0 6072 15378"
            className="pointer-events-none absolute left-3 w-auto text-accent"
            style={{ height: '145px', top: '3.84px' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3674.14 8860.61C3604.97 8580.17 3535.97 8301.8 3468.52 8025.9C3281.52 8064.83 3101.99 8132.64 2937.22 8233.07C2287.63 8546.4 1028.54 9994.96 3033.64 11006.4C3036.72 11008 3040.38 11004.4 3037.91 11002C2473.15 10452.4 2011.83 9169.36 3674.14 8860.61Z"
              fill="currentColor"
            />
            <path
              d="M3926.08 8823.33C3859.18 8544.51 3792.6 8266.45 3727.65 7990.34C3640.19 7996.45 3553.58 8008.18 3468.52 8025.9C3535.97 8301.8 3604.97 8580.17 3674.14 8860.61C3753.24 8845.91 3837.15 8833.43 3926.08 8823.33Z"
              fill="currentColor"
            />
            <path
              d="M4637.24 11885.9C5245.27 11579.5 5750.34 11003.8 6018.8 10095.9C6362.4 8933.86 4959.73 7904.24 3727.65 7990.34C3792.6 8266.45 3859.18 8544.51 3926.08 8823.33C5035.12 8697.44 6070.91 10774.1 4580.95 11597.8C4600.47 11694.1 4619.26 11790.2 4637.24 11885.9Z"
              fill="currentColor"
            />
            <path
              d="M3926.08 8823.33C3837.15 8833.43 3753.24 8845.91 3674.14 8860.61C3904.76 9795.59 4137.2 10753.4 4319.76 11718.7C4414.31 11682.3 4501.24 11641.9 4580.95 11597.8C4397.86 10693.8 4151.74 9763.83 3926.08 8823.33Z"
              fill="currentColor"
            />
            <path
              d="M4631.32 13982.4C4691.8 14779.7 3190.18 15392.9 2254.97 15025C3749.77 14442.4 3428.83 12939.9 2385.28 12939.9C921.15 12939.9 1204.78 14849 2086.33 15231.9C2845.23 15561.6 4861.29 15402.8 4861.29 13982.4C4861.29 13306.6 4772.32 12605.1 4637.24 11885.9C4550.65 11929.5 4461.97 11967.7 4371.58 12000.6C4489.2 12660.1 4581.25 13322.3 4631.32 13982.4Z"
              fill="currentColor"
            />
            <path
              d="M2845.38 5022.73C1431.88 6394.17 -217.488 7851.78 24.2667 9405.93C326.04 11345.9 2655.61 12625.1 4371.58 12000.6C4354.81 11906.6 4337.52 11812.6 4319.76 11718.7C4037.4 11827.3 3687.2 11899.2 3259.17 11920.3C2170.65 11974 928.421 11141.1 813.832 9697.23C714.495 8445.57 1930.05 7486.38 3099.06 6428.92C2997.52 5948.48 2910.17 5478.92 2845.38 5022.73Z"
              fill="currentColor"
            />
            <path
              d="M4637.24 11885.9C4619.26 11790.2 4600.47 11694.1 4580.95 11597.8C4501.24 11641.9 4414.31 11682.3 4319.76 11718.7C4337.52 11812.6 4354.81 11906.6 4371.58 12000.6C4461.97 11967.7 4550.65 11929.5 4637.24 11885.9Z"
              fill="currentColor"
            />
            <path
              d="M3337.21 6211.01C3239.26 5711.89 3157.79 5229.37 3101.97 4771.7C3017.65 4855.05 2931.96 4938.73 2845.38 5022.73C2910.17 5478.92 2997.52 5948.48 3099.06 6428.92C3178.8 6356.78 3258.33 6284.18 3337.21 6211.01Z"
              fill="currentColor"
            />
            <path
              d="M3468.52 8025.9C3553.58 8008.18 3640.19 7996.45 3727.65 7990.34C3584.94 7383.59 3450.12 6786.28 3337.21 6211.01C3258.33 6284.18 3178.8 6356.78 3099.06 6428.92C3209.09 6949.53 3335.79 7482.92 3468.52 8025.9Z"
              fill="currentColor"
            />
            <path
              d="M5144.92 2913C5054.79 1384.77 4341.61 402.008 4010.84 9.58296C4006.34 4.24133 3998.43 4.25537 3993.47 9.17859C2710.39 1283.67 2561.63 3024.91 2845.38 5022.73C2931.96 4938.73 3017.65 4855.05 3101.97 4771.7C2887.25 3011.08 3052.04 1618.13 4117.28 1062.24C4131.24 1054.96 4148.9 1057.62 4160.45 1068.31C5414.07 2229.6 4427.83 3460.97 3101.97 4771.7C3157.79 5229.37 3239.26 5711.89 3337.21 6211.01C4332.8 5287.42 5225.03 4271.22 5144.92 2913Z"
              fill="currentColor"
            />
          </svg>

          <div className="pointer-events-none absolute top-[40px] bottom-[80px] left-[90px] w-[1px] bg-text/10" />

          {notes.map((note) => {
            const y = getYForStep(note.stepIndex);
            const stemGoesDown = note.stepIndex >= 6;

            return (
              <div
                key={note.id}
                className="pointer-events-none absolute transition-all duration-150"
                style={{ left: `${note.x}px`, top: `${y}px` }}
              >
                {note.stepIndex === 0 && (
                  <div className="absolute -top-[1px] -left-[16px] h-[2px] w-[32px] bg-primary" />
                )}
                {note.stepIndex === 12 && (
                  <div className="absolute -top-[1px] -left-[16px] h-[2px] w-[32px] bg-primary" />
                )}
                {note.accidental !== 'none' && (
                  <span className="absolute -top-[14px] -left-[22px] text-xl font-bold text-primary select-none">
                    {note.accidental === 'sharp' ? '♯' : '♭'}
                  </span>
                )}
                <div className="absolute -top-[6px] -left-[9px] h-[12px] w-[14px] -rotate-15 rounded-full bg-primary shadow-sm" />
                <div
                  className="absolute w-[2px] bg-primary"
                  style={{
                    height: '35px',
                    left: stemGoesDown ? '-9px' : '3px',
                    top: stemGoesDown ? '-1px' : '-35px',
                  }}
                />
                <span
                  className="absolute -translate-x-1/2 text-xs font-bold text-accent select-none"
                  style={{ top: `${175 - y}px` }}
                >
                  {note.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex w-full items-center justify-between px-2 md:justify-center">
        <span className="flex items-center gap-1 text-xs text-text/30 md:hidden">
          Скролль вправо, чтобы писать дальше
        </span>
        <Button
          onClick={clearStaff}
          variant="outline"
          size="sm"
          color="primary"
          className="min-h-[44px] gap-2"
          disabled={notes.length === 0}
        >
          Очистить
        </Button>
      </div>
    </div>
  );
}
