import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Play, ArrowCounterClockwise, CheckCircle } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';
import { toneEngine } from '@/shared/lib/toneEngine';

interface ChordTemplate {
  name: string;
  type: 'major' | 'minor';
  notes: string[];
}

const CHORD_TEMPLATES: ChordTemplate[] = [
  { name: 'C Major', type: 'major', notes: ['C4', 'E4', 'G4'] },
  { name: 'C Minor', type: 'minor', notes: ['C4', 'Eb4', 'G4'] },
  { name: 'D Major', type: 'major', notes: ['D4', 'F#4', 'A4'] },
  { name: 'D Minor', type: 'minor', notes: ['D4', 'F4', 'A4'] },
  { name: 'E Major', type: 'major', notes: ['E4', 'G#4', 'B4'] },
  { name: 'E Minor', type: 'minor', notes: ['E4', 'G4', 'B4'] },
  { name: 'F Major', type: 'major', notes: ['F4', 'A4', 'C5'] },
  { name: 'F Minor', type: 'minor', notes: ['F4', 'Ab4', 'C5'] },
  { name: 'G Major', type: 'major', notes: ['G4', 'B4', 'D5'] },
  { name: 'G Minor', type: 'minor', notes: ['G4', 'Bb4', 'D5'] },
  { name: 'A Major', type: 'major', notes: ['A4', 'C#5', 'E5'] },
  { name: 'A Minor', type: 'minor', notes: ['A4', 'C5', 'E5'] },
];

const TOTAL_ROUNDS = 5;

const generateRandomSession = () => {
  const shuffled = [...CHORD_TEMPLATES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, TOTAL_ROUNDS);
};

export const ChordTrainer: React.FC = () => {
  const componentId = useId();
  const [sessionChords, setSessionChords] = useState<ChordTemplate[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'major' | 'minor' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState<boolean>(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [hasPlayedAtLeastOnce, setHasPlayedAtLeastOnce] = useState<boolean>(false);

  const activeNotesRef = useRef<string[]>([]);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted = currentRound >= TOTAL_ROUNDS;

  const stopAudio = useCallback(() => {
    activeNotesRef.current.forEach((n) => toneEngine.releaseNote(n));
    activeNotesRef.current = [];
    setIsPlayingSound(false);
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
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

    setSessionChords(generateRandomSession());

    return () => {
      document.removeEventListener('play', handleGlobalPlay, true);
      document.removeEventListener('app-media-play', handleGlobalPlay);
      stopAudio();
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [stopAudio, componentId]);

  const playTargetChord = useCallback(async () => {
    if (isCompleted) return;

    if (Tone.context.state !== 'running') {
      await Tone.start();
    }

    document.querySelectorAll('audio').forEach((a) => a.pause());
    document.dispatchEvent(new CustomEvent('app-media-play', { detail: { id: componentId } }));

    stopAudio();

    const currentChord = sessionChords[currentRound];
    if (!currentChord) return;

    setIsPlayingSound(true);
    setHasPlayedOnce(true);
    setHasPlayedAtLeastOnce(true);

    activeNotesRef.current = currentChord.notes;
    currentChord.notes.forEach((note) => toneEngine.playNote(note));

    playTimeoutRef.current = setTimeout(() => {
      currentChord.notes.forEach((note) => toneEngine.releaseNote(note));
      activeNotesRef.current = [];
      setIsPlayingSound(false);
    }, 1500);
  }, [sessionChords, currentRound, isCompleted, stopAudio, componentId]);

  const handleAnswer = (answer: 'major' | 'minor') => {
    if (isTransitioning || isCompleted || !hasPlayedOnce) return;

    const currentChord = sessionChords[currentRound];
    if (!currentChord) return;

    const correct = currentChord.type === answer;
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
      setHasPlayedOnce(false);
      setIsTransitioning(false);

      if (currentRound + 1 >= TOTAL_ROUNDS) {
        setCurrentRound(TOTAL_ROUNDS);
      } else {
        setCurrentRound((prev) => prev + 1);
      }
    }, 1200);
  };

  const restartGame = () => {
    setSessionChords(generateRandomSession());
    setCurrentRound(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIsPlayingSound(false);
    setHasPlayedOnce(false);
    setHasPlayedAtLeastOnce(false);
    setIsTransitioning(false);
    setScore(0);
    setRoundResults([]);
    stopAudio();
  };

  useEffect(() => {
    if (currentRound > 0 && currentRound < TOTAL_ROUNDS && !isCompleted) {
      const timer = setTimeout(() => playTargetChord(), 400);
      return () => clearTimeout(timer);
    }
  }, [currentRound, isCompleted, playTargetChord]);

  const currentChord = sessionChords[currentRound];

  return (
    <div className="relative flex min-h-[360px] w-full max-w-xl flex-col justify-between overflow-hidden rounded-2xl border-3 border-primary/20 bg-surface p-6 pb-8 shadow-lg md:p-10 md:pb-10">
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

      {!isCompleted && currentChord && (
        <div className="my-6 flex flex-1 flex-col items-center justify-center">
          <Button
            onClick={playTargetChord}
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
            {!hasPlayedAtLeastOnce ? 'Слушать аккорд' : 'Повторить аккорд'}
          </Button>
        </div>
      )}

      {!isCompleted && (
        <div className="mt-auto flex w-full gap-4">
          <Button
            variant={selectedAnswer === 'major' ? 'solid' : 'outline'}
            color={selectedAnswer === 'major' && isCorrect ? 'access' : 'accent'}
            disabled={!hasPlayedOnce || isTransitioning}
            onClick={() => handleAnswer('major')}
            className={cn(
              'flex-1 rounded-2xl border-2 py-4 text-lg font-medium transition-all duration-300 select-none',
              selectedAnswer && selectedAnswer !== 'major' && 'pointer-events-none opacity-30',
              selectedAnswer === 'major' &&
                !isCorrect &&
                '!border-rose-600 !bg-rose-600 !text-white',
            )}
          >
            Мажор
          </Button>

          <Button
            variant={selectedAnswer === 'minor' ? 'solid' : 'outline'}
            color={selectedAnswer === 'minor' && isCorrect ? 'access' : 'accent'}
            disabled={!hasPlayedOnce || isTransitioning}
            onClick={() => handleAnswer('minor')}
            className={cn(
              'flex-1 rounded-2xl border-2 py-4 text-lg font-medium transition-all duration-300 select-none',
              selectedAnswer && selectedAnswer !== 'minor' && 'pointer-events-none opacity-30',
              selectedAnswer === 'minor' &&
                !isCorrect &&
                '!border-rose-600 !bg-rose-600 !text-white',
            )}
          >
            Минор
          </Button>
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
                {score} из {TOTAL_ROUNDS}
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
