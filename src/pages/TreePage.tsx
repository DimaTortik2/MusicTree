import { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TreeElement } from '@/shared/TreeElement';
import type { TreeElementState } from '@/shared/TreeElement';
import { contentConfig, type LessonConfig } from '@/contentConfig';
import { useProgressStore } from '@/app/store/useProgressStore';

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
  // Достаем lastUncompletedLesson из хранилища
  const { passedLessons, lastUncompletedLesson, setCurrentLesson, _hasHydrated } =
    useProgressStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

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
          const x1 = (getX(preReq.position.column) / BASE_WIDTH) * containerWidth;
          const y1 = getY(preReq.position.row);

          const x2 = (getX(lesson.position.column) / BASE_WIDTH) * containerWidth;
          const y2 = getY(lesson.position.row);

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

    // Следим за изменением ширины контейнера
    const ro = new ResizeObserver(updateLines);
    ro.observe(containerRef.current);
    updateLines(); // Первичная отрисовка

    return () => ro.disconnect();
  }, [_hasHydrated]);

  // Вычисляем активный непройденный урок, который будет светиться розовым
  const activeUncompletedLessonId = useMemo(() => {
    // Если урок из памяти существует и еще не пройден — берем его
    const isValidAndUncompleted = lastUncompletedLesson
      ? contentConfig.some((l) => l.id === lastUncompletedLesson && !passedLessons.includes(l.id))
      : false;

    if (isValidAndUncompleted) return lastUncompletedLesson;

    // Фолбэк: если мы прошли lastUncompletedLesson, автоматически ищем первый доступный непройденный
    return contentConfig.find(
      (l) =>
        !passedLessons.includes(l.id) && l.prerequisites.every((p) => passedLessons.includes(p)),
    )?.id;
  }, [lastUncompletedLesson, passedLessons]);

  if (!_hasHydrated) return null;

  // Логика вычисления состояний
  const getLessonState = (lesson: LessonConfig): TreeElementState => {
    const isPassed = passedLessons.includes(lesson.id);

    // 1. Если урок пройденный, то он НИКАК не помечается по-особому (даже если мы его сейчас читаем)
    if (isPassed) return 'completed';

    // 2. Проверяем, пройдены ли все предыдущие уроки для открытия
    const isAvailable = lesson.prerequisites.every((pId) => passedLessons.includes(pId));
    if (!isAvailable) return 'locked';

    // 3. Урок открыт и не пройден. Подсвечиваем розовым, если он является нашим активным непройденным
    if (lesson.id === activeUncompletedLessonId) return 'current';

    return 'ordinary';
  };

  const handleLessonClick = (lessonId: string) => {
    setCurrentLesson(lessonId); // Обновляем "Текущую лекцию" в Zustand
    navigate('/app/current/lecture'); // Переходим на лекцию
  };

  const maxRow = Math.max(0, ...contentConfig.map((l) => l.position.row));
  const dynamicContainerHeight = getY(maxRow) + ROW_HEIGHT;

  return (
    <div className="flex min-h-screen w-full justify-center overflow-x-hidden  py-10 pb-[50vh]">
      <div
        ref={containerRef}
        className="relative w-full max-w-250"
        style={{ height: dynamicContainerHeight }}
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
        {contentConfig.map((lesson) => {
          const state = getLessonState(lesson);

          return (
            <div
              key={lesson.id}
              className="group absolute z-10 flex flex-col items-center"
              style={{
                left: `${(getX(lesson.position.column) / BASE_WIDTH) * 100}%`,
                top: getY(lesson.position.row),
                transform: 'translate(-50%, -50%)',
              }}
            >
              <TreeElement state={state} onClick={() => handleLessonClick(lesson.id)} />

              {/* Адаптивная текстовая подпись */}
              <div className="pointer-events-none mt-1 w-17.5 text-center text-[11px] leading-tight font-medium wrap-break-word text-text/80 transition-colors duration-200 group-hover:text-text sm:mt-2 sm:w-30 sm:text-sm">
                {lesson.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
