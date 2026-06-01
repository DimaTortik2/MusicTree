import { useState, useEffect, useRef, useCallback } from 'react';
import localforage from 'localforage';
import { create } from 'zustand';
import { YIN } from 'pitchfinder'; // <-- Подключаем мощный YIN-алгоритм
import type { Recording } from '@/features/vocalTuner/types';
import { useProgressStore } from '@/app/store/useProgressStore';
import { toast } from '@/app/utils/toast';
import * as Tone from 'tone';

export type MicErrorType = 'denied' | 'not_found' | 'busy' | null;

// --- ГЛОБАЛЬНЫЙ ПЛЕЕР ---
export const globalAudioPlayer = new Audio();
globalAudioPlayer.volume = useProgressStore.getState().mediaVolume / 100;

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

// --- ГЛАВНЫЙ ХУК ---
export function useVocalTuner() {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording'>('idle');
  const [micError, setMicError] = useState<MicErrorType>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
  const pitchDetectorRef = useRef<((buf: Float32Array) => number | null) | null>(null);

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

  // Загрузка аудио из БД
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
  }, [hasLoaded]);

  // --- ОЧИСТКА ПРИ РАЗМОНТИРОВАНИИ (Решение проблем с фоновым звуком и утечками) ---
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mrRef.current?.state === 'recording') mrRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());

      // Глушим проигрыватель, если юзер ушел на другую страницу (Дерево)
      globalAudioPlayer.pause();
      globalAudioPlayer.currentTime = 0;
      useVocalGlobalStore.getState().setIsPlaying(false);

      // Удаляем ObjectURLs для предотвращения Out Of Memory
      const currentRecordings = useVocalGlobalStore.getState().recordings;
      currentRecordings.forEach((r) => {
        if (r.url) URL.revokeObjectURL(r.url);
      });
      useVocalGlobalStore.getState().setRecordings([]);
      useVocalGlobalStore.getState().setHasLoaded(false); // Заставит загрузить заново при возврате
      useVocalGlobalStore.getState().setPlayingId(null);
    };
  }, []);

  // --- ОБРАБОТКА ФИЗИЧЕСКОГО ОТКЛЮЧЕНИЯ МИКРОФОНА ---
  useEffect(() => {
    const handleDeviceChange = () => {
      if (!streamRef.current) return;
      const tracks = streamRef.current.getAudioTracks();
      if (tracks.length === 0 || tracks[0].readyState === 'ended') {
        toast.error('Микрофон был отключен. Пожалуйста, проверьте подключение.');
        if (phaseRef.current === 'recording') stopRec(); // Сохраняем кусок записи
        stopMic(); // Глушим процесс PitchFinder
      }
    };
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, []);

  // --- PITCHFINDER YIN LOOP (Throttled & Ограниченный) ---
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (!analyserRef.current || phaseRef.current === 'idle') return;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const now = Date.now();
      // Ограничиваем вызовы тяжелого алгоритма (Throttling ~40ms)
      if (now - lastNoteUpdateRef.current > 40) {
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);

        // Порог тишины (около -50dB): спасает от реакции UI на кулер и дыхание
        if (rms < 0.00316) {
          pitchDataRef.current = { active: false, midiFloat: pitchDataRef.current.midiFloat };
        } else {
          const freq = pitchDetectorRef.current ? pitchDetectorRef.current(buf) : null;

          // Жесткие лимиты: от C2 (65Hz) до C6 (1046Hz)
          if (freq && freq >= 65 && freq <= 1046) {
            const midi = 12 * Math.log2(freq / 440) + 69;
            pitchDataRef.current = { active: true, midiFloat: midi };
          } else {
            pitchDataRef.current = { active: false, midiFloat: pitchDataRef.current.midiFloat };
          }
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

      // ✨ ДОСТАЕМ НАТИВНЫЙ КОНТЕКСТ ИЗ TONE.JS
      const rawContext = Tone.getContext().rawContext as AudioContext;
      audioCtxRef.current = rawContext;

      // Проверяем и запускаем контекст
      if (rawContext.state === 'suspended') {
        await rawContext.resume();
      }

      const sr = rawContext.sampleRate;

      // Инициализация Pitchfinder YIN с актуальным Sample Rate
      pitchDetectorRef.current = YIN({ sampleRate: sr });

      if (sr < 44100 && !sampleRateWarnedRef.current) {
        toast.error(
          'Вы используете Bluetooth-устройство или iOS. Точность вокального тренажера может быть немного снижена.',
          { style: { opacity: 0.8 } },
        );
        sampleRateWarnedRef.current = true;
      }

      // Используем rawContext для создания нодов
      const src = rawContext.createMediaStreamSource(stream);
      sourceNodeRef.current = src;

      const analyser = rawContext.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;

      setPhase('listening');
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err: any) {
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
      const uuid =
        'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const createdAt = Date.now();
      const title = `Запись от ${new Date().toLocaleDateString()}`;

      const recData = { id: uuid, blob, title, dur, createdAt };

      try {
        await localforage.setItem(uuid, recData);
        const currentIds = useProgressStore.getState().audioRecordIds;
        useProgressStore.setState({ audioRecordIds: [uuid, ...currentIds] });

        setRecordings((prev) => [
          { id: uuid, name: title, time: '', url: URL.createObjectURL(blob), dur, blob, createdAt },
          ...prev,
        ]);

        toast.success('Запись успешно сохранена');
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          toast.error(
            'Недостаточно памяти для сохранения записи. Пожалуйста, удалите старые аудиофайлы в настройках или освободите место на устройстве',
          );
        }
      }
    };

    mr.start(50);
    mrRef.current = mr;
    setPhase('recording');

    // Ограничение записи ровно в 10 минут
    recordTimerRef.current = setTimeout(
      () => {
        toast.error('Достигнут лимит времени записи (10 минут). Аудиофайл сохранен автоматически.');
        stopRec();
      },
      10 * 60 * 1000,
    );
  };

  const stopRec = () => {
    if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    setPhase('listening');
  };

  const togglePlay = async (rec: Recording) => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 150) return;
    lastActionTimeRef.current = now;

    // Проверка рассинхрона (если кэш очищен ОС)
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
        globalAudioPlayer.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      if (globalAudioPlayer.src !== rec.url) globalAudioPlayer.src = rec.url;
      globalAudioPlayer.play().catch(() => {});
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
      // Очистка объекта из RAM
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

    toast.success('Загрузка аудиофайла началась');
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
  }, []);

  const renameRec = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const data = await localforage.getItem<any>(id);
      if (data) {
        data.title = newName.trim();
        await localforage.setItem(id, data);
      }
      setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, name: newName.trim() } : r)));
      toast.success('Запись успешно переименована');
    } catch (e) {
      toast.error('Произошла ошибка при переименовании');
    }
  };

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
    renameRec,
  };
}
