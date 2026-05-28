import { useRef, useState } from 'react';
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
import { ControlButton } from '@/shared/buttons/ControlButton';

// --- ТИПЫ И ГЕНЕРАЦИЯ КЛАВИШ ---
interface PianoKey {
  note: string;
  hasBlack: boolean;
  blackNote?: string;
}

const generateFullPianoKeys = (): PianoKey[] => {
  const keys: PianoKey[] = [];
  keys.push({ note: 'A0', hasBlack: true, blackNote: 'A#0' });
  keys.push({ note: 'B0', hasBlack: false });
  for (let i = 1; i <= 7; i++) {
    keys.push({ note: `C${i}`, hasBlack: true, blackNote: `C#${i}` });
    keys.push({ note: `D${i}`, hasBlack: true, blackNote: `D#${i}` });
    keys.push({ note: `E${i}`, hasBlack: false });
    keys.push({ note: `F${i}`, hasBlack: true, blackNote: `F#${i}` });
    keys.push({ note: `G${i}`, hasBlack: true, blackNote: `G#${i}` });
    keys.push({ note: `A${i}`, hasBlack: true, blackNote: `A#${i}` });
    keys.push({ note: `B${i}`, hasBlack: false });
  }
  keys.push({ note: 'C8', hasBlack: false });
  return keys;
};

const getOctaveKeys = (octave: number): PianoKey[] => [
  { note: `C${octave}`, hasBlack: true, blackNote: `C#${octave}` },
  { note: `D${octave}`, hasBlack: true, blackNote: `D#${octave}` },
  { note: `E${octave}`, hasBlack: false },
  { note: `F${octave}`, hasBlack: true, blackNote: `F#${octave}` },
  { note: `G${octave}`, hasBlack: true, blackNote: `G#${octave}` },
  { note: `A${octave}`, hasBlack: true, blackNote: `A#${octave}` },
  { note: `B${octave}`, hasBlack: false },
];

const MOBILE_KEYS = generateFullPianoKeys();

export interface PianoProps extends React.HTMLAttributes<HTMLDivElement> {}

const formatHint = (binding: string | null | undefined) => {
  if (!binding) return '';
  return binding.replace('Key', '').replace('Digit', '');
};

export const OnlyVisualPiano: React.FC<PianoProps> = ({ className, ...props }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const pianoBindings = useProgressStore((state) => state.pianoBindings);

  const [showHints, setShowHints] = useState(true);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);

  const leftOctave = getOctaveKeys(4);
  const rightOctave = getOctaveKeys(5);

  const handleKeyClick = (note: string) => {
    console.log(`🎵 Нажата нота: ${note}`);
  };

  const handleActionClick = (action: string) => {
    console.log(`⚙️ Действие: ${action}`);
  };

  // --- ЕДИНЫЙ РЕНДЕР КЛАВИШИ С РЕСПОНСИВНОЙ ШИРИНОЙ ---
  const renderKey = (key: PianoKey, withHints: boolean) => {
    const whiteHint = withHints ? formatHint(pianoBindings[key.note]) : '';
    const blackHint = withHints && key.blackNote ? formatHint(pianoBindings[key.blackNote]) : '';

    return (
      <div key={key.note} className="relative flex shrink-0">
        {/* Белая клавиша */}
        <div
          onClick={() => handleKeyClick(key.note)}
          className={cn(
            'relative flex cursor-pointer flex-col justify-end pb-3',
            'h-[180px] w-[46px] rounded-b-[6px] md:h-[140px] md:w-[32px] lg:h-[180px] lg:w-[46px]',
            'bg-piano-white transition-colors duration-100 ease-in-out hover:bg-piano-white-hover active:bg-piano-white-active',
          )}
        >
          {whiteHint && (
            <span className="text-center text-sm font-semibold text-[#1a0b22]/30 select-none md:text-xs lg:text-sm">
              {whiteHint}
            </span>
          )}
        </div>

        {/* Черная клавиша */}
        {key.hasBlack && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleKeyClick(key.blackNote!);
            }}
            className={cn(
              'absolute top-0 z-10 flex cursor-pointer flex-col justify-end pb-2',
              'h-[110px] w-[28px] rounded-b-[4px] md:h-[85px] md:w-[20px] lg:h-[110px] lg:w-[28px]',
              '-right-[16px] md:-right-[11px] lg:-right-[16px]',
              'bg-piano-black transition-colors duration-100 ease-in-out hover:bg-piano-black-hover active:bg-piano-black-active',
            )}
          >
            {blackHint && (
              <span className="text-center text-[11px] font-semibold text-text/40 select-none md:text-[9px] lg:text-[11px]">
                {blackHint}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div {...props} className={cn('w-full select-none', className)}>
      {/* ======================= МОБИЛЬНАЯ ВЕРСИЯ (< 768px) ======================= */}
      <div
        className="relative flex w-full [scrollbar-width:none] overflow-x-auto bg-background p-2 pt-4 [-ms-overflow-style:none] md:hidden [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <div className="inline-flex min-w-max gap-1">
          {MOBILE_KEYS.map((key) => renderKey(key, false))}
        </div>
      </div>

      {/* ======================= ДЕСКТОПНАЯ ВЕРСИЯ (>= 768px) ======================= */}
      <div className="hidden w-full items-center justify-between rounded-2xl bg-background px-4 py-4 shadow-xl md:flex md:px-6 md:py-5 lg:px-8 lg:py-6">
        {/* Крайний левый блок */}
        <div className="flex flex-col gap-2 lg:gap-3">
          <ControlButton
            icon={<Sunglasses weight="regular" size={20} />}
            isActive={showHints}
            onClick={() => setShowHints((prev) => !prev)}
            className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
            innerClassName="md:p-1.5 lg:p-2"
          />
          <ControlButton
            icon={<Keyboard weight="regular" size={20} />}
            isActive={isKeyboardActive}
            onClick={() => {
              setIsKeyboardActive((prev) => !prev);
              handleActionClick('Toggle Keyboard');
            }}
            className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
            innerClassName="md:p-1.5 lg:p-2"
          />
        </div>

        {/* Центральный блок */}
        <div className="flex items-center gap-3 lg:gap-5">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <ControlButton
              icon={<CaretDoubleUp weight="regular" size={18} />}
              onClick={() => handleActionClick('L Up')}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
            <ControlButton
              icon={<CaretDoubleDown weight="regular" size={18} />}
              onClick={() => handleActionClick('L Down')}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
          </div>

          <div className="flex gap-0.5 lg:gap-1">
            {leftOctave.map((key) => renderKey(key, showHints))}
          </div>

          <div className="flex gap-0.5 lg:gap-1">
            {rightOctave.map((key) => renderKey(key, showHints))}
          </div>

          <div className="flex flex-col gap-1.5 lg:gap-2">
            <ControlButton
              icon={<CaretDoubleUp weight="regular" size={18} />}
              onClick={() => handleActionClick('R Up')}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
            <ControlButton
              icon={<CaretDoubleDown weight="regular" size={18} />}
              onClick={() => handleActionClick('R Down')}
              className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
              innerClassName="md:p-1.5 lg:p-2"
            />
          </div>
        </div>

        {/* Крайний правый блок */}
        <div className="flex flex-col items-center gap-3 lg:gap-4">
          <div className="relative flex h-20 w-8 items-center justify-center rounded-full bg-surface md:h-20 lg:h-24 lg:w-8">
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
                handleActionClick(`Volume: ${e.target.value}`);
              }}
              className={cn(
                'absolute h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-transparent outline-none [-webkit-appearance:none] lg:w-20',
                '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow-md lg:[&::-webkit-slider-thumb]:size-4',
                '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:shadow-md lg:[&::-moz-range-thumb]:size-4',
              )}
              style={{
                transform: 'rotate(-90deg)',
                background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${
                  isMuted ? 0 : volume
                }%, transparent ${isMuted ? 0 : volume}%, transparent 100%)`,
              }}
            />
          </div>

          <ControlButton
            icon={
              isMuted || volume === 0 ? (
                <SpeakerSimpleSlash weight="regular" size={20} />
              ) : (
                <SpeakerSimpleHigh weight="regular" size={20} />
              )
            }
            isActive={!isMuted && volume > 0}
            onClick={() => {
              setIsMuted((prev) => !prev);
              handleActionClick('Toggle Mute');
            }}
            className="size-10 shrink-0 rounded-xl active:scale-95 md:size-8 lg:size-10"
            innerClassName="md:p-1.5 lg:p-2"
          />
        </div>
      </div>
    </div>
  );
};
