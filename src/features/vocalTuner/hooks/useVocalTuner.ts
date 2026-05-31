import { useState, useEffect, useRef, useCallback } from 'react';
import type { NoteInfo, Recording } from '@/features/vocalTuner/types';
import { detectPitch, getNoteInfo } from '../utils/audio';

// ИМПОРТИРУЙТЕ ВАШ ГЛОБАЛЬНЫЙ КОНТЕКСТ
import { globalAudioContext } from '@/shared/lib/audioEngine';

export function useVocalTuner() {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording'>('idle');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNote, setCurrentNote] = useState<NoteInfo | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Рефы для работы с Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const rafRef = useRef<number | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const idCounterRef = useRef(0);
  const lastNoteUpdateRef = useRef(0);

  // Рефы для плавного плеера
  const playRafRef = useRef<number | null>(null);
  const lastTimeUpdateRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);


  
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // --- ИНИЦИАЛИЗАЦИЯ ПЛЕЕРА ---
  useEffect(() => {
    playerRef.current = new Audio();

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleLoadedMetadata = () => {
      setDuration(playerRef.current?.duration || 0);
    };

    playerRef.current.addEventListener('ended', handleEnded);
    playerRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

    const updateTime = (timestamp: number) => {
      // Ограничиваем фреймрейт стейта React ~до 30 кадров (каждые 33 мс),
      // чтобы телефон не грелся, но UI оставался очень плавным
      if (timestamp - lastTimeUpdateRef.current > 33) {
        if (playerRef.current && !playerRef.current.paused) {
          setCurrentTime(playerRef.current.currentTime);
        }
        lastTimeUpdateRef.current = timestamp;
      }
      playRafRef.current = requestAnimationFrame(updateTime);
    };
    playRafRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.removeEventListener('ended', handleEnded);
        playerRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        playerRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());

      // ВАЖНО: Мы больше НЕ делаем .close() глобальному контексту!
      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();
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

      // ИСПОЛЬЗУЕМ ГЛОБАЛЬНЫЙ КОНТЕКСТ ИЗ ВАШЕГО ФАЙЛА
      audioCtxRef.current = globalAudioContext;

      // На iOS он может быть suspended до клика - пробуждаем
      if (globalAudioContext.state === 'suspended') {
        await globalAudioContext.resume();
      }

      const src = globalAudioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = src; // Сохраняем, чтобы потом отсоединить

      const analyser = globalAudioContext.createAnalyser();
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

    // Отсоединяем ноды от глобального контекста (чистим мусор)
    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceNodeRef.current = null;
    analyserRef.current = null;

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

  // --- ЛОГИКА СКРОЛЛА/СЛАЙДЕРА (КАК В ЮТУБЕ) ---
  const handleSeekStart = useCallback(() => {
    if (playerRef.current) {
      wasPlayingRef.current = !playerRef.current.paused;
      if (!playerRef.current.paused) {
        playerRef.current.pause(); // Ставим на паузу пока держим мышку
      }
    }
  }, []);

  const handleSeekEnd = useCallback(() => {
    if (wasPlayingRef.current && playerRef.current) {
      playerRef.current.play().catch(console.error); // Возвращаем плей
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.currentTime = newTime;
    }
  }, []);

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

  return {
    phase,
    recordings,
    playingId,
    isPlaying,
    currentNote,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    currentTime,
    duration,
    startMic,
    stopMic,
    startRec,
    stopRec,
    togglePlay,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    handleThreeDotsClick,
    deleteRec,
    downloadRec,
  };
}
