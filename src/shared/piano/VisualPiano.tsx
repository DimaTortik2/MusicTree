import { useRef, useState, useEffect } from 'react';
import { cn } from '@/app/utils/cn';
import {
  Sunglasses,
  Keyboard,
  CaretDoubleUp,
  CaretDoubleDown,
  SpeakerSimpleHigh,
  SpeakerSimpleSlash,
} from '@phosphor-icons/react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { toneEngine } from '@/shared/lib/toneEngine';
import { toast } from '@/app/utils/toast';
import { Tooltip } from '@/shared/Tooltip';


interface PianoKey {
  baseNote: string;
  playNote: string;
  hasBlack: boolean;
  blackBaseNote?: string;
  blackPlayNote?: string;
}

const getShiftedOctaveKeys = (baseOctave: number, shift: number): PianoKey[] => {
  const currentOctave = baseOctave + shift;
  return [
    {
      baseNote: `C${baseOctave}`,
      playNote: `C${currentOctave}`,
      hasBlack: true,
      blackBaseNote: `C#${baseOctave}`,
      blackPlayNote: `C#${currentOctave}`,
    },
    {
      baseNote: `D${baseOctave}`,
      playNote: `D${currentOctave}`,
      hasBlack: true,
      blackBaseNote: `D#${baseOctave}`,
      blackPlayNote: `D#${currentOctave}`,
    },
    { baseNote: `E${baseOctave}`, playNote: `E${currentOctave}`, hasBlack: false },
    {
      baseNote: `F${baseOctave}`,
      playNote: `F${currentOctave}`,
      hasBlack: true,
      blackBaseNote: `F#${baseOctave}`,
      blackPlayNote: `F#${currentOctave}`,
    },
    {
      baseNote: `G${baseOctave}`,
      playNote: `G${currentOctave}`,
      hasBlack: true,
      blackBaseNote: `G#${baseOctave}`,
      blackPlayNote: `G#${currentOctave}`,
    },
    {
      baseNote: `A${baseOctave}`,
      playNote: `A${currentOctave}`,
      hasBlack: true,
      blackBaseNote: `A#${baseOctave}`,
      blackPlayNote: `A#${currentOctave}`,
    },
    { baseNote: `B${baseOctave}`, playNote: `B${currentOctave}`, hasBlack: false },
  ];
};

const generateFullPianoKeys = (): PianoKey[] => {
  const keys: PianoKey[] = [];
  keys.push({
    baseNote: 'A0',
    playNote: 'A0',
    hasBlack: true,
    blackBaseNote: 'A#0',
    blackPlayNote: 'A#0',
  });
  keys.push({ baseNote: 'B0', playNote: 'B0', hasBlack: false });
  for (let i = 1; i <= 7; i++) {
    keys.push({
      baseNote: `C${i}`,
      playNote: `C${i}`,
      hasBlack: true,
      blackBaseNote: `C#${i}`,
      blackPlayNote: `C#${i}`,
    });
    keys.push({
      baseNote: `D${i}`,
      playNote: `D${i}`,
      hasBlack: true,
      blackBaseNote: `D#${i}`,
      blackPlayNote: `D#${i}`,
    });
    keys.push({ baseNote: `E${i}`, playNote: `E${i}`, hasBlack: false });
    keys.push({
      baseNote: `F${i}`,
      playNote: `F${i}`,
      hasBlack: true,
      blackBaseNote: `F#${i}`,
      blackPlayNote: `F#${i}`,
    });
    keys.push({
      baseNote: `G${i}`,
      playNote: `G${i}`,
      hasBlack: true,
      blackBaseNote: `G#${i}`,
      blackPlayNote: `G#${i}`,
    });
    keys.push({
      baseNote: `A${i}`,
      playNote: `A${i}`,
      hasBlack: true,
      blackBaseNote: `A#${i}`,
      blackPlayNote: `A#${i}`,
    });
    keys.push({ baseNote: `B${i}`, playNote: `B${i}`, hasBlack: false });
  }
  keys.push({ baseNote: 'C8', playNote: 'C8', hasBlack: false });
  return keys;
};

const MOBILE_KEYS = generateFullPianoKeys();

export interface PianoProps extends React.HTMLAttributes<HTMLDivElement> {}

const formatHint = (binding: string | null | undefined) => {
  if (!binding) return '';
  let text = binding.replace('Key', '').replace('Digit', '');

  const symbolMap: Record<string, string> = {
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backslash: '\\',
    Slash: '/',
    Comma: ',',
    Period: '.',
    Backquote: '`',
  };

  Object.keys(symbolMap).forEach((key) => {
    if (text.includes(key)) {
      text = text.replace(key, symbolMap[key]);
    }
  });

  return text;
};

export const VisualPiano: React.FC<PianoProps> = ({ className, ...props }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPercent, setScrollPercent] = useState(0);

  const {
    pianoBindings,
    isKeyboardPianoActive,
    setKeyboardPianoActive,
    pianoVolume,
    setPianoVolume,
    showPianoHints,
    isPianoMuted,
    togglePianoMute,
    setShowPianoHints,
    leftOctaveShift,
    rightOctaveShift,
    setLeftOctaveShift,
    setRightOctaveShift,
  } = useProgressStore();

  const { activeKeys, addKey, removeKey } = useActiveKeysStore();

  const leftOctave = getShiftedOctaveKeys(4, leftOctaveShift);
  const rightOctave = getShiftedOctaveKeys(5, rightOctaveShift);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;

      setTimeout(() => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        const savedPercent = useActiveKeysStore.getState().mobileScrollPercent;

        if (savedPercent === null) {
          const c4Key = container.querySelector('[data-note="C4"]') as HTMLElement;
          if (c4Key) {
            const leftPos = c4Key.offsetLeft - 20;
            container.scrollLeft = leftPos;
            if (maxScroll > 0) {
              const percent = (leftPos / maxScroll) * 100;
              setScrollPercent(percent);
              useActiveKeysStore.getState().setMobileScrollPercent(percent);
            }
          }
        } else {
          const restoredPos = (savedPercent / 100) * maxScroll;
          container.scrollLeft = restoredPos;
          setScrollPercent(savedPercent);
        }
      }, 100);
    }
  }, []);

  const handleScrollSync = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const maxScroll = target.scrollWidth - target.clientWidth;
    if (maxScroll > 0) {
      const percent = (target.scrollLeft / maxScroll) * 100;
      setScrollPercent(percent);
      useActiveKeysStore.getState().setMobileScrollPercent(percent);
    }
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollPercent(val);
    useActiveKeysStore.getState().setMobileScrollPercent(val);

    if (scrollRef.current) {
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = (val / 100) * maxScroll;
    }
  };

  const handlePlayNote = (playNoteFreq: string, baseNoteId: string) => {
    if (isPianoMuted || pianoVolume === 0) {
      toast.error('Звук пианино выключен!', {
        toastId: 'visual-piano-muted-error',
        autoClose: 3000,
      });
    }
    toneEngine.playNote(playNoteFreq);
    addKey(baseNoteId);
  };

  const handleStopNote = (playNoteFreq: string, baseNoteId: string) => {
    toneEngine.releaseNote(playNoteFreq);
    removeKey(baseNoteId);
  };

  const renderKey = (key: PianoKey, withHints: boolean) => {
    const whiteHint = withHints ? formatHint(pianoBindings[key.baseNote]) : '';
    const blackHint =
      withHints && key.blackBaseNote ? formatHint(pianoBindings[key.blackBaseNote]) : '';

    const isWhiteActive = activeKeys.has(key.baseNote);
    const isBlackActive = key.blackBaseNote && activeKeys.has(key.blackBaseNote);

    return (
      // ИСПРАВЛЕНИЕ 1: Убрали flex у обертки, теперь базовые линии текста не будут ломать сетку
      <div key={key.baseNote} data-note={key.baseNote} className="relative shrink-0">
        {/* Белая клавиша */}
        <div
          onMouseDown={() => handlePlayNote(key.playNote, key.baseNote)}
          onMouseUp={() => handleStopNote(key.playNote, key.baseNote)}
          onMouseLeave={() => handleStopNote(key.playNote, key.baseNote)}
          onTouchStart={() => handlePlayNote(key.playNote, key.baseNote)}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleStopNote(key.playNote, key.baseNote);
          }}
          onTouchCancel={() => handleStopNote(key.playNote, key.baseNote)}
          className={cn(
            'relative flex cursor-pointer touch-none flex-col justify-end pb-3 outline-none', // outline-none защищает от фокуса
            'h-[180px] w-[46px] rounded-b-[6px] md:h-[140px] md:w-[32px] lg:h-[180px] lg:w-[46px]',
            'transition-colors duration-100 ease-in-out', // ИСПРАВЛЕНИЕ 2: Вынесли транзиции, чтобы не пропадали
            isWhiteActive
              ? 'bg-piano-white-active'
              : 'bg-piano-white hover:bg-piano-white-hover active:bg-piano-white-active',
          )}
        >
          {whiteHint && (
            <span className="pointer-events-none text-center text-sm font-semibold text-[#1a0b22]/30 select-none md:text-xs lg:text-sm">
              {whiteHint}
            </span>
          )}
        </div>

        {/* Черная клавиша */}
        {key.hasBlack && (
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              handlePlayNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              handleStopNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              handleStopNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              handlePlayNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStopNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            onTouchCancel={(e) => {
              e.stopPropagation();
              handleStopNote(key.blackPlayNote!, key.blackBaseNote!);
            }}
            className={cn(
              'absolute top-0 z-10 flex cursor-pointer touch-none flex-col justify-end pb-2 outline-none',
              'h-[110px] w-[28px] rounded-b-[4px] md:h-[85px] md:w-[20px] lg:h-[110px] lg:w-[28px]',
              '-right-[16px] md:-right-[11px] lg:-right-[16px]',
              'transition-colors duration-100 ease-in-out', // ИСПРАВЛЕНИЕ 2: Вынесли транзиции
              isBlackActive
                ? 'bg-piano-black-active'
                : 'bg-piano-black hover:bg-piano-black-hover active:bg-piano-black-active',
            )}
          >
            {blackHint && (
              <span className="pointer-events-none text-center text-[11px] font-semibold text-white/40 select-none md:text-[9px] lg:text-[11px]">
                {blackHint}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      {...props}
      className={cn(
        // ИСПРАВЛЕНО: Для светлой темы добавлена подложка bg-surface, скругление и мягкая тень
        'flex w-full flex-col select-none [.light_&]:rounded-[28px] [.light_&]:bg-surface [.light_&]:shadow-[0_24px_64px_rgba(29,21,32,0.06)]',
        className,
      )}
    >
      {/* Кастомный скроллбар */}
      <div className="flex w-full items-center justify-center px-4 py-2 md:hidden">
        <input
          type="range"
          min="0"
          max="100"
          value={scrollPercent}
          onPointerUp={(e) => e.currentTarget.blur()}
          onChange={handleRangeChange}
          className={cn(
            'h-2.5 w-full cursor-pointer appearance-none rounded-full bg-surface outline-none',
            '[&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text/30 active:[&::-webkit-slider-thumb]:bg-text/50',
            '[&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-text/30 active:[&::-moz-range-thumb]:bg-text/50',
          )}
        />
      </div>

      {/* Мобильная версия */}
      <div
        className="relative flex w-full [scrollbar-width:none] overflow-x-auto px-4 py-2 [-ms-overflow-style:none] md:hidden [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
        onScroll={handleScrollSync}
      >
        {/* ИСПРАВЛЕНИЕ 3: добавили items-start для мобильного контейнера клавиш */}
        <div className="inline-flex min-w-max items-start gap-1">
          {MOBILE_KEYS.map((key) => renderKey(key, false))}
        </div>
      </div>

      {/* Десктопная версия */}
      <div className="hidden w-full items-center justify-between px-4 py-4 md:flex md:px-6 md:py-5 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-2 lg:gap-3">
          <Tooltip content="Подсказки на клавишах" shortcutAction="togglePianoHints" position="top">
            <ControlButton
              icon={<Sunglasses weight="regular" size={20} />}
              isActive={showPianoHints}
              onClick={() => setShowPianoHints(!showPianoHints)}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
          </Tooltip>
          <Tooltip
            content="Режим отслеживания клавиш пианино"
            shortcutAction="togglePianoTracking"
            position="bottom"
          >
            <ControlButton
              icon={<Keyboard weight="regular" size={20} />}
              isActive={isKeyboardPianoActive}
              onClick={() => setKeyboardPianoActive(!isKeyboardPianoActive)}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
          </Tooltip>
        </div>

        <div className="flex items-center gap-3 lg:gap-5">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <Tooltip
              content="Октава левого пианино вверх"
              shortcutAction="leftPianoOctaveUp"
              position="top"
            >
              <ControlButton
                icon={<CaretDoubleUp weight="regular" size={18} />}
                onClick={() => setLeftOctaveShift(Math.min(leftOctaveShift + 1, 3))}
                className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
                innerClassName="md:p-1.5 lg:p-2"
              />
            </Tooltip>
            <Tooltip
              content="Октава левого пианино вниз"
              shortcutAction="leftPianoOctaveDown"
              position="bottom"
            >
              <ControlButton
                icon={<CaretDoubleDown weight="regular" size={18} />}
                onClick={() => setLeftOctaveShift(Math.max(leftOctaveShift - 1, -3))}
                className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
                innerClassName="md:p-1.5 lg:p-2"
              />
            </Tooltip>
          </div>

          {/* ИСПРАВЛЕНИЕ 3: добавили items-start для левой октавы */}
          <div className="flex items-start gap-0.5 lg:gap-1">
            {leftOctave.map((key) => renderKey(key, showPianoHints))}
          </div>

          {/* ИСПРАВЛЕНИЕ 3: добавили items-start для правой октавы */}
          <div className="flex items-start gap-0.5 lg:gap-1">
            {rightOctave.map((key) => renderKey(key, showPianoHints))}
          </div>

          <div className="flex flex-col gap-1.5 lg:gap-2">
            <Tooltip
              content="Октава правого пианино вверх"
              shortcutAction="rightPianoOctaveUp"
              position="top"
            >
              <ControlButton
                icon={<CaretDoubleUp weight="regular" size={18} />}
                onClick={() => setRightOctaveShift(Math.min(rightOctaveShift + 1, 2))}
                className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
                innerClassName="md:p-1.5 lg:p-2"
              />
            </Tooltip>
            <Tooltip
              content="Октава правого пианино вниз"
              shortcutAction="rightPianoOctaveDown"
              position="bottom"
            >
              <ControlButton
                icon={<CaretDoubleDown weight="regular" size={18} />}
                onClick={() => setRightOctaveShift(Math.max(rightOctaveShift - 1, -4))}
                className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
                innerClassName="md:p-1.5 lg:p-2"
              />
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 lg:gap-4">
          <div className="relative flex h-20 w-8 items-center justify-center rounded-full bg-surface md:h-20 lg:h-24 lg:w-8">
            <input
              type="range"
              min="0"
              onPointerUp={(e) => e.currentTarget.blur()}
              max="100"
              value={pianoVolume}
              onChange={(e) => setPianoVolume(Number(e.target.value))}
              className={cn(
                'absolute h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-transparent outline-none [-webkit-appearance:none] lg:w-20',
                '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow-md lg:[&::-webkit-slider-thumb]:size-4',
                '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:shadow-md lg:[&::-moz-range-thumb]:size-4',
              )}
              style={{
                transform: 'rotate(-90deg)',
                background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${
                  pianoVolume
                }%, transparent ${pianoVolume}%, transparent 100%)`,
              }}
            />
          </div>

          <Tooltip content="Мьют пианино" shortcutAction="togglePianoMute" position="bottom">
            <ControlButton
              icon={
                isPianoMuted || pianoVolume === 0 ? (
                  <SpeakerSimpleSlash weight="regular" size={20} />
                ) : (
                  <SpeakerSimpleHigh weight="regular" size={20} />
                )
              }
              isActive={!isPianoMuted && pianoVolume > 0}
              onClick={togglePianoMute}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
