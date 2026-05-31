import { useState, useEffect, useRef, useCallback } from 'react';
import localforage from 'localforage';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import type { Recording } from '@/features/vocalTuner/types';
import { detectPitch } from '../utils/audio';
import { globalAudioContext } from '@/shared/lib/audioEngine';
import { useProgressStore } from '@/app/store/useProgressStore';

export type MicErrorType = 'denied' | 'not_found' | 'busy' | null;

// ============================================================================
// ГЛОБАЛЬНЫЙ ПЛЕЕР И ХРАНИЛИЩЕ (для воспроизведения в фоне на других страницах)
// ============================================================================
export const globalAudioPlayer = new Audio();
// Инициализируем громкость сразу из стора при загрузке
globalAudioPlayer.volume = useProgressStore.getState().mediaVolume / 100;

// Подписываемся на изменения ползунка из SettingsPage
useProgressStore.subscribe((state) => {
  globalAudioPlayer.volume = state.mediaVolume / 100;
});

interface VocalState {
  recordings: Recording[];
  hasLoaded: boolean;
  setRecordings: (updater: Recording[] | ((prev: Recording[]) => Recording[])) => void;
  setHasLoaded: (v: boolean) => void;

  playingId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  setPlayingId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
}

export const useVocalGlobalStore = create<VocalState>((set) => ({
  recordings: [],
  hasLoaded: false,
  setRecordings: (updater) =>
    set((state) => ({
      recordings: typeof updater === 'function' ? updater(state.recordings) : updater,
    })),
  setHasLoaded: (v) => set({ hasLoaded: v }),

  playingId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  setPlayingId: (id) => set({ playingId: id }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
}));

// Навешиваем слушатели на плеер ОДИН РАЗ, чтобы они работали даже вне страницы
globalAudioPlayer.addEventListener('timeupdate', () => {
  useVocalGlobalStore.getState().setCurrentTime(globalAudioPlayer.currentTime);
});
globalAudioPlayer.addEventListener('ended', () => {
  useVocalGlobalStore.getState().setIsPlaying(false);
  useVocalGlobalStore.getState().setCurrentTime(0);
});
globalAudioPlayer.addEventListener('loadedmetadata', () => {
  useVocalGlobalStore.getState().setDuration(globalAudioPlayer.duration);
});
// ============================================================================

export function useVocalTuner() {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording'>('idle');
  const [micError, setMicError] = useState<MicErrorType>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Достаем глобальное состояние
  const {
    recordings,
    setRecordings,
    hasLoaded,
    setHasLoaded,
    playingId,
    setPlayingId,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
  } = useVocalGlobalStore();

  const pitchDataRef = useRef<{ active: boolean; midiFloat: number | null }>({
    active: false,
    midiFloat: null,
  });

  // История частот для алгоритма Moving Average (сглаживание джиттера)
  const pitchHistory = useRef<number[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const rafRef = useRef<number | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const lastNoteUpdateRef = useRef(0);
  const sampleRateWarnedRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActionTimeRef = useRef(0);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Загружаем записи из IndexedDB только один раз за сессию
  useEffect(() => {
    if (hasLoaded) return;
    const loadRecordings = async () => {
      const ids = useProgressStore.getState().audioRecordIds;
      const loaded: Recording[] = [];
      for (const id of ids) {
        const data = await localforage.getItem<any>(id);
        if (data && data.blob) {
          loaded.push({
            id: data.id,
            name: data.title,
            time: new Date(data.createdAt).toLocaleDateString(),
            url: URL.createObjectURL(data.blob),
            dur: data.dur,
            blob: data.blob,
            createdAt: data.createdAt,
          });
        }
      }
      setRecordings(loaded.sort((a, b) => b.createdAt - a.createdAt));
      setHasLoaded(true);
    };
    loadRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded]);

  // Очистка при размонтировании (останавливаем только запись/микрофон, ПЛЕЕР ПРОДОЛЖАЕТ ИГРАТЬ)
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mrRef.current?.state === 'recording') mrRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const handleDeviceChange = () => {
      if (!streamRef.current) return;
      const tracks = streamRef.current.getAudioTracks();
      if (tracks.length === 0 || tracks[0].readyState === 'ended') {
        toast.error('Микрофон был отключен. Пожалуйста, проверьте подключение.');
        if (phaseRef.current === 'recording') stopRec();
        stopMic();
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (!analyserRef.current || phaseRef.current === 'idle') return;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const now = Date.now();
      if (now - lastNoteUpdateRef.current > 30) {
        const sampleRate = audioCtxRef.current?.sampleRate || 44100;
        const freq = detectPitch(buf, sampleRate);

        if (freq) {
          const n = 12 * Math.log2(freq / 440) + 69;

          // АЛГОРИТМ MOVING AVERAGE (Скользящее среднее для подавления джиттера)
          pitchHistory.current.push(n);
          if (pitchHistory.current.length > 5) pitchHistory.current.shift();

          const avgMidi =
            pitchHistory.current.reduce((a, b) => a + b, 0) / pitchHistory.current.length;
          pitchDataRef.current = { active: true, midiFloat: avgMidi };
        } else {
          pitchHistory.current = [];
          pitchDataRef.current = { active: false, midiFloat: pitchDataRef.current.midiFloat };
        }
        lastNoteUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, []);

  const startMic = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      audioCtxRef.current = globalAudioContext;

      if (globalAudioContext.state === 'suspended') await globalAudioContext.resume();

      const sr = audioCtxRef.current.sampleRate;
      if (sr < 44100 && !sampleRateWarnedRef.current) {
        toast.warn('Вы используете Bluetooth-устройство или iOS. Точность может быть снижена.', {
          style: { opacity: 0.8 },
        });
        sampleRateWarnedRef.current = true;
      }

      const src = globalAudioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = src;

      const analyser = globalAudioContext.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;

      setPhase('listening');
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err: any) {
      console.error('Mic error:', err);
      if (err.name === 'NotAllowedError') setMicError('denied');
      else if (err.name === 'NotFoundError') setMicError('not_found');
      else if (err.name === 'NotReadableError' || err.name === 'TrackStartError')
        setMicError('busy');
    }
  };

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    sourceNodeRef.current?.disconnect();
    analyserRef.current?.disconnect();
    setPhase('idle');
    pitchDataRef.current = { active: false, midiFloat: null };
  }, []);

  const startRec = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    recStartRef.current = Date.now();

    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const dur = Date.now() - recStartRef.current;
      const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const createdAt = Date.now();
      const title = `Запись от ${new Date().toLocaleDateString()}`;

      const recData = { id: uuid, blob, title, dur, createdAt };

      try {
        await localforage.setItem(uuid, recData);
        const currentIds = useProgressStore.getState().audioRecordIds;
        useProgressStore.setState({ audioRecordIds: [uuid, ...currentIds] });

        setRecordings((prev) => [
          {
            id: uuid,
            name: title,
            time: '',
            url: URL.createObjectURL(blob),
            dur,
            blob,
            createdAt,
          },
          ...prev,
        ]);
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          toast.error('Недостаточно памяти для сохранения записи.');
        }
      }
    };

    mr.start(50);
    mrRef.current = mr;
    setPhase('recording');

    recordTimerRef.current = setTimeout(
      () => {
        toast.info('Достигнут лимит времени записи (10 минут). Файл сохранен автоматически.');
        stopRec();
      },
      10 * 60 * 1000,
    );
  };

  const stopRec = () => {
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    setPhase('listening');
  };

  const togglePlay = async (rec: Recording) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 150) return;
    lastActionTimeRef.current = now;

    const exists = await localforage.getItem(rec.id);
    if (!exists) {
      toast.error('Аудиофайл был очищен системой устройства');
      deleteRec(rec.id);
      return;
    }

    if (playingId === rec.id) {
      if (isPlaying) {
        globalAudioPlayer.pause();
        setIsPlaying(false);
      } else {
        globalAudioPlayer.play().catch((e) => e.name !== 'AbortError' && console.error(e));
        setIsPlaying(true);
      }
    } else {
      if (globalAudioPlayer.src !== rec.url) globalAudioPlayer.src = rec.url;
      globalAudioPlayer.play().catch((e) => e.name !== 'AbortError' && console.error(e));
      setPlayingId(rec.id);
      setIsPlaying(true);
    }
  };

  const deleteRec = async (id: string) => {
    lastActionTimeRef.current = Date.now();
    if (playingId === id) {
      globalAudioPlayer.pause();
      setPlayingId(null);
      setIsPlaying(false);
    }

    await localforage.removeItem(id);
    const stateIds = useProgressStore.getState().audioRecordIds;
    useProgressStore.setState({ audioRecordIds: stateIds.filter((x) => x !== id) });

    setRecordings((prev) => {
      const rec = prev.find((x) => x.id === id);
      // Освобождаем память только при физическом удалении
      if (rec?.url) URL.revokeObjectURL(rec.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const downloadRec = (rec: Recording) => {
    lastActionTimeRef.current = Date.now();
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name.replace(/\s+/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleThreeDotsClick = (e: React.MouseEvent, rec: Recording) => {
    e.preventDefault();
    e.stopPropagation();
    lastActionTimeRef.current = Date.now();

    if (playingId === rec.id) {
      globalAudioPlayer.pause();
      setIsPlaying(false);
      setPlayingId(null);
    } else {
      if (globalAudioPlayer.src !== rec.url) globalAudioPlayer.src = rec.url;
      globalAudioPlayer.pause();
      setPlayingId(rec.id);
      setIsPlaying(false);
    }
  };

  const handleSeekStart = useCallback(() => {
    if (!globalAudioPlayer.paused) globalAudioPlayer.pause();
  }, []);

  const handleSeekEnd = useCallback(() => {
    if (isPlaying) globalAudioPlayer.play().catch(() => {});
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    globalAudioPlayer.currentTime = newTime;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    recordings,
    playingId,
    isPlaying,
    micError,
    setMicError,
    pitchDataRef,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    currentTime,
    duration,
    startMic,
    stopMic,
    startRec,
    stopRec,
    togglePlay,
    deleteRec,
    downloadRec,
    handleThreeDotsClick,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
  };
}
