//TunerComponents.tsx

import React, { useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/utils/cn';
import { Play, Pause } from '@phosphor-icons/react';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { NOTES } from '../utils/audio';
import type { NoteInfo, Recording } from '@/features/vocalTuner/types';

// --- MINI WAVEFORM ---
export const MiniWaveform = ({ active }: { active: boolean }) => (
  <div className="flex h-6 flex-1 items-end gap-[3px] px-3">
    {[30, 60, 40, 90, 60, 40, 70, 50, 80, 40].map((h, i) => (
      <div
        key={i}
        className={cn(
          'w-1.5 rounded-full transition-all duration-300',
          active ? 'bg-white' : 'bg-white/80',
        )}
        style={{ height: `${h}%` }}
      />
    ))}
  </div>
);

// --- SIDEBAR ICON ---
export const SidebarIcon = () => (
  <div className="flex h-6 w-6 overflow-hidden rounded-[4px] border-2 border-white/40">
    <div className="h-full w-[30%] border-r-2 border-white/40 bg-white/10" />
  </div>
);

// --- PORTAL FOR MOBILE SIDEBAR ---
interface MobileSidebarPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileSidebarPortal = ({ isOpen, onClose, children }: MobileSidebarPortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="absolute inset-y-0 left-0 flex w-full flex-col bg-surface shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between p-6 pb-0">
              <button
                onClick={onClose}
                className="text-white/60 transition-colors hover:text-white active:scale-95"
              >
                <SidebarIcon />
              </button>
            </div>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};




// --- PLAYER WIDGET ---
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
  // Защита от NaN, 0 или Infinity (частый баг MediaRecorder с WebM)
  const safeDuration =
    duration > 0 && Number.isFinite(duration) ? duration : recording.dur / 1000 || 1;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-[20px] border-2 border-primary bg-surface px-5 py-3 md:px-6 md:py-4',
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
          step={0.001} // Высокая точность для идеальной плавности
          value={currentTime}
          onChange={onSeek}
          onSeekStart={onSeekStart}
          onSeekEnd={onSeekEnd}
        />
      </div>

      <div className="ml-6 flex shrink-0 items-center justify-center">
        <ControlButton
          icon={
            isPlaying ? <Pause weight="fill" size={32} /> : <Play weight="fill" size={32} />
          }
          isActive={true}
          onClick={onTogglePlay}
          className="text-text transition-colors hover:text-primary active:scale-95"
          innerClassName="!bg-transparent !text-inherit p-0"
        />
      </div>
    </div>
  );
};

// --- PLAYBACK SLIDER ---
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

  // КЛЮЧЕВОЙ МОМЕНТ: Никакого useEffect!
  // Если мы тянем ползунок - берем локальное значение под пальцем.
  // Если отпустили - берем значение напрямую из плеера (value).
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
    setDragValue(value); // Захватываем текущую позицию при касании
    onSeekStart?.();
  };

  const handlePointerUp = (e: React.SyntheticEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).blur();
    onSeekEnd?.();
  };

  return (
    <div className={cn('group relative flex h-5 w-full items-center', className)}>
      {/* 1. ФОНОВЫЙ ТРЕК */}
      <div className="absolute left-0 h-[6px] w-full rounded-full bg-text/20 transition-[height] duration-150 group-hover:h-[8px]" />

      {/* 2. ЗАПОЛНЕННЫЙ ТРЕК */}
      <div
        className="absolute left-0 h-[6px] rounded-full bg-text transition-[height] duration-150 group-hover:h-[8px]"
        style={{ width: `${percent}%` }}
      />

      {/* 3. НЕВИДИМЫЙ INPUT */}
      <input
        type="range"
        min={minNum}
        max={maxNum}
        step={0.001}
        value={displayValue}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp} // Спасает от залипания, если палец/мышь ушли за край экрана
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




// --- TUNER VISUALIZER ---
export const TunerVisualizer = memo(({ noteInfo }: { noteInfo: NoteInfo | null }) => {
  const cents = noteInfo?.cents ?? 0;
  const fillPercentage = noteInfo ? Math.max(0, Math.min(100, cents + 50)) : 50;

  const noteAbove = noteInfo ? NOTES[(NOTES.indexOf(noteInfo.name) + 1) % 12] : 'A#';
  const noteBelow = noteInfo ? NOTES[(NOTES.indexOf(noteInfo.name) + 11) % 12] : 'G#';
  const currentNoteName = noteInfo?.name ?? 'A';

  return (
    <div className="relative mt-[-40px] flex scale-90 items-center gap-10 md:mt-0 md:scale-100 md:gap-16">
      <div className="relative h-[280px] w-[150px] overflow-hidden rounded-[28px] border-2 border-primary bg-transparent md:h-[340px] md:w-[180px] md:rounded-[32px]">
        <div
          className="absolute bottom-0 left-0 w-full bg-primary/40 transition-[height] duration-150 ease-out"
          style={{ height: `${fillPercentage}%` }}
        />
        <div className="absolute top-1/2 left-0 h-[2px] w-full -translate-y-1/2 bg-primary" />
        {noteInfo && (
          <div
            className="absolute left-1/2 z-10 h-[3px] w-14 -translate-x-1/2 rounded-full bg-white transition-all duration-100 md:w-16"
            style={{ bottom: `calc(${fillPercentage}% - 1.5px)` }}
          />
        )}
      </div>

      <div className="flex h-[280px] flex-col justify-between py-2 text-2xl font-medium tracking-wide md:h-[340px] md:py-4 md:text-3xl">
        <span className="text-white/40">{noteAbove}</span>
        <span className="text-4xl text-white md:text-5xl">{currentNoteName}</span>
        <span className="text-white/40">{noteBelow}</span>
      </div>
    </div>
  );
});

TunerVisualizer.displayName = 'TunerVisualizer';
