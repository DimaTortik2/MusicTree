import React, { useMemo, useState, useEffect, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig } from '@/contentConfig';
import { FireSimple } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion'; 

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

  const fireConfetti = () => {
    const root = getComputedStyle(document.documentElement);
    const colors = [root.getPropertyValue('--primary').trim() || '#ec4899'];

    confetti({
      particleCount: 500,
      spread: 200,
      startVelocity: 45,
      origin: { y: 0.4 },
      colors,
      zIndex: 1000,
    });
  };

  const handleFinish = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    passLesson(lesson.id);
    setShowSuccessOverlay(false);

    navigate('/app/tree');
  };

  const handleCompleteClick = () => {
    fireConfetti();
    setShowSuccessOverlay(true);
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
    <div className="relative flex min-h-full w-full justify-center font-sans text-text selection:bg-primary/20">
      {/* Контейнер с идеальной шириной для чтения */}
      <div className="w-full max-w-[1000px] px-6 py-12 pb-[50vh]">
        <header className="mb-5">
          <h1 className="text-3xl leading-tight font-normal tracking-tight text-text sm:text-4xl md:text-[42px]">
            {lesson.title}
          </h1>
        </header>

        <main className="prose prose-invert prose-p:text-text/85 prose-p:leading-relaxed prose-p:text-[17px] prose-headings:font-normal prose-headings:tracking-tight prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-hr:border-text/10 prose-hr:my-10 max-w-none">
          {LazyMdxContent ? (
            <Suspense fallback={<MdxSkeleton />}>
              {/* ✨ Добавили плавную анимацию появления текста после скелетона */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <LazyMdxContent />
              </motion.div>
            </Suspense>
          ) : (
            <div className="font-sans text-red-500">
              Файл лекции по пути {lesson.mdxPath} не найден.
            </div>
          )}

          <div className="mt-16 flex justify-center">
            {!isPassed ? (
              <Button variant="outline" onClick={handleCompleteClick}>
                Завершить урок
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  navigate('/app/tree');
                }}
              >
                Вернуться к дереву
              </Button>
            )}
          </div>
        </main>
      </div>

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
