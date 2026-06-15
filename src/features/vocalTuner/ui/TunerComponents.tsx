import React, { useEffect, useState, memo, useRef } from 'react';
import { cn } from '@/app/utils/cn';
import { Play, Pause } from '@phosphor-icons/react';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { NOTES } from '../utils/audio';
import type { Recording } from '@/features/vocalTuner/types';

// ИСПРАВЛЕНО: active ? bg-white : bg-text/30
export const MiniWaveform = ({ active }: { active: boolean }) => (
  <div className="flex h-6 flex-1 items-end gap-[3px] px-3">
    {[30, 60, 40, 90, 60, 40, 70, 50, 80, 40].map((h, i) => (
      <div
        key={i}
        className={cn(
          'w-1.5 rounded-full transition-all duration-300',
          active ? 'bg-white' : 'bg-text/30',
        )}
        style={{ height: `${h}%` }}
      />
    ))}
  </div>
);

// ИСПРАВЛЕНО: используется currentColor для идеальной адаптации к родителю
export const SidebarIcon = () => (
  <div className="flex h-6 w-6 overflow-hidden rounded-[4px] border-2 border-current">
    <div className="h-full w-[30%] border-r-2 border-current opacity-30" />
  </div>
);



interface PlayerWidgetProps {
  recording: Recording;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  className?: string;
}

export const PlayerWidget = ({
  recording,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onSeekStart,
  onSeekEnd,
  className,
}: PlayerWidgetProps) => {
  const safeDuration =
    duration > 0 && Number.isFinite(duration) ? duration : recording.dur / 1000 || 1;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-[20px] border-2 border-primary bg-background px-5 py-3 md:px-6 md:py-4',
        className,
      )}
    >
      <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden">
        <span className="truncate text-base font-medium text-text md:max-w-[300px]">
          {recording.name}
        </span>

        <PlaybackSlider
          min={0}
          max={safeDuration}
          step={0.001}
          value={currentTime}
          onChange={onSeek}
          onSeekStart={onSeekStart}
          onSeekEnd={onSeekEnd}
        />
      </div>

      <div className="ml-6 flex shrink-0 items-center justify-center">
        <ControlButton
          icon={isPlaying ? <Pause weight="fill" size={32} /> : <Play weight="fill" size={32} />}
          isActive={true}
          onClick={onTogglePlay}
          className="text-text transition-colors hover:text-primary active:scale-95"
          innerClassName="!bg-transparent !text-inherit p-0"
        />
      </div>
    </div>
  );
};

interface PlaybackSliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: number;
  max: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
}

const PlaybackSlider: React.FC<PlaybackSliderProps> = ({
  value,
  min = 0,
  max,
  className,
  onChange,
  onSeekStart,
  onSeekEnd,
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  const displayValue = isDragging ? dragValue : value;
  const minNum = Number(min);
  const maxNum = Number(max);

  const percent =
    maxNum > minNum
      ? Math.min(Math.max(((displayValue - minNum) / (maxNum - minNum)) * 100, 0), 100)
      : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragValue(Number(e.target.value));
    onChange(e);
  };

  const handlePointerDown = () => {
    setIsDragging(true);
    setDragValue(value);
    onSeekStart?.();
  };

  const handlePointerUp = (e: React.SyntheticEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).blur();
    onSeekEnd?.();
  };

  return (
    <div className={cn('group relative flex h-5 w-full items-center', className)}>
      <div className="absolute left-0 h-[6px] w-full rounded-full bg-text/20 transition-[height] duration-150 group-hover:h-[8px]" />
      <div
        className="absolute left-0 h-[6px] rounded-full bg-text transition-[height] duration-150 group-hover:h-[8px]"
        style={{ width: `${percent}%` }}
      />
      <input
        type="range"
        min={minNum}
        max={maxNum}
        step={0.001}
        value={displayValue}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-transparent outline-none',

          '[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent',
          '[&::-moz-range-track]:appearance-none [&::-moz-range-track]:bg-transparent',

          '[&::-webkit-slider-thumb]:size-[14px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
          'group-hover:[&::-webkit-slider-thumb]:scale-125 hover:[&::-webkit-slider-thumb]:scale-125 active:[&::-webkit-slider-thumb]:scale-110',

          '[&::-moz-range-thumb]:size-[14px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none',
          '[&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:shadow-md',
          '[&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150',
          'group-hover:[&::-moz-range-thumb]:scale-125 hover:[&::-moz-range-thumb]:scale-125 active:[&::-moz-range-thumb]:scale-110',
        )}
        {...props}
      />
    </div>
  );
};

interface TunerVisualizerProps {
  pitchDataRef: React.MutableRefObject<{ active: boolean; midiFloat: number | null }>;
  actions?: React.ReactNode;
}

const MIN_MIDI = 30;
const MAX_MIDI = 95;
const DRUM_NOTES = Array.from({ length: MAX_MIDI - MIN_MIDI + 1 }, (_, i) => {
  const midi = i + MIN_MIDI;
  return { midi, name: NOTES[((midi % 12) + 12) % 12] };
});

export const TunerVisualizer = memo(({ pitchDataRef, actions }: TunerVisualizerProps) => {
  const controllerRef = useRef<HTMLDivElement>(null);
  const drumRef = useRef<HTMLDivElement>(null);
  const currentMidi = useRef<number | null>(null);

  useEffect(() => {
    let rafId: number;

    const loop = () => {
      const { active, midiFloat } = pitchDataRef.current;

      if (!active || midiFloat === null) {
        if (controllerRef.current) controllerRef.current.style.opacity = '0';
      } else {
        if (controllerRef.current) controllerRef.current.style.opacity = '0.3';
        if (currentMidi.current === null) {
          currentMidi.current = midiFloat;
        } else {
          if (Math.abs(midiFloat - currentMidi.current) > 3) {
            currentMidi.current = midiFloat;
          } else {
            currentMidi.current += (midiFloat - currentMidi.current) * 0.15;
          }
        }

        const centerInt = Math.round(currentMidi.current);
        const cents = (currentMidi.current - centerInt) * 100;
        const fillPercentage = cents + 50;

        if (controllerRef.current) {
          controllerRef.current.style.transform = `translateY(${100 - fillPercentage}%)`;
        }
      }

      if (currentMidi.current === null) currentMidi.current = 69;

      if (drumRef.current) {
        const children = drumRef.current.children as HTMLCollectionOf<HTMLElement>;
        const spacing = window.innerWidth >= 768 ? 72 : 56;

        for (let i = 0; i < children.length; i++) {
          const el = children[i];
          const noteMidi = MIN_MIDI + i;

          const delta = noteMidi - currentMidi.current;
          const absDelta = Math.abs(delta);

          if (absDelta > 4.5) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-50%) scale(0)';
            continue;
          }

          const translateY = delta * -spacing;
          const rotateX = delta * 25;
          const opacity = Math.pow(0.5, absDelta);
          const scale = Math.max(0, 1 - absDelta * 0.1);

          el.style.opacity = opacity.toFixed(3);
          el.style.transform = `translateY(calc(-50% + ${translateY}px)) rotateX(${rotateX}deg) scale(${scale})`;
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(rafId);
  }, [pitchDataRef]);

  return (
    <div className="relative mt-[-40px] scale-90 md:mt-0 md:scale-100">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-[280px] w-[150px] overflow-hidden rounded-[28px] border-3 border-primary bg-transparent md:h-[340px] md:w-[180px] md:rounded-[32px]">
          <div
            ref={controllerRef}
            className="absolute inset-0 h-full w-full bg-primary/40 will-change-transform"
            style={{ opacity: 0 }}
          />
          <div className="absolute top-1/2 left-0 h-[3px] w-full -translate-y-1/2 bg-primary" />
        </div>
        {actions && (
          <div className="relative flex h-[84px] w-full items-center justify-center md:h-[96px]">
            {actions}
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute top-0 left-[calc(100%+2.5rem)] h-[280px] w-16 shrink-0 md:left-[calc(100%+4rem)] md:h-[340px] md:w-24"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
        }}
      >
        <div
          ref={drumRef}
          className="relative h-full w-full"
          style={{ perspective: '300px', transformStyle: 'preserve-3d' }}
        >
          {DRUM_NOTES.map((n) => (
            <span
              key={n.midi}
              // ИСПРАВЛЕНО: text-text вместо text-white, чтобы ноты читались на светлом фоне
              className="absolute left-0 w-full text-left text-3xl font-bold tracking-wider text-text will-change-transform md:text-5xl"
              style={{ top: '50%', opacity: 0, transform: 'translateY(-50%)' }}
            >
              {n.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

TunerVisualizer.displayName = 'TunerVisualizer';
