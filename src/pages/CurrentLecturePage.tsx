import React, { useMemo, useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '@/app/store/useProgressStore';
import { contentConfig } from '@/contentConfig';
import { FireSimple } from '@phosphor-icons/react';
import { Button } from '@/shared/Button';

const mdxLectures = import.meta.glob('/src/content/*.mdx');

export const CurrentLecturePage = () => {
  const navigate = useNavigate();
  const { currentLesson, passLesson } = useProgressStore();
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Ищем конфиг текущего урока, если в Zustand ничего нет — берем первый по умолчанию
  const lesson = useMemo(() => {
    return contentConfig.find((l) => l.id === currentLesson) || contentConfig[0];
  }, [currentLesson]);

  // Динамически импортируем MDX-компонент на основе пути в конфиге по ТЗ
  const LazyMdxContent = useMemo(() => {
    const importFunc = mdxLectures[lesson.mdxPath];
    if (!importFunc) {
      return () => (
        <div className="font-sans text-red-500">
          Файл лекции по пути {lesson.mdxPath} не найден.
        </div>
      );
    }
    // Обертываем динамический импорт в React.lazy
    return React.lazy(importFunc as () => Promise<{ default: React.ComponentType<any> }>);
  }, [lesson.mdxPath]);

  // Таймер на завершение урока
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showSuccessOverlay) {
      timer = setTimeout(() => {
        // Добавляем урок в пройденные
        passLesson(lesson.id);
        setShowSuccessOverlay(false);
        // Редирект на Дерево
        navigate('/app/tree');
      }, 3000);
    }
    return () => clearTimeout(timer); // Обязательный cleanup при размонтировании
  }, [showSuccessOverlay, lesson.id, passLesson, navigate]);

  return (
    <div className="relative flex min-h-full w-full flex-col bg-background font-sans text-text">
      <header className="pb-2">
        <h1 className="mb-2 text-3xl font-bold text-text">{lesson.title}</h1>
      </header>

      <main className="prose prose-invert max-w-none flex-1 pb-24">
        <Suspense
          fallback={
            <div className="animate-pulse space-y-8">
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[95%] rounded bg-surface" />
                <div className="h-4 w-[90%] rounded bg-surface" />
                <div className="h-4 w-[60%] rounded bg-surface" />
              </div>
              <div className="mt-10 h-6 w-1/3 rounded-md bg-surface" />
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[85%] rounded bg-surface" />
                <div className="h-4 w-[40%] rounded bg-surface" />
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[85%] rounded bg-surface" />
                <div className="h-4 w-[40%] rounded bg-surface" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[95%] rounded bg-surface" />
                <div className="h-4 w-[90%] rounded bg-surface" />
                <div className="h-4 w-[60%] rounded bg-surface" />
              </div>
              <div className="mt-10 h-6 w-1/3 rounded-md bg-surface" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[95%] rounded bg-surface" />
                <div className="h-4 w-[90%] rounded bg-surface" />
                <div className="h-4 w-[60%] rounded bg-surface" />
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[85%] rounded bg-surface" />
                <div className="h-4 w-[40%] rounded bg-surface" />
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-[85%] rounded bg-surface" />
                <div className="h-4 w-[40%] rounded bg-surface" />
              </div>
            </div>
          }
        >
          <LazyMdxContent />
        </Suspense>

        <div className="mt-12 flex justify-center pt-8">
          <Button variant="outline" onClick={() => setShowSuccessOverlay(true)}>
            Завершить урок
          </Button>
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

          <div className="animate-overlay-fade fixed inset-0 z-50 flex flex-col items-center justify-center bg-(--background)/90 backdrop-blur-[2px]">
            <div className="animate-content-scale flex flex-col items-center gap-8 px-4 text-center">
              <FireSimple
                size="100%"
                weight="light"
                className="md:size-80lg:size-100 size-45 text-primary transition-all duration-300 sm:size-60"
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
