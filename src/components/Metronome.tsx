import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Play, Pause, Minus, Plus } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from './../app/utils/cn';
import { Button } from '@/shared/buttons/Button';

interface MetronomeProps {
  className?: string;
}

export function Metronome({ className }: MetronomeProps) {
  const componentId = useId();
  const [bpm, setBpm] = useState<number>(120);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const loopRef = useRef<Tone.Loop | null>(null);

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const stopAudio = useCallback(() => {
    if (isPlayingRef.current) {
      loopRef.current?.stop();
      Tone.Transport.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      if (e.type === 'play' && e.target instanceof HTMLAudioElement) stopAudio();
      if (e.type === 'app-media-play') {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.id !== componentId) stopAudio();
      }
    };
    document.addEventListener('play', handleGlobalPlay, true);
    document.addEventListener('app-media-play', handleGlobalPlay);

    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.01 },
    }).toDestination();

    const loop = new Tone.Loop((time) => {
      synth.triggerAttackRelease('C4', '32n', time);
    }, '4n');

    synthRef.current = synth;
    loopRef.current = loop;

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      loop.dispose();
      synth.dispose();
      stopAudio();
    };
  }, [stopAudio, componentId]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const togglePlay = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    if (!isPlaying) {
      document.querySelectorAll('audio').forEach((a) => a.pause());
      document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

      loopRef.current?.start(0);
      Tone.Transport.start();
      setIsPlaying(true);
    } else {
      stopAudio();
    }
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(Number(e.target.value));
  };

  const adjustBpm = (amount: number) => {
    setBpm((prev) => Math.min(Math.max(40, prev + amount), 250));
  };

  return (
    <div
      className={cn(
        'flex w-full max-w-sm flex-col items-center gap-6 rounded-2xl border-3 border-primary/20 bg-surface p-6 shadow-lg md:p-8',
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <span className="text-6xl font-bold tracking-tighter text-primary">{bpm}</span>
        <span className="mt-1 text-sm font-medium tracking-widest text-text/60 uppercase">BPM</span>
      </div>

      <div className="flex w-full items-center gap-4">
        <button
          onClick={() => adjustBpm(-1)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text transition-colors hover:bg-background active:scale-95"
          aria-label="Уменьшить темп"
        >
          <Minus size={24} weight="bold" />
        </button>

        <input
          type="range"
          min="40"
          max="250"
          value={bpm}
          onChange={handleBpmChange}
          className="h-2 flex-1 cursor-pointer touch-none appearance-none rounded-lg bg-background accent-primary"
        />

        <button
          onClick={() => adjustBpm(1)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text transition-colors hover:bg-background active:scale-95"
          aria-label="Увеличить темп"
        >
          <Plus size={24} weight="bold" />
        </button>
      </div>

      <Button
        onClick={togglePlay}
        variant="outline"
        size="md"
        color="primary"
        className="min-h-[56px] w-full gap-2"
      >
        {isPlaying ? (
          <>
            <Pause size={20} />
            Пауза
          </>
        ) : (
          <>
            <Play size={20} />
            Старт
          </>
        )}
      </Button>
    </div>
  );
}
