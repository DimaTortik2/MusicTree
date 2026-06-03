import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Play, ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';
import { toneEngine } from '@/shared/lib/toneEngine';

interface IntervalInfo {
  semitones: number;
  notes: string[];
}

interface ComparisonRound {
  interval1: IntervalInfo;
  interval2: IntervalInfo;
  correctAnswer: 'first' | 'second';
}

const INTERVAL_POOL: IntervalInfo[] = [
  { semitones: 1, notes: ['C4', 'C#4'] },
  { semitones: 2, notes: ['D4', 'E4'] },
  { semitones: 3, notes: ['E4', 'G4'] },
  { semitones: 4, notes: ['F4', 'A4'] },
  { semitones: 5, notes: ['G4', 'C5'] },
  { semitones: 7, notes: ['A4', 'E5'] },
  { semitones: 9, notes: ['C4', 'A4'] },
  { semitones: 12, notes: ['C4', 'C5'] },
];

const TOTAL_ROUNDS = 5;

const generateComparisonSession = (): ComparisonRound[] => {
  const rounds: ComparisonRound[] = [];

  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const shuffled = [...INTERVAL_POOL].sort(() => 0.5 - Math.random());
    const intA = shuffled[0];
    const intB = shuffled[1];

    const isFirstWider = intA.semitones > intB.semitones;

    rounds.push({
      interval1: intA,
      interval2: intB,
      correctAnswer: isFirstWider ? 'first' : 'second',
    });
  }

  return rounds;
};

export const IntervalComparisonTrainer: React.FC = () => {
  const componentId = useId();
  const [sessionRounds, setSessionRounds] = useState<ComparisonRound[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'first' | 'second' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingNum, setIsPlayingNum] = useState<1 | 2 | null>(null);

  const [hasPlayed1, setHasPlayed1] = useState<boolean>(false);
  const [hasPlayed2, setHasPlayed2] = useState<boolean>(false);

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
    setIsPlayingNum(null);
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

    setSessionRounds(generateComparisonSession());

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      stopAudio();
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [stopAudio, componentId]);

  const playInterval = async (num: 1 | 2) => {
    if (isCompleted || isTransitioning) return;
    if (Tone.context.state !== 'running') await Tone.start();

    document.querySelectorAll('audio').forEach((a) => a.pause());
    document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

    stopAudio();

    const round = sessionRounds[currentRound];
    if (!round) return;

    setIsPlayingNum(num);
    if (num === 1) setHasPlayed1(true);
    if (num === 2) setHasPlayed2(true);

    const targetInterval = num === 1 ? round.interval1 : round.interval2;
    activeNotesRef.current = targetInterval.notes;

    toneEngine.playNote(targetInterval.notes[0]);
    const t1 = setTimeout(() => toneEngine.releaseNote(targetInterval.notes[0]), 1400);
    playbackTimeouts.current.push(t1);

    const t2 = setTimeout(() => {
      toneEngine.playNote(targetInterval.notes[1]);
      const t3 = setTimeout(() => toneEngine.releaseNote(targetInterval.notes[1]), 1100);
      playbackTimeouts.current.push(t3);
    }, 250);
    playbackTimeouts.current.push(t2);

    playTimeoutRef.current = setTimeout(() => {
      setIsPlayingNum(null);
      activeNotesRef.current = [];
    }, 1600);
  };

  const handleAnswer = (answer: 'first' | 'second') => {
    if (isTransitioning || isCompleted || !hasPlayed1 || !hasPlayed2) return;

    const round = sessionRounds[currentRound];
    if (!round) return;

    const correct = round.correctAnswer === answer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setIsTransitioning(true);
    setRoundResults((prev) => [...prev, correct]);

    if (correct) {
      setScore((prev) => prev + 1);
    }

    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedAnswer(null);
      setIsCorrect(null);
      setHasPlayed1(false);
      setHasPlayed2(false);
      setIsTransitioning(false);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setCurrentRound(TOTAL_ROUNDS);
      } else {
        setCurrentRound((prev) => prev + 1);
      }
    }, 1200);
  };

  const restartGame = () => {
    setSessionRounds(generateComparisonSession());
    setCurrentRound(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIsPlayingNum(null);
    setHasPlayed1(false);
    setHasPlayed2(false);
    setIsTransitioning(false);
    setScore(0);
    setRoundResults([]);
    stopAudio();
  };

  const round = sessionRounds[currentRound];

  return (
    <div className="relative flex min-h-[320px] w-full max-w-xl flex-col justify-between overflow-hidden rounded-2xl border-3 border-primary/20 bg-surface p-4 pb-6 shadow-lg sm:min-h-[360px] sm:p-6 sm:pb-8 md:p-10 md:pb-10">
      {!isCompleted && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-text/60 sm:text-sm">
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
                    'h-2 w-2 rounded-full transition-all duration-300 sm:h-2.5 sm:w-2.5',
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

      {!isCompleted && round && (
        <div className="my-4 flex flex-1 flex-col items-center justify-center sm:my-6">
          <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
            <Button
              onClick={() => playInterval(1)}
              variant="outline"
              color="primary"
              disabled={isPlayingNum !== null || isTransitioning}
              className="flex h-14 w-14 items-center justify-center gap-1 rounded-full p-0 transition-all duration-300 select-none sm:h-auto sm:w-auto sm:flex-1 sm:gap-2 sm:rounded-xl sm:px-6 sm:py-3"
            >
              <Play
                size={22}
                weight={isPlayingNum === 1 ? 'fill' : 'regular'}
                className={cn('sm:h-5 sm:w-5', isPlayingNum === 1 && 'animate-pulse')}
              />
              <span className="hidden sm:inline">{!hasPlayed1 ? 'Интервал 1' : 'Повторить 1'}</span>
              <span className="text-sm font-semibold sm:hidden">1</span>
            </Button>

            <Button
              onClick={() => playInterval(2)}
              variant="outline"
              color="primary"
              disabled={isPlayingNum !== null || isTransitioning}
              className="flex h-14 w-14 items-center justify-center gap-1 rounded-full p-0 transition-all duration-300 select-none sm:h-auto sm:w-auto sm:flex-1 sm:gap-2 sm:rounded-xl sm:px-6 sm:py-3"
            >
              <Play
                size={22}
                weight={isPlayingNum === 2 ? 'fill' : 'regular'}
                className={cn('sm:h-5 sm:w-5', isPlayingNum === 2 && 'animate-pulse')}
              />
              <span className="hidden sm:inline">{!hasPlayed2 ? 'Интервал 2' : 'Повторить 2'}</span>
              <span className="text-sm font-semibold sm:hidden">2</span>
            </Button>
          </div>
        </div>
      )}

      {!isCompleted && (
        <div className="mt-auto flex w-full gap-2 sm:gap-4">
          <Button
            variant={selectedAnswer === 'first' ? 'solid' : 'outline'}
            color={selectedAnswer === 'first' && isCorrect ? 'access' : 'accent'}
            disabled={!(hasPlayed1 && hasPlayed2) || isTransitioning}
            onClick={() => handleAnswer('first')}
            className={cn(
              'flex-1 rounded-xl border-2 py-3 text-base font-medium transition-all duration-300 select-none sm:rounded-2xl sm:py-4 sm:text-lg',
              selectedAnswer && selectedAnswer !== 'first' && 'pointer-events-none opacity-30',
              selectedAnswer === 'first' &&
                !isCorrect &&
                '!border-rose-600 !bg-rose-600 !text-white',
            )}
          >
            Первый шире
          </Button>

          <Button
            variant={selectedAnswer === 'second' ? 'solid' : 'outline'}
            color={selectedAnswer === 'second' && isCorrect ? 'access' : 'accent'}
            disabled={!(hasPlayed1 && hasPlayed2) || isTransitioning}
            onClick={() => handleAnswer('second')}
            className={cn(
              'flex-1 rounded-xl border-2 py-3 text-base font-medium transition-all duration-300 select-none sm:rounded-2xl sm:py-4 sm:text-lg',
              selectedAnswer && selectedAnswer !== 'second' && 'pointer-events-none opacity-30',
              selectedAnswer === 'second' &&
                !isCorrect &&
                '!border-rose-600 !bg-rose-600 !text-white',
            )}
          >
            Второй шире
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="animate-in fade-in absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/85 p-6 backdrop-blur-lg duration-500">
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle size={64} weight="fill" className="text-access" />
            <h3 className="text-xl font-bold text-text sm:text-2xl">Тренировка завершена</h3>
            <p className="text-sm text-text/70">
              Ваш результат:{' '}
              <span className="text-lg font-bold text-access">
                {score} из {TOTAL_ROUNDS}
              </span>{' '}
              правильных ответов
            </p>
            <Button
              variant="outline"
              color="primary"
              size="md"
              className="mt-4 gap-2 sm:mt-6"
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
