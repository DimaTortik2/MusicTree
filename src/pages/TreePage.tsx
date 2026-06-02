import { useLayoutEffect, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TreeElement } from '@/shared/TreeElement';
import type { TreeElementState } from '@/shared/TreeElement';
import { contentConfig, type LessonConfig } from '@/contentConfig';
import { useProgressStore } from '@/app/store/useProgressStore';
import { cn } from '@/app/utils/cn';

const BASE_WIDTH = 1000;
const ROW_HEIGHT = 200;
const ROW_OFFSET = 100;
const COL_STEP = 150;
const COL_OFFSET = 200;

const getX = (column: number) => COL_OFFSET + column * COL_STEP;
const getY = (row: number) => ROW_OFFSET + row * ROW_HEIGHT;

interface Line {
  id: string;
  path: string;
}

export const TreePage = () => {
  const navigate = useNavigate();
  const { passedLessons, lastUncompletedLesson, setCurrentLesson, _hasHydrated } =
    useProgressStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);

  useLayoutEffect(() => {
    if (!_hasHydrated || !containerRef.current) return;

    const updateLines = () => {
      const containerWidth = containerRef.current!.offsetWidth;
      const newLines: Line[] = [];

      contentConfig.forEach((lesson) => {
        lesson.prerequisites.forEach((preReqId) => {
          const preReq = contentConfig.find((l) => l.id === preReqId);
          if (!preReq) return;

          const x1 = (getX(preReq.position.column) / BASE_WIDTH) * containerWidth;
          const y1 = getY(preReq.position.row);

          const x2 = (getX(lesson.position.column) / BASE_WIDTH) * containerWidth;
          const y2 = getY(lesson.position.row);

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

    const ro = new ResizeObserver(updateLines);
    ro.observe(containerRef.current);
    updateLines();

    return () => ro.disconnect();
  }, [_hasHydrated]);

  const activeUncompletedLessonId = useMemo(() => {
    const isValidAndUncompleted = lastUncompletedLesson
      ? contentConfig.some((l) => l.id === lastUncompletedLesson && !passedLessons.includes(l.id))
      : false;

    if (isValidAndUncompleted) return lastUncompletedLesson;

    return contentConfig.find(
      (l) =>
        !passedLessons.includes(l.id) && l.prerequisites.every((p) => passedLessons.includes(p)),
    )?.id;
  }, [lastUncompletedLesson, passedLessons]);

  useEffect(() => {
    if (!_hasHydrated || !activeUncompletedLessonId) return;

    const scrollTimer = setTimeout(() => {
      const targetElement = document.getElementById(`lesson-${activeUncompletedLessonId}`);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [_hasHydrated, activeUncompletedLessonId]);

  if (!_hasHydrated) return null;

  const getLessonState = (lesson: LessonConfig): TreeElementState => {
    const isPassed = passedLessons.includes(lesson.id);
    if (isPassed) return 'completed';

    const isAvailable = lesson.prerequisites.every((pId) => passedLessons.includes(pId));
    if (!isAvailable) return 'locked';

    if (lesson.id === activeUncompletedLessonId) return 'current';

    return 'ordinary';
  };

  const handleLessonClick = (lessonId: string) => {
    setCurrentLesson(lessonId);
    navigate('/app/current/lecture');
  };

  const maxRow = Math.max(0, ...contentConfig.map((l) => l.position.row));
  const dynamicContainerHeight = getY(maxRow) + ROW_HEIGHT;

  return (
    <div className="flex min-h-screen w-full justify-center overflow-x-hidden py-10 pb-[50vh]">
      <div
        ref={containerRef}
        className="relative w-full max-w-250"
        style={{ height: dynamicContainerHeight }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.path}
              fill="none"
              strokeWidth="4"
              className="stroke-line"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {contentConfig.map((lesson) => {
          const state = getLessonState(lesson);

          return (
            <div
              key={lesson.id}
              id={`lesson-${lesson.id}`}
              className="group absolute z-10 flex flex-col items-center"
              style={{
                left: `${(getX(lesson.position.column) / BASE_WIDTH) * 100}%`,
                top: getY(lesson.position.row),
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TreeElement state={state} onClick={() => handleLessonClick(lesson.id)} />

              <div
                className={cn(
                  'pointer-events-none mt-1 w-17.5 text-center text-[11px] leading-tight font-medium wrap-break-word text-text/80 transition-colors duration-200 group-hover:text-text sm:mt-2 sm:w-30 sm:text-sm',
                  state === 'locked' && 'text-text/10',
                )}
              >
                {lesson.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
