import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Play, ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';
import { toneEngine } from '@/shared/lib/toneEngine';

interface IntervalDefinition {
  id: string;
  name: string;
  semitones: number;
}

interface GeneratedRound {
  targetInterval: IntervalDefinition;
  notes: string[];
  options: IntervalDefinition[];
}

const INTERVALS_DB: IntervalDefinition[] = [
  { id: 'm2', name: 'Малая секунда', semitones: 1 },
  { id: 'M2', name: 'Большая секунда', semitones: 2 },
  { id: 'm3', name: 'Малая терция', semitones: 3 },
  { id: 'M3', name: 'Большая терция', semitones: 4 },
  { id: 'P4', name: 'Чистая кварта', semitones: 5 },
  { id: 'TT', name: 'Тритон', semitones: 6 },
  { id: 'P5', name: 'Чистая квинта', semitones: 7 },
  { id: 'm6', name: 'Малая секста', semitones: 8 },
  { id: 'M6', name: 'Большая секста', semitones: 9 },
  { id: 'm7', name: 'Малая септима', semitones: 10 },
  { id: 'M7', name: 'Большая септима', semitones: 11 },
  { id: 'P8', name: 'Чистая октава', semitones: 12 },
];

const TOTAL_ROUNDS = 5;
const MIDI_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const midiToNoteName = (midi: number): string => {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${MIDI_NOTES[noteIndex]}${octave}`;
};

const generateRandomSession = (): GeneratedRound[] => {
  const rounds: GeneratedRound[] = [];

  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const targetInterval = INTERVALS_DB[Math.floor(Math.random() * INTERVALS_DB.length)];
    const rootMidi = 60 + Math.floor(Math.random() * 8);
    const targetMidi = rootMidi + targetInterval.semitones;
    const notes = [midiToNoteName(rootMidi), midiToNoteName(targetMidi)];

    const wrongCandidates = INTERVALS_DB.filter((item) => item.id !== targetInterval.id);
    const shuffledCandidates = [...wrongCandidates].sort(() => 0.5 - Math.random());
    const chosenIncorrect = shuffledCandidates.slice(0, 3);

    const options = [targetInterval, ...chosenIncorrect].sort(() => 0.5 - Math.random());

    rounds.push({
      targetInterval,
      notes,
      options,
    });
  }

  return rounds;
};

export const IntervalTrainer: React.FC = () => {
  const componentId = useId();
  const [sessionRounds, setSessionRounds] = useState<GeneratedRound[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);

  const [hasPlayedOnce, setHasPlayedOnce] = useState<boolean>(false);
  const [hasPlayedInRound, setHasPlayedInRound] = useState<boolean>(false);

  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);

  const activeNotesRef = useRef<string[]>([]);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const isCompleted = currentRound >= TOTAL_ROUNDS;

  const stopAudio = useCallback(() => {
    activeNotesRef.current.forEach((n) => toneEngine.releaseNote(n));
    activeNotesRef.current = [];
    setIsPlayingSound(false);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    playbackTimeouts.current.forEach(clearTimeout);
    playbackTimeouts.current = [];
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

    setSessionRounds(generateRandomSession());

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      stopAudio();
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [stopAudio, componentId]);

  const playTargetInterval = useCallback(async () => {
    if (isCompleted || isTransitioning) return;

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    document.querySelectorAll('audio').forEach((a) => a.pause());
    document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

    stopAudio();

    const currentRoundData = sessionRounds[currentRound];
    if (!currentRoundData) return;

    setIsPlayingSound(true);
    setHasPlayedOnce(true);
    setHasPlayedInRound(true);

    activeNotesRef.current = currentRoundData.notes;

    toneEngine.playNote(currentRoundData.notes[0]);
    const t1 = setTimeout(() => toneEngine.releaseNote(currentRoundData.notes[0]), 1400);
    playbackTimeouts.current.push(t1);

    const t2 = setTimeout(() => {
      toneEngine.playNote(currentRoundData.notes[1]);
      const t3 = setTimeout(() => toneEngine.releaseNote(currentRoundData.notes[1]), 1100);
      playbackTimeouts.current.push(t3);
    }, 280);
    playbackTimeouts.current.push(t2);

    playTimeoutRef.current = setTimeout(() => {
      setIsPlayingSound(false);
      activeNotesRef.current = [];
    }, 1600);
  }, [sessionRounds, currentRound, isCompleted, isTransitioning, stopAudio, componentId]);

  const handleAnswer = (answerId: string) => {
    if (isTransitioning || isCompleted || !hasPlayedInRound) return;

    const currentRoundData = sessionRounds[currentRound];
    if (!currentRoundData) return;

    const correct = currentRoundData.targetInterval.id === answerId;
    setSelectedAnswerId(answerId);
    setIsCorrect(correct);
    setIsTransitioning(true);
    setRoundResults((prev) => [...prev, correct]);

    if (correct) {
      setScore((prev) => prev + 1);
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedAnswerId(null);
      setIsCorrect(null);
      setHasPlayedInRound(false);
      setIsTransitioning(false);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setCurrentRound(TOTAL_ROUNDS);
      } else {
        setCurrentRound((prev) => prev + 1);
      }
    }, 1800);
  };

  const restartGame = () => {
    setSessionRounds(generateRandomSession());
    setCurrentRound(0);
    setSelectedAnswerId(null);
    setIsCorrect(null);
    setIsPlayingSound(false);
    setHasPlayedOnce(false);
    setHasPlayedInRound(false);
    setIsTransitioning(false);
    setScore(0);
    setRoundResults([]);
    stopAudio();
  };

  useEffect(() => {
    if (currentRound > 0 && currentRound < TOTAL_ROUNDS && !isCompleted) {
      const timer = setTimeout(() => playTargetInterval(), 400);
      return () => clearTimeout(timer);
    }
  }, [currentRound, isCompleted, playTargetInterval]);

  const currentRoundData = sessionRounds[currentRound];

  return (
    <div className="relative flex min-h-[420px] w-full max-w-xl flex-col justify-between overflow-hidden rounded-2xl border-3 border-primary/20 bg-surface p-6 pb-8 shadow-lg md:p-10 md:pb-10">
      {!isCompleted && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-text/60">
            Раунд {Math.min(currentRound + 1, TOTAL_ROUNDS)} из {TOTAL_ROUNDS}
          </span>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
              const wasAnswered = i < roundResults.length;
              const isCorrectGuess = roundResults[i];
              const isCurrent = i === currentRound;

              return (
                <div
                  key={i}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-all duration-300',
                    wasAnswered
                      ? isCorrectGuess
                        ? 'bg-access'
                        : 'bg-rose-600'
                      : isCurrent
                        ? 'scale-110 bg-accent'
                        : 'bg-text/20',
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {!isCompleted && currentRoundData && (
        <div className="my-4 flex flex-1 flex-col items-center justify-center">
          <Button
            onClick={playTargetInterval}
            variant="outline"
            size="md"
            color="primary"
            className="gap-2 select-none"
            disabled={isPlayingSound || isTransitioning}
          >
            <Play
              size={20}
              weight={isPlayingSound ? 'fill' : 'regular'}
              className={cn(isPlayingSound && 'animate-pulse')}
            />
            {!hasPlayedOnce ? 'Слушать интервал' : 'Повторить интервал'}
          </Button>
        </div>
      )}

      {!isCompleted && currentRoundData && (
        <div className="mt-auto grid w-full grid-cols-2 gap-3">
          {currentRoundData.options.map((option) => {
            const isSelected = selectedAnswerId === option.id;
            const isCorrectOption = option.id === currentRoundData.targetInterval.id;

            let buttonColorClass = '';
            if (isTransitioning) {
              if (isCorrectOption) {
                buttonColorClass = '!bg-access !border-access !text-white';
              } else if (isSelected && !isCorrect) {
                buttonColorClass = '!bg-rose-600 !border-rose-600 !text-white';
              } else {
                buttonColorClass = 'opacity-30 pointer-events-none';
              }
            }

            return (
              <Button
                key={option.id}
                variant={isSelected ? 'solid' : 'outline'}
                color="accent"
                disabled={!hasPlayedInRound || isTransitioning}
                onClick={() => handleAnswer(option.id)}
                className={cn(
                  'rounded-xl border-2 py-4 text-base font-medium transition-all duration-300 select-none',
                  buttonColorClass,
                )}
              >
                {option.name}
              </Button>
            );
          })}
        </div>
      )}

      {isCompleted && (
        <div className="animate-in fade-in absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/85 p-6 backdrop-blur-lg duration-500">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle size={64} weight="fill" className="text-access" />
            <h3 className="text-2xl font-bold text-text">Тренировка завершена</h3>
            <p className="text-sm text-text/70">
              Ваш результат:{' '}
              <span className="text-lg font-bold text-access">
                {score} из {TOTAL_ROUNDS}{' '}
              </span>{' '}
              правильных ответов
            </p>
            <Button
              variant="outline"
              color="primary"
              size="md"
              className="mt-6 gap-2"
              onClick={restartGame}
            >
              <ArrowCounterClockwise size={20} />
              Начать заново
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
