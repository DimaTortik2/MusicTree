import { useState, useEffect, useRef, useCallback, memo } from 'react';

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
      const v1 = buffer[i];
      const v2 = buffer[i + lag];
      num += v1 * v2;
      d1 += v1 * v1;
      d2 += v2 * v2;
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
      if (Math.abs(delta) <= 0.5) {
        refinedLag = peakLag + delta;
      }
    }
  }

  const freq = sampleRate / refinedLag;
  return freq >= minFreq && freq <= maxFreq ? freq : null;
}

function fmtDuration(ms: number): string {
  const sTime = Math.floor(ms / 1000);
  return `${Math.floor(sTime / 60)}:${String(sTime % 60).padStart(2, '0')}`;
}

function fmtDate(): string {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'recording'>('idle');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const [currentNote, setCurrentNote] = useState<NoteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const idCounterRef = useRef(0);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const lastNoteUpdateRef = useRef(0);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    playerRef.current = new Audio();
    playerRef.current.onended = () => setPlayingId(null);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      playerRef.current?.pause();
      playerRef.current = null;

      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      setRecordings((prev) => {
        prev.forEach((rec) => URL.revokeObjectURL(rec.url));
        return [];
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvasSizeRef.current = { w: rect.width, h: rect.height };

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    };

    setupCanvas();
    const ro = new ResizeObserver(setupCanvas);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, []);

  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    tickRef.current = () => {
      if (!analyserRef.current || phaseRef.current === 'idle') return;

      const buf = new Float32Array(analyserRef.current.fftSize);
      analyserRef.current.getFloatTimeDomainData(buf);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctxCanvas = canvas.getContext('2d');
        if (ctxCanvas) {
          const { w: W, h: H } = canvasSizeRef.current;
          ctxCanvas.clearRect(0, 0, W, H);

          const grad = ctxCanvas.createLinearGradient(0, 0, W, 0);
          grad.addColorStop(0, 'rgba(224,25,107,0)');
          grad.addColorStop(0.2, '#e0196b');
          grad.addColorStop(0.8, '#e0196b');
          grad.addColorStop(1, 'rgba(224,25,107,0)');

          ctxCanvas.beginPath();
          ctxCanvas.strokeStyle = grad;
          ctxCanvas.lineWidth = 2;
          const step = W / buf.length;
          for (let i = 0; i < buf.length; i++) {
            const x = i * step;
            const y = H / 2 + buf[i] * (H / 2 - 4);
            if (i === 0) ctxCanvas.moveTo(x, y);
            else ctxCanvas.lineTo(x, y);
          }
          ctxCanvas.stroke();
        }
      }

      const now = Date.now();
      if (now - lastNoteUpdateRef.current > 100) {
        const sampleRate = audioCtxRef.current?.sampleRate || 44100;
        const freq = detectPitch(buf, sampleRate);
        setCurrentNote(getNoteInfo(freq));
        lastNoteUpdateRef.current = now;
      }

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!document.hidden && phaseRef.current !== 'idle' && analyserRef.current) {
        rafRef.current = requestAnimationFrame(() => tickRef.current());
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const stopMic = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;

    setPhase('idle');
    setCurrentNote(null);
    setRecSeconds(0);
    setError(null);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const startMic = async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('WebRTC не поддерживается в этом браузере');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const wnd = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextConstructor = wnd.AudioContext || wnd.webkitAudioContext;
      if (!AudioContextConstructor) {
        throw new Error('Web Audio API не поддерживается');
      }

      const ctx = new AudioContextConstructor();
      audioCtxRef.current = ctx;

      try {
        await ctx.resume();
      } catch {
        // ignore
      }

      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.4;
      src.connect(analyser);
      analyserRef.current = analyser;

      setPhase('listening');
      lastNoteUpdateRef.current = 0;

      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err: unknown) {
      console.error('Mic error:', err);
      let msg = 'Ошибка инициализации микрофона';
      if (typeof err === 'object' && err !== null) {
        const maybe = err as { name?: unknown; message?: unknown };
        if (maybe.name === 'NotAllowedError') {
          msg = 'Доступ к микрофону запрещён. Проверьте настройки браузера.';
        } else if (typeof maybe.message === 'string') {
          msg = maybe.message;
        }
      }
      setError(msg);
      setPhase('idle');
    }
  };

  const startRec = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    recStartRef.current = Date.now();

    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

    try {
      const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const dur = Date.now() - recStartRef.current;

        idCounterRef.current += 1;
        const currentId = idCounterRef.current;

        setRecordings((prev) => [
          {
            id: currentId,
            name: `Дубль ${currentId}`,
            time: fmtDate(),
            url,
            dur,
            blob,
          },
          ...prev,
        ]);
      };

      mr.onerror = (e) => {
        console.error('Recording error:', e);
        setError('Ошибка записи. Попробуйте ещё раз.');
        setPhase('listening');
      };

      mr.start(50);
      mrRef.current = mr;
      setRecSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - recStartRef.current) / 1000));
      }, 500);

      setPhase('recording');
    } catch (err: unknown) {
      console.error('MediaRecorder init error:', err);
      setError('Запись не поддерживается в этом браузере');
    }
  };

  const stopRec = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mrRef.current && mrRef.current.state !== 'inactive') {
      mrRef.current.stop();
    }
    setPhase('listening');
  };

  const togglePlay = (rec: Recording) => {
    const pl = playerRef.current;
    if (!pl) return;

    if (playingId === rec.id) {
      pl.pause();
      setPlayingId(null);
    } else {
      if (pl.src !== rec.url) {
        pl.src = rec.url;
      }
      pl.play().catch((e) => {
        console.error('Playback error:', e);
        setError('Не удалось воспроизвести запись');
      });
      setPlayingId(rec.id);
    }
  };

  const deleteRec = (id: number) => {
    if (playingId === id) {
      playerRef.current?.pause();
      setPlayingId(null);
    }

    setRecordings((prev) => {
      const rec = prev.find((x) => x.id === id);
      if (rec?.url) {
        try {
          URL.revokeObjectURL(rec.url);
        } catch (e) {
          console.warn('Failed to revoke object URL for recording', e);
        }
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearAllRecordings = () => {
    recordings.forEach((r) => {
      try {
        URL.revokeObjectURL(r.url);
      } catch (e) {
        console.warn('Failed to revoke object URL during clearAllRecordings', e);
      }
    });
    setRecordings([]);
    if (playingId) {
      playerRef.current?.pause();
      setPlayingId(null);
    }
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
  const recLabel = isRecording
    ? `${String(Math.floor(recSeconds / 60)).padStart(2, '0')}:${String(recSeconds % 60).padStart(2, '0')}`
    : '⏺ Запись';

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0a0a0a] text-white antialiased select-none md:flex-row">
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        .animate-blink { animation: blink 1s infinite; }
        .animate-fade { animation: fadeIn 0.2s ease forwards; }
        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(224, 25, 107, 0.2); border-radius: 99px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(224, 25, 107, 0.4); }
      `}</style>

      <aside className="order-2 flex h-[220px] w-full shrink-0 flex-col overflow-hidden border-t border-[#1a1014] bg-[#090507] md:order-1 md:h-full md:w-[280px] md:border-t-0 md:border-r">
        <div className="flex items-center justify-between p-4 pb-2 md:p-5 md:pt-6 md:pb-3">
          <span className="text-[11px] font-bold tracking-[0.14em] text-white/40">ЗАПИСИ</span>
          {recordings.length > 0 && (
            <button
              onClick={clearAllRecordings}
              className="text-[10px] text-white/30 transition-colors hover:text-[#e0196b]"
              aria-label="Очистить все записи"
            >
              Очистить
            </button>
          )}
        </div>

        {recordings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-xs text-white/20">
            <div className="mb-1 text-2xl md:mb-2 md:text-3xl">🎙</div>
            Нажми ⏺ чтобы записать трек
          </div>
        ) : (
          <div className="custom-scroll flex-1 space-y-1.5 overflow-y-auto px-3.5 pb-4">
            {recordings.map((rec) => {
              const isActive = playingId === rec.id;
              return (
                <div
                  key={rec.id}
                  className={`animate-fade flex items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200 ${
                    isActive
                      ? 'border-[#e0196b] bg-[#e0196b]/15'
                      : 'border-[#1c1216] bg-[#130b0e] hover:border-[#1c1216]/80'
                  }`}
                >
                  <button
                    className="flex h-8 w-8 min-w-[32px] items-center justify-center rounded-full border border-white/25 bg-transparent text-xs text-white transition-transform hover:bg-white/5 active:scale-95"
                    onClick={() => togglePlay(rec)}
                    aria-label={isActive ? 'Пауза' : 'Воспроизвести'}
                  >
                    {isActive ? '⏸' : '▶'}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{rec.name}</div>
                    <div className="mt-0.5 text-[11px] text-white/40">
                      {fmtDuration(rec.dur)} · {rec.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                      onClick={() => downloadRec(rec)}
                      aria-label="Скачать запись"
                      title="Скачать"
                    >
                      ⬇
                    </button>
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] text-white/40 transition-colors hover:bg-[#e0196b]/20 hover:text-[#e0196b]"
                      onClick={() => deleteRec(rec.id)}
                      aria-label="Удалить запись"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <main className="order-1 flex flex-1 flex-col gap-4 overflow-hidden bg-[#050204] p-4 md:order-2 md:gap-6 md:p-6 md:px-8">
        <div className="flex shrink-0 items-center justify-between rounded-2xl border border-[#e0196b]/15 bg-[#e0196b]/[0.03] p-3 px-5 md:p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {isRecording && (
              <div className="animate-blink h-2 w-2 shrink-0 rounded-full bg-[#e0196b]" />
            )}
            <span className="truncate text-xs font-semibold tracking-wide md:text-sm">
              {error ? (
                <span className="text-[#ff6b6b]">⚠ {error}</span>
              ) : currentNote ? (
                `${currentNote.name}${currentNote.octave} · ${currentNote.freq} Гц ${currentNote.cents !== 0 ? `(${currentNote.cents > 0 ? '+' : ''}${currentNote.cents}¢)` : '✓'}`
              ) : isRecording ? (
                `Запись... ${recLabel}`
              ) : isListening ? (
                'Слушаю вокал...'
              ) : (
                'Тюнер готов'
              )}
            </span>
          </div>
          {currentNote && (
            <div
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                Math.abs(currentNote.cents) < 8
                  ? 'bg-[#e0196b]/20 text-[#e0196b]'
                  : Math.abs(currentNote.cents) < 22
                    ? 'bg-[#ffb300]/20 text-[#ffb300]'
                    : 'bg-white/10 text-white/60'
              }`}
            >
              {Math.abs(currentNote.cents) < 8
                ? 'В тоне'
                : Math.abs(currentNote.cents) < 22
                  ? 'Почти'
                  : 'Мимо'}
            </div>
          )}
        </div>

        <TunerArea noteInfo={currentNote} />

        <canvas
          ref={canvasRef}
          className="h-16 w-full shrink-0 rounded-2xl border border-[#201016] bg-[#0d070a] md:h-20"
          aria-hidden="true"
        />

        <div className="flex shrink-0 items-center justify-center gap-5 pb-2 md:pb-0">
          {isListening && (
            <button
              onClick={isRecording ? stopRec : startRec}
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#e0196b] transition-all duration-200 active:scale-95 md:h-14 md:w-14 ${
                isRecording
                  ? 'animate-pulse border-white bg-white'
                  : 'bg-[#1c0b11] hover:bg-[#251017]'
              }`}
              aria-label={isRecording ? 'Остановить запись' : 'Начать запись'}
            >
              {isRecording ? (
                <div className="h-3 w-3 rounded-sm bg-[#e0196b]" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full bg-[#e0196b]" />
              )}
            </button>
          )}

          <button
            onClick={isListening ? stopMic : startMic}
            className={`flex h-16 min-h-[64px] w-16 min-w-[64px] items-center justify-center rounded-full border transition-all duration-200 active:scale-95 md:h-[72px] md:min-h-[72px] md:w-[72px] md:min-w-[72px] ${
              isListening
                ? 'border-[#e0196b] bg-[#1c0b11] hover:bg-[#251017]'
                : 'border-transparent bg-gradient-to-br from-[#ff52a1] to-[#e0196b] shadow-[0_0_30px_rgba(224,25,107,0.4)] hover:shadow-[0_0_40px_rgba(224,25,107,0.6)]'
            }`}
            aria-label={isListening ? 'Остановить тюнер' : 'Запустить тюнер'}
          >
            {isListening ? (
              <div className="h-4 w-4 rounded-sm bg-[#e0196b]" />
            ) : (
              <span className="text-xl md:text-2xl">🎤</span>
            )}
          </button>
        </div>

        <div className="text-center text-[10px] text-white/30 md:hidden">
          Для лучшей точности используйте наушники
        </div>
      </main>
    </div>
  );
}

const TunerArea = memo(({ noteInfo }: { noteInfo: NoteInfo | null }) => {
  const cents = noteInfo?.cents ?? 0;
  const fillLevel = noteInfo ? Math.max(0.02, Math.min(0.98, 0.5 + cents / 100)) : 0.5;

  const tuneColor = !noteInfo
    ? '#555'
    : Math.abs(cents) < 8
      ? '#e0196b'
      : Math.abs(cents) < 22
        ? '#ffb300'
        : '#ff6b6b';

  const noteAbove = noteInfo ? NOTES[(NOTES.indexOf(noteInfo.name) + 1) % 12] : 'A#';
  const noteBelow = noteInfo ? NOTES[(NOTES.indexOf(noteInfo.name) + 11) % 12] : 'G#';

  return (
    <div className="flex flex-1 items-center justify-center gap-6 py-2 md:gap-14">
      <div className="flex h-[200px] w-12 flex-col items-end justify-between md:h-[280px] md:w-16">
        <span
          className={`text-lg font-light transition-colors duration-200 md:text-2xl ${
            noteInfo && noteInfo.cents < -22 ? 'text-[#ff6b6b]' : 'text-white/25'
          }`}
        >
          {noteAbove}
        </span>
        <span
          className="text-4xl font-bold tracking-tight transition-colors duration-200 select-none md:text-[54px]"
          style={{ color: tuneColor }}
        >
          {noteInfo?.name ?? '—'}
        </span>
        <span
          className={`text-lg font-light transition-colors duration-200 md:text-2xl ${
            noteInfo && noteInfo.cents > 22 ? 'text-[#ff6b6b]' : 'text-white/25'
          }`}
        >
          {noteBelow}
        </span>
      </div>

      <div
        className="relative h-[200px] w-[70px] overflow-hidden rounded-[20px] border-2 bg-white/[0.01] transition-all duration-200 md:h-[280px] md:w-[100px] md:rounded-[24px]"
        style={{
          borderColor: tuneColor,
          boxShadow: `0 0 40px ${tuneColor}22`,
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <div
          className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-[#e0196b]/10 to-[#e0196b]/50 transition-[height] duration-100 ease-out"
          style={{ height: `${fillLevel * 100}%` }}
        />

        <div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 bg-[#e0196b] opacity-60" />

        {noteInfo && Math.abs(cents) >= 8 && (
          <div
            className="absolute h-1.5 w-1.5 rounded-full transition-all duration-100"
            style={{
              backgroundColor: Math.abs(cents) < 22 ? '#ffb300' : '#ff6b6b',
              top: cents > 0 ? 'auto' : '20%',
              bottom: cents > 0 ? '20%' : 'auto',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>

      <div className="flex min-w-[70px] flex-col items-start gap-2 md:min-w-[100px] md:gap-3.5">
        {noteInfo ? (
          <>
            <div>
              <div className="text-2xl leading-none font-bold md:text-4xl">{noteInfo.freq}</div>
              <div className="mt-0.5 text-[10px] tracking-wider text-white/40 md:mt-1 md:text-[12px]">
                ГЕРЦ
              </div>
            </div>
            <div className="text-sm font-medium tracking-wide text-white/50 md:text-lg">
              ОКТАВА {noteInfo.octave}
            </div>
            {cents !== 0 && (
              <div
                className={`text-[10px] md:text-xs ${
                  Math.abs(cents) < 8 ? 'text-[#e0196b]' : 'text-white/40'
                }`}
              >
                {cents > 0 ? '+' : ''}
                {cents}¢
              </div>
            )}
          </>
        ) : (
          <div className="text-[11px] tracking-wide text-white/20 md:text-xs">Ожидание...</div>
        )}
      </div>
    </div>
  );
});
TunerArea.displayName = 'TunerArea';
