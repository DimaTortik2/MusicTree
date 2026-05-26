import { useLayoutEffect, useRef, useState } from 'react';
import { TreeElement } from '@/shared/TreeElement';
import type { TreeElementState } from '@/shared/TreeElement';
import { contentConfig } from '@/contentConfig';
import { useProgressStore } from '@/app/store/useProgressStore';

const BASE_WIDTH = 1000;

interface Line {
  id: string;
  path: string;
}

export const TreePage = () => {
  const { passedLessons, currentLesson, _hasHydrated } = useProgressStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  // Отрисовка SVG-линий с помощью математики (относительно ширины контейнера)
  useLayoutEffect(() => {
    if (!_hasHydrated || !containerRef.current) return;

    const updateLines = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const newLines: Line[] = [];

      contentConfig.forEach((lesson) => {
        lesson.prerequisites.forEach((preReqId) => {
          const preReq = contentConfig.find((l) => l.id === preReqId);
          if (!preReq) return;

          // Рассчитываем физические X-координаты на основе текущей ширины экрана
          const x1 = (preReq.pos.x / BASE_WIDTH) * containerWidth;
          const y1 = preReq.pos.y;

          const x2 = (lesson.pos.x / BASE_WIDTH) * containerWidth;
          const y2 = lesson.pos.y;

          // Излом линии ровно посередине между Y1 и Y2
          const midY = y1 + (y2 - y1) / 2;
          const path = `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;

          newLines.push({
            id: `${preReqId}-${lesson.id}`,
            path,
          });
        });
      });

      setLines(newLines);
    };

    // Следим за изменением ширины контейнера (поворот экрана телефона, ресайз окна)
    const ro = new ResizeObserver(updateLines);
    ro.observe(containerRef.current);
    updateLines(); // Первичная отрисовка

    return () => ro.disconnect();
  }, [_hasHydrated]);

  if (!_hasHydrated) return null;

  const getLessonState = (id: string): TreeElementState => {
    if (id === currentLesson) return 'current';
    if (passedLessons.includes(id)) return 'completed';
    return 'ordinary';
  };

  return (
    <div className="flex min-h-screen w-full justify-center overflow-x-hidden bg-background py-10">
      <div
        ref={containerRef}
        // Используем 100% ширину с ограничением в 1000px
        className="relative w-full max-w-250"
        style={{ height: 1100 }}
      >
        {/* Слой с SVG-линиями */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.path}
              fill="none"
              strokeWidth="4"
              className="stroke-surface"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {/* Узлы (Уроки) */}
        {contentConfig.map((lesson) => (
          <div
            key={lesson.id}
            // Добавил flex-col и items-center, чтобы текст идеально центрировался под кнопкой
            className="absolute z-10 flex flex-col items-center"
            style={{
              left: `${(lesson.pos.x / BASE_WIDTH) * 100}%`,
              top: lesson.pos.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <TreeElement state={getLessonState(lesson.id)} />

            {/* Адаптивная текстовая подпись */}
            <div className="mt-1 w-17.5 text-center text-[11px] leading-tight font-medium wrap-break-word text-text/80 sm:mt-2 sm:w-30 sm:text-sm">
              {lesson.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
