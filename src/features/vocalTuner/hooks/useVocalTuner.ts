import { useState, useEffect, useRef, useCallback } from 'react';
import { create } from 'zustand';
import localforage from 'localforage';
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
  isCloudMode: boolean; // <-- НОВЫЙ ФЛАГ
  isSaving: boolean; // <-- НОВОЕ
  deletingIds: string[]; // <-- НОВОЕ
  setIsCloudMode: (v: boolean) => void;
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
  setDeletingIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  setIsSaving: (v: boolean) => void;
}

export const useVocalGlobalStore = create<VocalState>((set) => ({
  recordings: [],
  hasLoaded: false,
  isCloudMode: false,
  setIsCloudMode: (v) => set({ isCloudMode: v }),
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
  isSaving: false, // <-- НОВОЕ
  deletingIds: [], // <-- НОВОЕ
  setIsSaving: (v) => set({ isSaving: v }), // <-- НОВОЕ
  setDeletingIds: (updater) =>
    set((state) => ({
      deletingIds: typeof updater === 'function' ? updater(state.deletingIds) : updater,
    })),
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
    isCloudMode,
    setIsCloudMode,
    playingId,
    setPlayingId,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    isSaving,
    deletingIds,
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

  // --- ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА (ГИБРИДНАЯ) ---
  useEffect(() => {
    if (hasLoaded) return;

    const loadRecordings = async () => {
      const user = useAuthStore.getState().user;
      let userHasCloudAccess = false;

      // 1. Проверяем вайтлист, если юзер авторизован
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('can_cloud_audio')
          .eq('id', user.id)
          .single();
        userHasCloudAccess = !!data?.can_cloud_audio;
      }

      setIsCloudMode(userHasCloudAccess);

      if (userHasCloudAccess && user) {
        // --- ЗАГРУЗКА ИЗ ОБЛАКА ---
        const { data, error } = await supabase
          .from('audio_tracks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          const paths = data.map((track) => track.url);
          const { data: signedUrlsData } = await supabase.storage
            .from('audio_records')
            .createSignedUrls(paths, 86400);

          const loaded: Recording[] = data.map((track, index) => ({
            id: track.id,
            name: track.title,
            time: new Date(track.created_at).toLocaleDateString(),
            url: signedUrlsData?.[index]?.signedUrl || '',
            dur: track.dur,
            blob: new Blob(),
            createdAt: track.created_at,
          }));
          setRecordings(loaded);
        } else {
          setRecordings([]);
        }
      } else {
        // --- ЗАГРУЗКА ЛОКАЛЬНО (localforage) ---
        const ids = useProgressStore.getState().audioRecordIds || [];
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
      }

      setHasLoaded(true);
    };

    loadRecordings();
  }, [hasLoaded, setRecordings, setHasLoaded, setIsCloudMode]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mrRef.current?.state === 'recording') mrRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());

      globalAudioPlayer.pause();
      globalAudioPlayer.currentTime = 0;
      useVocalGlobalStore.getState().setIsPlaying(false);

      // Очищаем ObjectURL только если мы работали локально
      if (!useVocalGlobalStore.getState().isCloudMode) {
        const currentRecordings = useVocalGlobalStore.getState().recordings;
        currentRecordings.forEach((r) => {
          if (r.url && r.url.startsWith('blob:')) URL.revokeObjectURL(r.url);
        });
      }

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
      useVocalGlobalStore.getState().setIsSaving(true);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const dur = Date.now() - recStartRef.current;
      const uuid =
        'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const createdAt = Date.now();
      const title = `Запись от ${new Date().toLocaleDateString()}`;

      if (isCloudMode) {
        // --- СОХРАНЕНИЕ В ОБЛАКО ---
        const user = useAuthStore.getState().user;
        if (!user) return;
        const filePath = `${user.id}/${uuid}.webm`;
        const toastId = toast.info('Синхронизация с облаком...', { autoClose: false });

        try {
          const { error: uploadError } = await supabase.storage
            .from('audio_records')
            .upload(filePath, blob, { contentType: 'audio/webm' });

          if (uploadError) throw uploadError;

          const { data: signedData } = await supabase.storage
            .from('audio_records')
            .createSignedUrl(filePath, 86400);

          const { error: dbError } = await supabase
            .from('audio_tracks')
            .insert([
              { id: uuid, user_id: user.id, title, dur, url: filePath, created_at: createdAt },
            ]);

          if (dbError) throw dbError;

          setRecordings((prev) => [
            {
              id: uuid,
              name: title,
              time: new Date().toLocaleDateString(),
              url: signedData?.signedUrl || '',
              dur,
              blob,
              createdAt,
            },
            ...prev,
          ]);
          toast.dismiss(toastId);
          toast.success('Запись сохранена в облако!', { position: 'bottom-right' });
          useVocalGlobalStore.getState().setIsSaving(false);
        } catch (e: any) {
          toast.dismiss(toastId);
          toast.error('Ошибка облачного сохранения: ' + e.message);
          useVocalGlobalStore.getState().setIsSaving(false);
        }
      } else {
        // --- ЛОКАЛЬНОЕ СОХРАНЕНИЕ ---
        const recData = { id: uuid, blob, title, dur, createdAt };
        try {
          await localforage.setItem(uuid, recData);
          const currentIds = useProgressStore.getState().audioRecordIds || [];
          useProgressStore.setState({ audioRecordIds: [uuid, ...currentIds] });

          setRecordings((prev) => [
            {
              id: uuid,
              name: title,
              time: new Date().toLocaleDateString(),
              url: URL.createObjectURL(blob),
              dur,
              blob,
              createdAt,
            },
            ...prev,
          ]);

          toast.success('Запись сохранена на устройстве', { position: 'bottom-right' });
        } catch (e: any) {
          if (e.name === 'QuotaExceededError') {
            toast.error('Недостаточно памяти устройства для сохранения записи.');
          }
        }
      }
    };

    mr.start(50);
    mrRef.current = mr;
    setPhase('recording');

    recordTimerRef.current = setTimeout(
      () => {
        toast.error('Лимит 10 минут. Файл сохранен.');
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

    // Проверка рассинхрона для локальных записей
    if (!isCloudMode) {
      const exists = await localforage.getItem(rec.id);
      if (!exists) {
        toast.error('Аудиофайл был очищен системой устройства');
        deleteRec(rec.id);
        return;
      }
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

    // ВКЛЮЧАЕМ СКЕЛЕТОН УДАЛЕНИЯ ДЛЯ КОНКРЕТНОГО ID
    useVocalGlobalStore.getState().setDeletingIds((prev) => [...prev, id]);

    try {
      if (isCloudMode) {
        const user = useAuthStore.getState().user;
        if (user) {
          await supabase.from('audio_tracks').delete().eq('id', id);
          await supabase.storage.from('audio_records').remove([`${user.id}/${id}.webm`]);
        }
      } else {
        await localforage.removeItem(id);
        const stateIds = useProgressStore.getState().audioRecordIds || [];
        useProgressStore.setState({ audioRecordIds: stateIds.filter((x) => x !== id) });
      }

      setRecordings((prev) => {
        const rec = prev.find((x) => x.id === id);
        if (!isCloudMode && rec?.url) URL.revokeObjectURL(rec.url);
        return prev.filter((x) => x.id !== id);
      });
    } finally {
      // ВЫКЛЮЧАЕМ СКЕЛЕТОН
      useVocalGlobalStore.getState().setDeletingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const downloadRec = async (rec: Recording) => {
    lastActionTimeRef.current = Date.now();

    try {
      let downloadUrl = rec.url;

      if (isCloudMode) {
        toast.success('Подготовка к скачиванию...', { autoClose: 1500 });
        const response = await fetch(rec.url);
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${rec.name.replace(/\s+/g, '_')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (isCloudMode) URL.revokeObjectURL(downloadUrl);
      if (!isCloudMode) toast.success('Загрузка аудиофайла началась');
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
  }, []);

  const renameRec = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      if (isCloudMode) {
        const { error } = await supabase
          .from('audio_tracks')
          .update({ title: newName.trim() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const data = await localforage.getItem<any>(id);
        if (data) {
          data.title = newName.trim();
          await localforage.setItem(id, data);
        }
      }

      setRecordings((prev) => prev.map((r) => (r.id === id ? { ...r, name: newName.trim() } : r)));
      toast.success('Запись переименована');
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
    isCloudMode,
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
    isSaving, 
    deletingIds,
  };
}
