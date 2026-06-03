import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, Check, CheckCircle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/app/utils/cn';
import { Button } from '@/shared/buttons/Button';

interface WordData {
  id: number;
  text: string;
  correctCulmination?: boolean;
  correctBreathAfter?: boolean;
  breakAfter?: boolean;
}

const LYRICS: WordData[] = [
  // 1 строчка
  { id: 1, text: 'Солнце' },
  { id: 2, text: 'мое,', correctBreathAfter: true },
  { id: 3, text: 'взгляни' },
  { id: 4, text: 'на' },
  { id: 5, text: 'меня,', correctCulmination: true, correctBreathAfter: true, breakAfter: true },
  
  // 2 строчка
  { id: 6, text: 'Моя' },
  { id: 7, text: 'ладонь' },
  { id: 8, text: 'превратилась' },
  { id: 9, text: 'в' },
  { id: 10, text: 'кулак,', correctCulmination: true, correctBreathAfter: true, breakAfter: true },
  
  // 3 строчка
  { id: 11, text: 'И' },
  { id: 12, text: 'если' },
  { id: 13, text: 'есть' },
  { id: 14, text: 'порох,', correctBreathAfter: true },
  { id: 15, text: 'дай' },
  { id: 16, text: 'огня.', correctCulmination: true, correctBreathAfter: true, breakAfter: true },
  
  // 4 строчка
  { id: 17, text: 'Вот' },
  { id: 18, text: 'так...', correctCulmination: true }
];

type PracticeStatus = 'idle' | 'checked' | 'revealing' | 'completed';

export const PhrasingTrainer: React.FC = () => {
  const [userCulminations, setUserCulminations] = useState<number[]>([]);
  const [userBreaths, setUserBreaths] = useState<number[]>([]);
  const [status, setStatus] = useState<PracticeStatus>('idle');
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleUserEdit = () => {
    if (status === 'checked') {
      setStatus('idle');
    }
  };

  const toggleCulmination = (id: number) => {
    if (status === 'revealing' || status === 'completed') return;
    handleUserEdit();
    setUserCulminations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleBreath = (id: number) => {
    if (status === 'revealing' || status === 'completed') return;
    handleUserEdit();
    setUserBreaths((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCheck = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const expectedCulms = LYRICS.filter(w => w.correctCulmination).map(w => w.id);
    const expectedBreaths = LYRICS.filter(w => w.correctBreathAfter).map(w => w.id);

    const isCulmsCorrect = expectedCulms.length === userCulminations.length && 
                           expectedCulms.every(id => userCulminations.includes(id));
                           
    const isBreathsCorrect = expectedBreaths.length === userBreaths.length && 
                             expectedBreaths.every(id => userBreaths.includes(id));

    setHasCheckedOnce(true);

    if (isCulmsCorrect && isBreathsCorrect) {
      setStatus('completed');
    } else {
      setStatus('checked');
    }
  }, [userCulminations, userBreaths]);

  const handleReveal = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setStatus('revealing');
    
    timeoutRef.current = setTimeout(() => {
      setStatus('checked');
    }, 2000);
  }, []);

  const handleRestart = useCallback(() => {
    setUserCulminations([]);
    setUserBreaths([]);
    setStatus('idle');
    setHasCheckedOnce(false);
  }, []);

  const renderCulminationIcon = (word: WordData) => {
    const hasUserMark = userCulminations.includes(word.id);
    const isCorrectMark = word.correctCulmination;

    if (status === 'idle') {
      return hasUserMark ? <ArrowUp weight="bold" className="text-accent text-lg md:text-xl" /> : null;
    }

    if (status === 'checked' || status === 'completed') {
      if (hasUserMark && isCorrectMark) return <ArrowUp weight="bold" className="text-access text-lg md:text-xl animate-in zoom-in" />;
      if (hasUserMark && !isCorrectMark) return <ArrowUp weight="bold" className="text-primary text-lg md:text-xl" />;
      return null;
    }

    if (status === 'revealing') {
      if (hasUserMark && isCorrectMark) return <ArrowUp weight="bold" className="text-access text-lg md:text-xl" />;
      if (hasUserMark && !isCorrectMark) return <ArrowUp weight="bold" className="text-primary text-lg md:text-xl" />;
      if (!hasUserMark && isCorrectMark) return <ArrowUp weight="bold" className="text-access/50 text-lg md:text-xl animate-pulse" />;
      return null;
    }
    return null;
  };

  const renderBreathIcon = (word: WordData) => {
    const hasUserMark = userBreaths.includes(word.id);
    const isCorrectMark = word.correctBreathAfter;

    if (status === 'idle') {
      return hasUserMark ? <Check weight="bold" className="text-accent text-lg md:text-xl" /> : null;
    }

    if (status === 'checked' || status === 'completed') {
      if (hasUserMark && isCorrectMark) return <Check weight="bold" className="text-access text-lg md:text-xl animate-in zoom-in" />;
      if (hasUserMark && !isCorrectMark) return <Check weight="bold" className="text-primary text-lg md:text-xl" />;
      return null;
    }

    if (status === 'revealing') {
      if (hasUserMark && isCorrectMark) return <Check weight="bold" className="text-access text-lg md:text-xl" />;
      if (hasUserMark && !isCorrectMark) return <Check weight="bold" className="text-primary text-lg md:text-xl" />;
      if (!hasUserMark && isCorrectMark) return <Check weight="bold" className="text-access/50 text-lg md:text-xl animate-pulse" />;
      return null;
    }
    return null;
  };

  return (
    <div className="relative w-full max-w-4xl bg-surface border-3 border-primary/20 rounded-2xl shadow-lg p-6 md:p-10 overflow-hidden flex flex-col items-center">

      {/* Текст песни */}
      <div className="flex flex-wrap justify-center items-end gap-y-2 gap-x-1.5 mb-10 select-none w-full max-w-2xl">
        {LYRICS.map((word, index) => (
          <React.Fragment key={word.id}>
            
            {/* Блок слова */}
            <div 
              className={cn(
                "relative flex flex-col items-center cursor-pointer transition-transform hover:scale-102 active:scale-98",
                (status === 'revealing' || status === 'completed') && "pointer-events-none"
              )}
              onClick={() => toggleCulmination(word.id)}
            >
              <div className="h-5 flex items-end justify-center mb-0.5 w-full">
                {renderCulminationIcon(word)}
              </div>
              <span className="text-lg md:text-2xl font-medium text-text leading-tight">
                {word.text}
              </span>
            </div>

            {/* Блок промежутка (вдоха) */}
            {index < LYRICS.length - 1 && (
              <div 
                className={cn(
                  "relative w-6 md:w-8 h-[1.8rem] md:h-[2.2rem] flex items-end justify-center cursor-pointer group",
                  (status === 'revealing' || status === 'completed') && "pointer-events-none"
                )}
                onClick={() => toggleBreath(word.id)}
              >
                <div className="absolute inset-0 -mx-1 hover:bg-white/5 rounded-md transition-colors" />
                <div className="relative z-10 pb-0.5">
                  {renderBreathIcon(word)}
                </div>
              </div>
            )}

            {/* Перенос строки */}
            {word.breakAfter && <div className="basis-full h-0"></div>}

          </React.Fragment>
        ))}
      </div>

      {/* Панель кнопок */}
      <div className="flex flex-row flex-wrap justify-center items-center gap-4 w-full md:w-auto z-10">
        <Button 
          variant="outline" 
          color="accent" 
          size="md" 
          onClick={handleCheck}
          disabled={status === 'revealing'}
          className="w-full sm:w-auto min-w-[200px]"
        >
          Проверить
        </Button>

        {hasCheckedOnce && (
          <Button 
            variant="outline" 
            color="primary" 
            size="md" 
            onClick={handleReveal}
            disabled={status === 'revealing'}
            className="w-full sm:w-auto min-w-[200px] gap-2"
          >
            {status === 'revealing' ? 'Показ ответов...' : 'Увидеть ответ'}
          </Button>
        )}
      </div>

      {/* Оверлей завершения */}
      {status === 'completed' && (
        <div className="absolute inset-0 z-30 bg-background/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <CheckCircle size={64} weight="fill" className="text-access" />
            <h3 className="text-2xl md:text-3xl font-bold text-text">Отлично!</h3>
            <p className="text-text/60 mb-4 max-w-sm">
              Ты безошибочно определил все кульминации и точки вдоха.
            </p>
             <Button
               variant="outline"
               color="primary"
               size="md"
               className="mt-6 gap-2"
               onClick={handleRestart}
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