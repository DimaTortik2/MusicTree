import React, { useMemo, useState, useEffect, useLayoutEffect, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig } from '@/contentConfig';
import { FireSimple } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

const mdxLectures = import.meta.glob('/src/content/**/*.mdx');

const mdxLecturesCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxLectures) {
  mdxLecturesCache[path] = React.lazy(
    mdxLectures[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

// Утилита для поиска реального контейнера со скроллом
const getScrollNode = (element: HTMLElement | null): HTMLElement | Window => {
  let scrollNode: HTMLElement | Window = window;
  let parent = element?.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowY === 'overlay'
    ) {
      scrollNode = parent;
      break;
    }
    parent = parent.parentElement;
  }
  return scrollNode;
};

const MdxContentWrapper = ({
  lessonId,
  children,
}: {
  lessonId: string;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scrollNode = getScrollNode(el);
    const savedY = useProgressStore.getState().lessonScrollPositions[lessonId] || 0;

    let isRestoring = true;
    let isUnmounting = false; // 🛡 Защита от сохранения 0 при схлопывании страницы
    let latestValidY = savedY;

    const applyScroll = (y: number) => {
      if (isUnmounting) return;
      requestAnimationFrame(() => {
        if (isUnmounting) return;
        if (scrollNode === window) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
        else (scrollNode as HTMLElement).scrollTop = y;
      });
    };

    // Делаем серию прыжков, чтобы перебить анимации Framer Motion и ленивые картинки
    applyScroll(savedY);
    const t1 = setTimeout(() => applyScroll(savedY), 50);
    const t2 = setTimeout(() => applyScroll(savedY), 150);
    const t3 = setTimeout(() => {
      applyScroll(savedY);
      isRestoring = false; // 🔓 СНИМАЕМ БЛОКИРОВКУ только через 500мс
    }, 500);

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (isRestoring || isUnmounting) return; // Игнорируем технические сдвиги

      const currentY =
        scrollNode === window ? window.scrollY : (scrollNode as HTMLElement).scrollTop;
      latestValidY = currentY; // Фиксируем последнюю честную позицию

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isUnmounting) {
          useProgressStore.getState().setLessonScrollPosition(lessonId, latestValidY);
        }
      }, 300);
    };

    scrollNode.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      isUnmounting = true; // Блокируем новые записи скролла
      scrollNode.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      // Сохраняем последний валидный Y без риска записать 0
      if (!isRestoring) {
        useProgressStore.getState().setLessonScrollPosition(lessonId, latestValidY);
      }
    };
  }, [lessonId]);

  return (
    <div ref={ref} className="contents">
      {children}
    </div>
  );
};

export const CurrentLecturePage = () => {
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);

  const { currentLesson, passLesson, passedLessons } = useProgressStore();
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lesson = useMemo(() => {
    return contentConfig.find((l) => l.id === currentLesson) || contentConfig[0];
  }, [currentLesson]);

  const isPassed = useMemo(() => passedLessons.includes(lesson.id), [passedLessons, lesson.id]);
  const LazyMdxContent = lesson ? mdxLecturesCache[lesson.mdxPath] : null;

  // ✨ ЭФФЕКТ #2: Мгновенно отматываем скролл на этапе Скелетона,
  // чтобы пользователь не видел страницу с середины из-за скролла с прошлой страницы.
  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const scrollNode = getScrollNode(pageRef.current);
    const savedY = useProgressStore.getState().lessonScrollPositions[lesson.id] || 0;

    if (scrollNode === window) window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
    else (scrollNode as HTMLElement).scrollTop = savedY;
  }, [lesson.id]);

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
    if (timerRef.current) clearTimeout(timerRef.current);
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
    <div
      ref={pageRef}
      className="relative flex min-h-full w-full justify-center font-sans text-text selection:bg-primary/20"
    >
      <div className="w-full max-w-[1000px] px-6 py-12 pb-[50vh]">
        <header className="mb-5">
          <h1 className="text-3xl leading-tight font-normal tracking-tight text-text sm:text-4xl md:text-[42px]">
            {lesson.title}
          </h1>
        </header>

        <main className="prose max-w-none prose-invert prose-headings:font-normal prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-xl sm:prose-h2:text-2xl prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-text/85 prose-hr:my-10 prose-hr:border-text/10">
          {LazyMdxContent ? (
            <Suspense fallback={<MdxSkeleton />}>
              <MdxContentWrapper key={lesson.id} lessonId={lesson.id}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <LazyMdxContent />
                </motion.div>
              </MdxContentWrapper>
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
