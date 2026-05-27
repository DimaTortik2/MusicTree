import React, { useMemo, useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig } from '@/contentConfig';
import { FireSimple } from '@phosphor-icons/react';
import { Button } from '@/shared/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import confetti from 'canvas-confetti'; // Импортируем конфетти

const mdxLectures = import.meta.glob('/src/content/*.mdx');

const mdxLecturesCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxLectures) {
  mdxLecturesCache[path] = React.lazy(
    mdxLectures[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

export const CurrentLecturePage = () => {
  const navigate = useNavigate();
  const { currentLesson, passLesson, passedLessons } = useProgressStore();
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lesson = useMemo(() => {
    return contentConfig.find((l) => l.id === currentLesson) || contentConfig[0];
  }, [currentLesson]);

  const isPassed = useMemo(() => passedLessons.includes(lesson.id), [passedLessons, lesson.id]);

  const LazyMdxContent = lesson ? mdxLecturesCache[lesson.mdxPath] : null;

  // Функция салюта (цвета берутся из корневых CSS-переменных)
  const fireConfetti = () => {
    const root = getComputedStyle(document.documentElement);
    const colors = [
      root.getPropertyValue('--primary').trim() || '#ec4899',
    ];

    confetti({
      particleCount: 500,
      spread: 200,
      startVelocity: 45,
      origin: { y: 0.4 },
      colors,
      zIndex: 1000,
    });

   
  };

  // Метод завершения урока и перехода с гарантированным сбросом скролла
  const handleFinish = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    passLesson(lesson.id);
    setShowSuccessOverlay(false);

    navigate('/app/tree');

    // Железобетонный сброс скролла в следующем макросигма-тике (после смены роута)
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
  };

  const handleCompleteClick = () => {
    fireConfetti(); // Запускаем конфетти
    setShowSuccessOverlay(true); // Показываем оверлей
  };

  useEffect(() => {
    if (showSuccessOverlay) {
      timerRef.current = setTimeout(() => {
        handleFinish();
      }, 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showSuccessOverlay]);

  return (
    <div className="relative flex min-h-full w-full flex-col bg-background p-6 pb-[50vh] font-sans text-text">
      <header className="pb-2">
        <h1 className="mb-2 text-3xl font-bold text-text">{lesson.title}</h1>
      </header>

      <main className="prose prose-invert max-w-none flex-1 pb-24">
        {LazyMdxContent ? (
          <Suspense fallback={<MdxSkeleton />}>
            <LazyMdxContent />
          </Suspense>
        ) : (
          <div className="font-sans text-red-500">
            Файл лекции по пути {lesson.mdxPath} не найден.
          </div>
        )}

        <div className="mt-12 flex justify-center pt-8">
          {!isPassed ? (
            <Button variant="outline" onClick={handleCompleteClick}>
              Завершить урок
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                window.scrollTo(0, 0);
                navigate('/app/tree');
              }}
            >
              Вернуться к дереву
            </Button>
          )}
        </div>
      </main>

      {showSuccessOverlay && (
        <>
          <style>{`
            @keyframes overlayFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes contentScaleIn {
              from { transform: scale(0.92); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .animate-overlay-fade {
              animation: overlayFadeIn 0.25s ease-out forwards;
            }
            .animate-content-scale {
              animation: contentScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          <div
            onClick={handleFinish}
            className="animate-overlay-fade fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-(--background)/90 backdrop-blur-[2px]"
          >
            <div className="animate-content-scale flex flex-col items-center gap-8 px-4 text-center">
              <FireSimple
                size="100%"
                weight="light"
                className="size-45 text-primary transition-all duration-300 sm:size-60 md:size-80 lg:size-100"
              />
              <h2 className="text-3xl font-medium tracking-wide text-text selection:bg-transparent sm:text-5xl md:text-6xl">
                Замечательно!
              </h2>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
