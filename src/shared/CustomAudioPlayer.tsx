import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { cn } from '@/app/utils/cn';

interface CustomAudioPlayerProps extends React.AudioHTMLAttributes<HTMLAudioElement> {}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  src,
  className,
  ...props
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // ✨ ДОБАВЛЕНО: Состояние, чтобы знать, тянет ли пользователь ползунок прямо сейчас
  const [isDragging, setIsDragging] = useState(false);

  // Синхронизируем громкость плеера с твоим глобальным Zustand-стором
  const mediaVolume = useProgressStore((state) => state.mediaVolume);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : mediaVolume / 100;
    }
  }, [mediaVolume, isMuted]);

  // Останавливаем другие плееры
  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      if (e.target instanceof HTMLAudioElement && e.target !== audioRef.current) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    };

    document.addEventListener('play', handleGlobalPlay, true);

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    // ✨ ИЗМЕНЕНО: Обновляем время ТОЛЬКО если пользователь не тянет ползунок
    if (audioRef.current && !isDragging) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);

    // Сразу меняем стейт, чтобы ползунок двигался за мышкой без задержек
    setCurrentTime(newTime);

    // Сразу перематываем звук (получаем классный эффект scrubbing-а аудио)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        // Базовые стили из твоего дизайна
        'group my-6 flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border-3 p-3 transition-all duration-300',
        isPlaying
          ? 'border-primary bg-primary text-white shadow-md' // Активное состояние
          : 'border-primary bg-transparent text-text hover:bg-primary/10 [.light_&]:border-text/10 [.light_&]:bg-surface [.light_&]:hover:border-primary/40 [.light_&]:hover:bg-primary/5',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        {...props}
      />

      {/* Кнопка Play / Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          'flex shrink-0 cursor-pointer items-center justify-center p-1 transition-colors outline-none',
          isPlaying ? 'text-white hover:text-white/70' : 'text-text group-hover:text-primary',
        )}
      >
        {isPlaying ? <Pause weight="fill" size={24} /> : <Play weight="fill" size={24} />}
      </button>

      {/* Контейнер таймлайна */}
      <div className="flex min-w-0 flex-grow flex-col gap-1">
        <div className="flex w-full items-center gap-3">
          {/* Текущее время */}
          <span
            className={cn(
              'shrink-0 font-mono text-xs transition-colors select-none',
              isPlaying ? 'text-white/80' : 'text-text/50',
            )}
          >
            {formatTime(currentTime)}
          </span>

          {/* Интерактивный кастомный слайдер */}
          <div className="group/slider relative flex h-5 flex-grow items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              // ✨ ИЗМЕНЕНО: Добавлены обработчики, чтобы плеер знал, когда ты тянешь ползунок мышкой/пальцем
              onPointerDown={() => setIsDragging(true)}
              onPointerUp={() => setIsDragging(false)}
              onPointerCancel={() => setIsDragging(false)}
              // А это на случай, если пользователь перематывает стрелочками на клавиатуре
              onKeyDown={() => setIsDragging(true)}
              onKeyUp={() => setIsDragging(false)}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />
            {/* Трек прогресс-бара */}
            <div
              className={cn(
                'relative h-1.5 w-full overflow-hidden rounded-full transition-colors',
                isPlaying ? 'bg-white/30' : 'bg-text/10',
              )}
            >
              <div
                className={cn(
                  'absolute top-0 left-0 h-full rounded-full transition-all duration-75',
                  isPlaying ? 'bg-white' : 'bg-primary',
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Кругляшок ползунка */}
            <div
              className={cn(
                'pointer-events-none absolute size-3.5 rounded-full border-2 opacity-0 transition-opacity group-hover/slider:opacity-100',
                isPlaying ? 'border-white bg-primary' : 'border-primary bg-text',
              )}
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>

          {/* Общая длительность */}
          <span
            className={cn(
              'shrink-0 font-mono text-xs transition-colors select-none',
              isPlaying ? 'text-white/80' : 'text-text/50',
            )}
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Кнопка Mute */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className={cn(
          'flex shrink-0 cursor-pointer items-center justify-center p-1 transition-colors outline-none',
          isPlaying ? 'text-white hover:opacity-70' : 'text-text group-hover:text-primary',
        )}
      >
        {isMuted || mediaVolume === 0 ? (
          <SpeakerSlash weight="bold" size={24} />
        ) : (
          <SpeakerHigh weight="bold" size={24} />
        )}
      </button>
    </div>
  );
};
