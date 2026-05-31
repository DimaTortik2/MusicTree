'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/app/utils/cn';
import {
  Play,
  Pause,
  Power,
  Trash,
  PencilSimple,
  DownloadSimple,
  DotsThreeVertical,
  Record as RecordIcon,
} from '@phosphor-icons/react';

// Импорт вашего компонента кнопки
import { ControlButton } from '@/shared/buttons/ControlButton';

// --- ИНТЕРФЕЙСЫ ---
interface NoteInfo {
  name: string;
  octave: number;
  freq: number;
  cents: number;
}

interface Recording {
  id: number;
  name: string;
  time: string;
  url: string;
  dur: number;
  blob: Blob;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// --- УТИЛИТЫ АУДИО ---
function getNoteInfo(freq: number | null): NoteInfo | null {
  if (!freq || freq < 55 || freq > 1500) return null;
  const n = 12 * Math.log2(freq / 440) + 69;
  const i = Math.round(n);
  const cents = Math.round((n - i) * 100);
  return {
    name: NOTES[((i % 12) + 12) % 12],
    octave: Math.floor(i / 12) - 1,
    freq: Math.round(freq),
    cents,
  };
}

function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const n = buffer.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.003) return null;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += buffer[i];
  mean /= n;
  for (let i = 0; i < n; i++) buffer[i] -= mean;

  const minFreq = 55,
    maxFreq = 1500;
  const minLag = Math.floor(sampleRate / maxFreq);
  const maxLag = Math.floor(sampleRate / minFreq);
  if (maxLag > n / 2) return null;

  const acf = new Float32Array(maxLag + 1);
  let maxAcf = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0,
      d1 = 0,
      d2 = 0;
    for (let i = 0; i < n - lag; i++) {
      num += buffer[i] * buffer[i + lag];
      d1 += buffer[i] * buffer[i];
      d2 += buffer[i + lag] * buffer[i + lag];
    }
    const denom = Math.sqrt(d1 * d2);
    acf[lag] = denom > 0.0001 ? num / denom : 0;
    if (acf[lag] > maxAcf) maxAcf = acf[lag];
  }

  if (maxAcf < 0.3) return null;

  let peakLag = minLag;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (acf[lag] > acf[lag - 1] && acf[lag] >= acf[lag + 1] && acf[lag] > acf[peakLag]) {
      peakLag = lag;
    }
  }

  let refinedLag = peakLag;
  if (peakLag > minLag && peakLag < maxLag) {
    const y0 = acf[peakLag - 1],
      y1 = acf[peakLag],
      y2 = acf[peakLag + 1];
    const denom = 2 * (2 * y1 - y0 - y2);
    if (Math.abs(denom) > 0.0001) {
      const delta = (y2 - y0) / denom;
      if (Math.abs(delta) <= 0.5) refinedLag = peakLag + delta;
    }
  }

  const freq = sampleRate / refinedLag;
  return freq >= minFreq && freq <= maxFreq ? freq : null;
}

// --- МИНИ-КОМПОНЕНТЫ ---
const MiniWaveform = ({ active }: { active: boolean }) => (
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

const SidebarIcon = () => (
  <div className="flex h-6 w-6 overflow-hidden rounded-[4px] border-2 border-white/40">
    <div className="h-full w-[30%] border-r-2 border-white/40 bg-white/10" />
  </div>
);

// --- ПОРТАЛ ДЛЯ МОБИЛЬНОГО САЙДБАРА ---
const MobileSidebarPortal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
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

// --- КОМПОНЕНТ ПЛЕЕРА С ИМЕНЕМ И СЛАЙДЕРОМ ---
const PlayerWidget = ({
  recording,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  className,
}: {
  recording: Recording;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-[20px] border-2 border-primary bg-surface px-5 py-3 md:px-6 md:py-4',
        className,
      )}
    >
      <div className="flex flex-1 flex-col justify-center gap-3 overflow-hidden">
        <span className="truncate text-base font-medium text-white md:max-w-[300px]">
          {recording.name}
        </span>

        {/* Кастомный слайдер перемотки */}
        <div className="relative flex h-4 w-full items-center">
          <div className="absolute h-1 w-full rounded-full bg-white/20" />
          <div
            className="absolute h-1 rounded-full bg-white/50"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.01"
            value={currentTime}
            onChange={onSeek}
            className="absolute z-10 w-full cursor-pointer opacity-0"
          />
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="ml-6 flex shrink-0 items-center justify-center">
        {/* Использование вашего ControlButton */}
        <ControlButton
          icon={
            isPlaying ? <Pause weight="regular" size={32} /> : <Play weight="regular" size={32} />
          }
          isActive={true}
          onClick={onTogglePlay}
          className="text-white transition-colors hover:text-primary active:scale-95"
          innerClassName="!bg-transparent !text-inherit p-0" // Перебиваем фон чтобы был только контур
        />
      </div>
    </div>
  );
};

// --- ГЛАВНЫЙ КОМПОНЕНТ ---
export default function VocalTuner() {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording'>('idle');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<NoteInfo | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Состояния для плеера (слайдера)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const idCounterRef = useRef(0);
  const lastNoteUpdateRef = useRef(0);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Инициализация плеера и прослушивание событий времени
  useEffect(() => {
    playerRef.current = new Audio();

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(playerRef.current?.currentTime || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(playerRef.current?.duration || 0);
    };

    playerRef.current.addEventListener('ended', handleEnded);
    playerRef.current.addEventListener('timeupdate', handleTimeUpdate);
    playerRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.removeEventListener('ended', handleEnded);
        playerRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        playerRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        playerRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (!analyserRef.current || phaseRef.current === 'idle') return;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const now = Date.now();
      if (now - lastNoteUpdateRef.current > 50) {
        const sampleRate = audioCtxRef.current?.sampleRate || 44100;
        const freq = detectPitch(buf, sampleRate);
        setCurrentNote(getNoteInfo(freq));
        lastNoteUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, []);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextConstructor();
      audioCtxRef.current = ctx;
      await ctx.resume();

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(analyser);
      analyserRef.current = analyser;

      setPhase('listening');
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    setPhase('idle');
    setCurrentNote(null);
  }, []);

  const startRec = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    recStartRef.current = Date.now();

    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const dur = Date.now() - recStartRef.current;
      idCounterRef.current += 1;
      const currentId = idCounterRef.current;

      setRecordings((prev) => [
        { id: currentId, name: `Дубль ${currentId}`, time: '', url, dur, blob },
        ...prev,
      ]);
    };

    mr.start(50);
    mrRef.current = mr;
    setPhase('recording');
  };

  const stopRec = () => {
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    setPhase('listening');
  };

  const togglePlay = (rec: Recording) => {
    const pl = playerRef.current;
    if (!pl) return;

    if (playingId === rec.id) {
      if (isPlaying) {
        pl.pause();
        setIsPlaying(false);
      } else {
        pl.play();
        setIsPlaying(true);
      }
    } else {
      if (pl.src !== rec.url) pl.src = rec.url;
      pl.play();
      setPlayingId(rec.id);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.currentTime = newTime;
    }
  };

  const handleThreeDotsClick = (e: React.MouseEvent, rec: Recording) => {
    e.stopPropagation();
    if (playingId === rec.id) {
      playerRef.current?.pause();
      setIsPlaying(false);
      setPlayingId(null);
    } else {
      const pl = playerRef.current;
      if (pl) {
        if (pl.src !== rec.url) pl.src = rec.url;
        pl.pause();
        setPlayingId(rec.id);
        setIsPlaying(false);
      }
    }
  };

  const deleteRec = (id: number) => {
    if (playingId === id) {
      playerRef.current?.pause();
      setPlayingId(null);
      setIsPlaying(false);
    }
    setRecordings((prev) => {
      const rec = prev.find((x) => x.id === id);
      if (rec?.url) {
        try {
          URL.revokeObjectURL(rec.url);
        } catch (e) {
          console.warn(e);
        }
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const downloadRec = (rec: Recording) => {
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name.replace(/\s+/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isListening = phase !== 'idle';
  const isRecording = phase === 'recording';
  const activeRecording = recordings.find((r) => r.id === playingId);

  // Компонент списка записей
  const SidebarContent = () => (
    <div className="custom-scroll flex-1 space-y-3 overflow-y-auto px-4 py-6">
      {recordings.map((rec) => {
        const isActive = playingId === rec.id;
        const isCurrentlyPlaying = isActive && isPlaying;

        return (
          <div key={rec.id} className="flex flex-col gap-1">
            <div
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-2xl border-2 p-3 transition-all duration-200',
                isActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary bg-transparent text-white hover:bg-primary/10',
              )}
              onClick={() => togglePlay(rec)}
            >
              <button className="flex shrink-0 items-center justify-center p-1">
                {isCurrentlyPlaying ? (
                  <Pause weight="fill" size={20} />
                ) : (
                  <Play weight="fill" size={20} />
                )}
              </button>

              <MiniWaveform active={isActive} />

              <button
                className="shrink-0 p-1 opacity-80 hover:opacity-100"
                onClick={(e) => handleThreeDotsClick(e, rec)}
              >
                <DotsThreeVertical weight="bold" size={24} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mx-1 mt-1 flex items-center justify-between rounded-xl bg-primary px-4 py-2 text-white/90">
                    <button
                      className="p-1 transition-colors hover:text-white"
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRec(rec.id);
                      }}
                    >
                      <Trash size={18} weight="bold" />
                    </button>
                    <div className="flex gap-4">
                      <button className="p-1 transition-colors hover:text-white">
                        <PencilSimple size={18} weight="bold" />
                      </button>
                      <button
                        className="p-1 transition-colors hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadRec(rec);
                        }}
                      >
                        <DownloadSimple size={18} weight="bold" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-text">
      {/* --- ДЕСКТОПНЫЙ САЙДБАР --- */}
      <aside className="relative z-10 hidden w-[320px] flex-col border-r border-white/5 bg-surface md:flex">
        <SidebarContent />
      </aside>

      {/* --- МОБИЛЬНЫЙ САЙДБАР (Плеер закреплен в самом низу) --- */}
      <MobileSidebarPortal
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      >
        <SidebarContent />
        {activeRecording && (
          <div className="shrink-0 border-t border-white/10 bg-surface/80 p-4 pb-8 backdrop-blur-md">
            <PlayerWidget
              recording={activeRecording}
              isPlaying={isPlaying}
              onTogglePlay={() => togglePlay(activeRecording)}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
          </div>
        )}
      </MobileSidebarPortal>

      {/* --- ГЛАВНАЯ ОБЛАСТЬ --- */}
      <main className="relative flex flex-1 flex-col">
        <div className="absolute top-6 left-5 z-10 md:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="-m-2 p-2 text-white opacity-70 transition-opacity hover:opacity-100"
          >
            <SidebarIcon />
          </button>
        </div>

        {/* --- ДЕСКТОПНЫЙ ПЛЕЕР (Скрыт на мобильных, сверху по центру на ПК) --- */}
        {activeRecording && (
          <div className="animate-in fade-in slide-in-from-top-4 absolute top-12 left-1/2 z-[1000] hidden w-full max-w-[600px] -translate-x-1/2 md:block">
            <PlayerWidget
              recording={activeRecording}
              isPlaying={isPlaying}
              onTogglePlay={() => togglePlay(activeRecording)}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
            />
          </div>
        )}

        {/* --- ЦЕНТРАЛЬНЫЙ ТЮНЕР --- */}
        <div className="flex flex-1 items-center justify-center">
          <TunerVisualizer noteInfo={currentNote} />
        </div>

        {/* --- КНОПКИ УПРАВЛЕНИЯ ЗАПИСЬЮ --- */}
        <div className="absolute bottom-[100px] left-0 z-10 flex w-full items-end justify-center gap-4 md:bottom-12">
          {isListening && (
            <button
              onClick={stopMic}
              className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] bg-primary text-white transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 md:h-[72px] md:w-[72px] md:rounded-[24px]"
            >
              <Power size={28} weight="bold" />
            </button>
          )}

          <button
            onClick={() => {
              if (!isListening) startMic();
              else if (isRecording) stopRec();
              else startRec();
            }}
            className={cn(
              'flex items-center justify-center bg-primary text-white transition-all hover:scale-105 active:scale-95',
              isListening
                ? 'h-[84px] w-[84px] rounded-[28px] md:h-[96px] md:w-[96px] md:rounded-[32px]'
                : 'h-[72px] w-[72px] rounded-[24px] md:h-[84px] md:w-[84px] md:rounded-[28px]',
            )}
          >
            {!isListening ? (
              <Play size={36} weight="fill" />
            ) : isRecording ? (
              <div className="h-7 w-7 animate-pulse rounded-sm bg-white md:h-8 md:w-8" />
            ) : (
              <RecordIcon size={40} weight="bold" />
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

// --- ВИЗУАЛ ТЮНЕРА ---
const TunerVisualizer = memo(({ noteInfo }: { noteInfo: NoteInfo | null }) => {
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
