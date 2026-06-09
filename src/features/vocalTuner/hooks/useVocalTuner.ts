import { useState, useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import { YIN } from 'pitchfinder';
import type { Recording } from '@/features/vocalTuner/types';
import { useProgressStore } from '@/app/store/useProgressStore';
import { toast } from '@/app/utils/toast';
import * as Tone from 'tone';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';

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

  // Загрузка аудио из защищенного БД
  useEffect(() => {
    if (hasLoaded) return;
    const loadRecordings = async () => {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data && !error && data.length > 0) {
        // Достаем из БД пути к файлам
        const paths = data.map((track) => track.url);

        // Массово просим у Supabase сгенерировать защищенные ссылки на 24 часа
        const { data: signedUrlsData } = await supabase.storage
          .from('audio_records')
          .createSignedUrls(paths, 86400);

        const loaded: Recording[] = data.map((track, index) => ({
          id: track.id,
          name: track.title,
          time: new Date(track.created_at).toLocaleDateString(),
          url: signedUrlsData?.[index]?.signedUrl || '', // Временная защищенная ссылка
          dur: track.dur,
          blob: new Blob(), // Пустая заглушка
          createdAt: track.created_at,
        }));
        setRecordings(loaded);
      } else {
        setRecordings([]);
      }
      setHasLoaded(true);
    };
    loadRecordings();
  }, [hasLoaded, setRecordings, setHasLoaded]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mrRef.current?.state === 'recording') mrRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());

      globalAudioPlayer.pause();
      globalAudioPlayer.currentTime = 0;
      useVocalGlobalStore.getState().setIsPlaying(false);

      useVocalGlobalStore.getState().setRecordings([]);
      useVocalGlobalStore.getState().setHasLoaded(false);
      useVocalGlobalStore.getState().setPlayingId(null);
    };
  }, []);

  // ОБРАБОТКА ФИЗИЧЕСКОГО ОТКЛЮЧЕНИЯ МИКРОФОНА
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
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PITCHFINDER YIN LOOP
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (!analyserRef.current || phaseRef.current === 'idle') return;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const now = Date.now();
      if (now - lastNoteUpdateRef.current > 40) {
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);

        if (rms < 0.00316) {
          pitchDataRef.current = { active: false, midiFloat: pitchDataRef.current.midiFloat };
        } else {
          const freq = pitchDetectorRef.current ? pitchDetectorRef.current(buf) : null;

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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('InsecureContext');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;

      const rawContext = Tone.getContext().rawContext as AudioContext;
      audioCtxRef.current = rawContext;

      if (rawContext.state === 'suspended') {
        await rawContext.resume();
      }

      const sr = rawContext.sampleRate;
      pitchDetectorRef.current = YIN({ sampleRate: sr });

      if (sr < 44100 && !sampleRateWarnedRef.current) {
        toast.error(
          'Вы используете Bluetooth-устройство или iOS. Точность вокального тренажера может быть немного снижена.',
          { style: { opacity: 0.8 } },
        );
        sampleRateWarnedRef.current = true;
      }

      const src = rawContext.createMediaStreamSource(stream);
      sourceNodeRef.current = src;

      const analyser = rawContext.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      analyserRef.current = analyser;

      setPhase('listening');
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err: any) {
      if (err.message === 'InsecureContext') {
        setMicError('denied');
        toast.error('Микрофон недоступен по HTTP. Запустите Vite с HTTPS.');
      } else if (err.name === 'NotAllowedError') setMicError('denied');
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

      const user = useAuthStore.getState().user;
      if (!user) {
        toast.error('Ошибка: вы не авторизованы');
        return;
      }

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const dur = Date.now() - recStartRef.current;
      const uuid =
        'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const createdAt = Date.now();
      const title = `Запись от ${new Date().toLocaleDateString()}`;
      const filePath = `${user.id}/${uuid}.webm`;

      const toastId = toast.info('Сохранение...', { autoClose: false });
      try {

        // 1. Загружаем файл
        const { error: uploadError } = await supabase.storage
          .from('audio_records')
          .upload(filePath, blob, { contentType: 'audio/webm' });

        if (uploadError) throw uploadError;

        // 2. Получаем ссылку для немедленного прослушивания
        const { data: signedData } = await supabase.storage
          .from('audio_records')
          .createSignedUrl(filePath, 86400);

        const secureUrl = signedData?.signedUrl || '';

        // 3. Сохраняем информацию в базу данных
        const { error: dbError } = await supabase.from('audio_tracks').insert([
          {
            id: uuid,
            user_id: user.id,
            title,
            dur,
            url: filePath, // Сохраняем путь
            created_at: createdAt,
          },
        ]);

        if (dbError) throw dbError;

        setRecordings((prev) => [
          {
            id: uuid,
            name: title,
            time: new Date().toLocaleDateString(),
            url: secureUrl,
            dur,
            blob,
            createdAt,
          },
          ...prev,
        ]);
        toast.dismiss(toastId);
        toast.success('Запись сохранена!', { position: 'bottom-right' });
      } catch (e: any) {
        toast.dismiss(toastId);
        toast.error('Ошибка сохранения: ' + e.message);
      }
    };

    mr.start(50);
    mrRef.current = mr;
    setPhase('recording');

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
    const user = useAuthStore.getState().user;

    if (playingId === id) {
      globalAudioPlayer.pause();
      setPlayingId(null);
      setIsPlaying(false);
    }

    setRecordings((prev) => prev.filter((x) => x.id !== id));

    if (!user) return;

    await supabase.from('audio_tracks').delete().eq('id', id);
    await supabase.storage.from('audio_records').remove([`${user.id}/${id}.webm`]);
  };

  const downloadRec = async (rec: Recording) => {
    lastActionTimeRef.current = Date.now();
    toast.success('Подготовка к скачиванию...', { autoClose: 1500 });

    try {
      // Запрашиваем файл как blob, чтобы обойти CORS при скачивании
      const response = await fetch(rec.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${rec.name.replace(/\s+/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      toast.success('Загрузка началась');
    } catch (e) {
      toast.error('Произошла ошибка при скачивании');
    }
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

  const renameRec = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const { error } = await supabase
        .from('audio_tracks')
        .update({ title: newName.trim() })
        .eq('id', id);

      if (!error) {
        setRecordings((prev) =>
          prev.map((r) => (r.id === id ? { ...r, name: newName.trim() } : r)),
        );
        toast.success('Запись переименована');
      } else {
        toast.error('Произошла ошибка при переименовании');
      }
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
