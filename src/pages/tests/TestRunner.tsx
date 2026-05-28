// src/app/pages/tests/TestRunner.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ExclamationMark } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { cn } from '@/app/utils/cn';
import { useProgressStore } from '@/app/store/useProgressStore';
import { Modal } from '@/shared/Modal';
import confetti from 'canvas-confetti';
import type { MappedTest } from './useTestsData';

interface TestRunnerProps {
  test: MappedTest;
  onDirtyStateChange: (isDirty: boolean) => void;
}

export const TestRunner: React.FC<TestRunnerProps> = ({ test, onDirtyStateChange }) => {
  const { passTest, clearTestResult } = useProgressStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[][]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);

  const question = test.questions[currentIndex];
  const totalQuestions = test.questions.length;

  // Отслеживаем прогресс, чтобы передать наверх в блокировщик роутинга
  useEffect(() => {
    const isDirty =
      !isFinished &&
      !test.isPassed &&
      (currentIndex > 0 || selectedOptions.length > 0 || isSubmitted);
    onDirtyStateChange(isDirty);
  }, [currentIndex, selectedOptions, isSubmitted, isFinished, test.isPassed, onDirtyStateChange]);

  const handleOptionToggle = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedOptions((prev) =>
      prev.includes(optionIndex) ? prev.filter((i) => i !== optionIndex) : [...prev, optionIndex],
    );
  };

  const handleSubmit = () => setIsSubmitted(true);

  const handleNext = () => {
    const newAnswers = [...userAnswers, selectedOptions];
    setUserAnswers(newAnswers);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptions([]);
      setIsSubmitted(false);
    } else {
      finishTest(newAnswers);
    }
  };

  const fireConfettiAndScroll = () => {
    const root = getComputedStyle(document.documentElement);
    const colors = [
      root.getPropertyValue('--accent').trim() || '#8b5cf6',
      root.getPropertyValue('--primary').trim() || '#ec4899',
    ];

    confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 }, colors, zIndex: 1000 });

    setTimeout(() => {
      document
        .getElementById(`test-item-${test.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const finishTest = (finalAnswers: number[][]) => {
    let score = 0;
    finalAnswers.forEach((answerStr, index) => {
      const correct = test.questions[index].correctAnswers;
      const isExactlyCorrect =
        answerStr.length === correct.length && answerStr.every((val) => correct.includes(val));
      if (isExactlyCorrect) score += 1;
    });

    const result = { score, maxScore: totalQuestions, userAnswers: finalAnswers };
    passTest(test.id, result);
    setIsFinished(true);
    fireConfettiAndScroll();
  };

  const handleRetake = () => {
    clearTestResult(test.id);
    setShowClearModal(false);

    // Сбрасываем локальные стейты, чтобы экран результатов пропал
    setIsFinished(false);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setIsSubmitted(false);
    setUserAnswers([]);

    // Скролл после извлечения из архива
    setTimeout(() => {
      document
        .getElementById(`test-item-${test.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // --- ЭКРАН РЕЗУЛЬТАТОВ (АРХИВ) ---
  if (isFinished || test.isPassed) {
    const displayResult = isFinished
      ? {
          score: userAnswers.filter(
            (ans, i) =>
              ans.length === test.questions[i].correctAnswers.length &&
              ans.every((v) => test.questions[i].correctAnswers.includes(v)),
          ).length,
          max: totalQuestions,
          answers: userAnswers,
        }
      : {
          score: test.score!,
          max: test.maxScore!,
          answers: useProgressStore.getState().passedTests[test.id].userAnswers,
        };

    const percentage = (displayResult.score / displayResult.max) * 100;
    const strokeDasharray = `${percentage} ${100 - percentage}`;

    return (
      <div className="animate-in fade-in mx-auto flex w-full max-w-2xl flex-col items-center py-10 pb-[50vh] duration-500">
        <div className="relative mb-10 size-48">
          <svg viewBox="0 0 36 36" className="h-full w-full rotate-[-90deg]">
            <path
              className="text-primary"
              strokeDasharray="100 0"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="text-access"
              strokeDasharray={strokeDasharray}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-text">
              {displayResult.score}/{displayResult.max}
            </span>
          </div>
        </div>

        {displayResult.score < displayResult.max && (
          <div className="mb-10 w-full">
            <h3 className="mb-6 flex items-center gap-2 text-xl text-text">
              <X size={24} className="text-primary" /> Аналитика ошибок
            </h3>
            <div className="flex flex-col gap-6">
              {test.questions.map((q, i) => {
                const ans = displayResult.answers[i] || [];
                const isExactlyCorrect =
                  ans.length === q.correctAnswers.length &&
                  ans.every((v) => q.correctAnswers.includes(v));
                if (isExactlyCorrect) return null;

                return (
                  <div key={q.id} className="w-full rounded-2xl bg-surface p-6">
                    <p className="mb-4 font-medium text-text">{q.text}</p>
                    <div className="space-y-2 text-sm">
                      <div className="text-text/60">Ваш ответ:</div>
                      {ans.length === 0 ? (
                        <div className="rounded-xl border border-surface bg-surface p-3 text-text/50">
                          Нет ответа
                        </div>
                      ) : (
                        ans.map((a) => (
                          <div key={a} className="rounded-xl bg-primary/10 p-3 text-primary">
                            {q.options[a]}
                          </div>
                        ))
                      )}
                      <div className="mt-4 text-text/60">Правильный ответ:</div>
                      {q.correctAnswers.map((ca) => (
                        <div key={ca} className="rounded-xl bg-access/10 p-3 text-access">
                          {q.options[ca]}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          color="primary"
          size="md"
          className="mt-auto w-full sm:w-auto"
          onClick={() => setShowClearModal(true)}
        >
          Очистить и перепройти
        </Button>

        <Modal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          layout="vertical"
          title="Вы точно хотите стереть текущий результат этого теста и перепройти его?"
          description={
            <span className="text-text/40">
              Он появится во вкладке активных тестов и вы сможете начать его выполнение в любой
              момент
            </span>
          }
          className="max-w-2xl rounded-[32px] p-8 md:p-10"
          actions={
            <>
              <Button
                variant="outline"
                size="md"
                color="primary"
                onClick={() => setShowClearModal(false)}
                className="w-full px-4 sm:flex-1"
              >
                Отмена
              </Button>
              <Button
                variant="solid"
                size="md"
                color="primary"
                onClick={handleRetake}
                className="w-full px-4 sm:flex-1"
              >
                Да, уверен
              </Button>
            </>
          }
        />
      </div>
    );
  }

  // --- ЭКРАН ПРОХОЖДЕНИЯ ТЕСТА ---
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col pt-4 pb-[50vh]">
      <div className="mb-8 w-full">
        <p className="mb-2 font-medium text-text">
          Вопрос {currentIndex + 1} из {totalQuestions}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex flex-1 flex-col"
        >
          <h2 className="mb-8 text-xl text-text md:text-2xl">{question.text}</h2>
          <div className="flex flex-col gap-3">
            {question.options.map((option, index) => {
              const isSelected = selectedOptions.includes(index);
              const isCorrect = question.correctAnswers.includes(index);

              let optionStateClass =
                'border-surface bg-surface text-text hover:border-accent hover:bg-surface/80';
              let Icon = null;

              if (!isSubmitted) {
                if (isSelected)
                  optionStateClass =
                    'border-accent bg-surface text-text shadow-[0_0_15px_rgba(139,92,246,0.15)]';
              } else {
                if (isSelected && isCorrect) {
                  optionStateClass = 'border-access bg-surface text-text';
                  Icon = <Check size={24} className="text-access" />;
                } else if (isSelected && !isCorrect) {
                  optionStateClass = 'border-primary bg-surface text-text';
                  Icon = <X size={24} className="text-primary" />;
                } else if (!isSelected && isCorrect) {
                  optionStateClass = 'border-access bg-surface text-text';
                  Icon = <ExclamationMark size={24} className="text-access" />;
                } else {
                  optionStateClass = 'border-surface bg-surface text-text opacity-50';
                }
              }

              return (
                <button
                  key={index}
                  disabled={isSubmitted}
                  onClick={() => handleOptionToggle(index)}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between rounded-[16px] border-[3px] p-5 text-left transition-all duration-300',
                    optionStateClass,
                  )}
                >
                  <span className="pr-4">{option}</span>
                  {Icon && (
                    <div className="ml-2 flex shrink-0 items-center justify-center">{Icon}</div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-auto flex justify-end pt-8">
        {!isSubmitted ? (
          <Button
            variant="solid"
            color="accent"
            size="md"
            onClick={handleSubmit}
            disabled={selectedOptions.length === 0}
            className={cn(selectedOptions.length === 0 && 'opacity-40')}
          >
            Подтвердить
          </Button>
        ) : (
          <Button variant="solid" color="accent" size="md" onClick={handleNext}>
            {currentIndex < totalQuestions - 1 ? 'Дальше' : 'Завершить'}
          </Button>
        )}
      </div>
    </div>
  );
};
