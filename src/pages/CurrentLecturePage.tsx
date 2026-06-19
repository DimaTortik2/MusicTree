import React, {
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  Suspense,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { contentConfig } from '@/contentConfig';
import { FireSimple, Check } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import { useCurrentProgress } from '@/app/hooks/useCurrentProgress';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useAuthStore } from '@/app/store/authStore';
import { cn } from '@/app/utils/cn';

import { useNotesStore } from '@/features/notes/store/useNotesStore';
import { NotesHighlighterEngine } from '@/features/notes/ui/NotesHighlighterEngine';
import { CreateNoteModal } from '@/features/notes/ui/CreateNoteModal';
import { NoteCard } from '@/features/notes/ui/NoteCard';
import { createPortal } from 'react-dom';

const mdxLectures = import.meta.glob('/src/content/**/*.mdx');

const mdxLecturesCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};
for (const path in mdxLectures) {
  mdxLecturesCache[path] = React.lazy(
    mdxLectures[path] as () => Promise<{ default: React.ComponentType<any> }>,
  );
}

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
    const savedY = useCurrentProgress.getState().lessonScrollPositions[lessonId] || 0;

    let isRestoring = true;
    let isUnmounting = false;
    let latestValidY = savedY;

    const applyScroll = (y: number) => {
      if (isUnmounting) return;
      requestAnimationFrame(() => {
        if (isUnmounting) return;
        if (scrollNode === window) window.scrollTo({ top: y, left: 0, behavior: 'instant' });
        else (scrollNode as HTMLElement).scrollTop = y;
      });
    };

    applyScroll(savedY);
    const t1 = setTimeout(() => applyScroll(savedY), 50);
    const t2 = setTimeout(() => applyScroll(savedY), 150);
    const t3 = setTimeout(() => {
      applyScroll(savedY);
      isRestoring = false;
    }, 500);

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      if (isRestoring || isUnmounting) return;
      const currentY =
        scrollNode === window ? window.scrollY : (scrollNode as HTMLElement).scrollTop;
      latestValidY = currentY;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (!isUnmounting) {
          useCurrentProgress.getState().setLessonScrollPosition(lessonId, latestValidY);
        }
      }, 300);
    };

    scrollNode.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      isUnmounting = true;
      scrollNode.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      if (!isRestoring) {
        useCurrentProgress.getState().setLessonScrollPosition(lessonId, latestValidY);
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
  const contentRef = useRef<HTMLDivElement>(null);

  const { currentLesson, passLesson, passedLessons, halfPassedLessons, halfPassLesson } =
    useCurrentProgress();
  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const { user, profile } = useAuthStore();

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { notes, fetchNotes, subscribeToNotes, addNote } = useNotesStore();
  const [createModalData, setCreateModalData] = useState<{
    text: string;
    prefix: string;
    suffix: string;
    offset: number;
  } | null>(null);
  const [mobilePopover, setMobilePopover] = useState<{ noteId: string; rect: DOMRect } | null>(
    null,
  );

  // Стейты для умного позиционирования заметок
  const [notePositions, setNotePositions] = useState<Record<string, number>>({});
  const notesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const lesson = useMemo(
    () => contentConfig.find((l) => l.id === currentLesson) || contentConfig[0],
    [currentLesson],
  );
  const isPassed = useMemo(() => passedLessons.includes(lesson.id), [passedLessons, lesson.id]);
  const LazyMdxContent = lesson ? mdxLecturesCache[lesson.mdxPath] : null;

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const scrollNode = getScrollNode(pageRef.current);
    const savedY = useCurrentProgress.getState().lessonScrollPositions[lesson.id] || 0;
    if (scrollNode === window) window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
    else (scrollNode as HTMLElement).scrollTop = savedY;
  }, [lesson.id]);

  const isSharedMode = !!activeSharedFriend;
  const whoFinishedFirst = halfPassedLessons?.[lesson.id];
  const iFinishedFirst = isSharedMode && whoFinishedFirst === user?.id;
  const friendFinishedFirst = isSharedMode && whoFinishedFirst && whoFinishedFirst !== user?.id;
  const canUseNotes = isSharedMode && !!profile?.can_use_notes;

  useEffect(() => {
    if (canUseNotes && sharedTreeId && lesson.id) {
      fetchNotes(sharedTreeId, lesson.id);
      const unsub = subscribeToNotes(sharedTreeId, lesson.id);
      return () => unsub();
    }
  }, [canUseNotes, sharedTreeId, lesson.id, fetchNotes, subscribeToNotes]);

  useEffect(() => {
    const handleScroll = () => {
      setMobilePopover(null);
      useNotesStore.getState().setActiveNoteId(null);
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // АЛГОРИТМ УМНОГО ПОЗИЦИОНИРОВАНИЯ ЗАМЕТОК (Google Docs style)
  const updateNotePositions = useCallback(() => {
    if (!contentRef.current || notes.length === 0) return;

    const positions: Record<string, number> = {};
    let nextMinY = 0;
    const GAP = 16; // Отступ между заметками, чтобы не слипались

    // Идем сверху вниз по тексту
    const sortedNotes = [...notes].sort((a, b) => a.text_offset - b.text_offset);

    sortedNotes.forEach((note) => {
      const mark = document.getElementById(`note-mark-${note.id}`);
      const noteEl = notesRef.current[note.id];
      let targetY = nextMinY;

      if (mark) {
        const contentRect = contentRef.current!.getBoundingClientRect();
        const markRect = mark.getBoundingClientRect();
        // Расстояние от верхнего края контента до выделения
        targetY = markRect.top - contentRect.top;
      }

      // Если заметки накладываются, толкаем нижнюю ниже
      const finalY = Math.max(targetY, nextMinY);
      positions[note.id] = finalY;

      // Обновляем следующий минимально допустимый Y
      if (noteEl) {
        nextMinY = finalY + noteEl.offsetHeight + GAP;
      } else {
        nextMinY = finalY + 100 + GAP; // fallback, если DOM еще не отрендерил
      }
    });

    setNotePositions((prev) => {
      const isDifferent = sortedNotes.some((n) => prev[n.id] !== positions[n.id]);
      return isDifferent ? positions : prev;
    });
  }, [notes]);

  // Следим за изменениями размера (например картинка загрузилась и сдвинула текст)
  useEffect(() => {
    if (!canUseNotes || !contentRef.current) return;
    const observer = new ResizeObserver(() => updateNotePositions());
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [canUseNotes, updateNotePositions]);

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
    setShowSuccessOverlay(false);
    if (isSharedMode && !friendFinishedFirst && !iFinishedFirst && user) {
      halfPassLesson(lesson.id, user.id);
      navigate('/app/tree');
    } else {
      passLesson(lesson.id);
      navigate('/app/tree');
    }
  };

  const handleCompleteClick = () => {
    fireConfetti();
    setShowSuccessOverlay(true);
  };

  useEffect(() => {
    if (showSuccessOverlay) {
      timerRef.current = setTimeout(() => handleFinish(), 3000);
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
      <div className="flex w-full justify-center px-6 py-12 pb-[50vh] transition-all duration-300">
        {/* Главный контейнер */}
        <div
          className={cn(
            'flex w-full flex-col transition-all duration-300',
            canUseNotes ? 'max-w-[1100px]' : 'max-w-[1000px]',
          )}
        >
          {/* Header ограничен шириной текста */}
          <header className={cn('mb-5', canUseNotes && 'max-w-[800px]')}>
            <h1 className="text-3xl leading-tight font-normal tracking-tight text-text sm:text-4xl md:text-[42px]">
              {lesson.title}
            </h1>
          </header>

          {/* Контейнер лекции и заметок */}
          <div className="relative flex w-full gap-8 lg:gap-12">
            {/* ЛЕВАЯ КОЛОНКА */}
            <main
              ref={contentRef}
              className={cn(
                'prose max-w-none prose-invert prose-headings:font-normal prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-xl sm:prose-h2:text-2xl prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-text/85 prose-hr:my-10 prose-hr:border-text/10',
                canUseNotes ? 'w-full max-w-[800px]' : 'w-full',
              )}
            >
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

              {/* Блок кнопок */}
              <div className="mt-16 flex justify-center">
                {!isPassed ? (
                  iFinishedFirst ? (
                    <Button
                      variant="outline"
                      className="pointer-events-none flex items-center gap-2 opacity-70"
                    >
                      <span>Я дочитал</span>
                      <div className="relative ml-1 flex h-5 w-5 items-center justify-center">
                        <Check
                          size={18}
                          weight="bold"
                          className="absolute left-0 text-current opacity-40"
                        />
                        <Check size={18} weight="bold" className="absolute left-1.5 text-current" />
                      </div>
                    </Button>
                  ) : friendFinishedFirst ? (
                    <Button
                      variant="outline"
                      onClick={handleCompleteClick}
                      className="flex items-center gap-2"
                    >
                      <span>Завершить урок</span>
                      <div className="relative ml-1 flex h-5 w-5 items-center justify-center">
                        <Check
                          size={18}
                          weight="bold"
                          className="absolute left-0 text-current opacity-40"
                        />
                        <Check size={18} weight="bold" className="absolute left-1.5 text-current" />
                      </div>
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleCompleteClick}>
                      {isSharedMode ? 'Дочитать' : 'Завершить урок'}
                    </Button>
                  )
                ) : (
                  <Button variant="outline" onClick={() => navigate('/app/tree')}>
                    Вернуться к дереву
                  </Button>
                )}
              </div>
            </main>

            {/* ПРАВАЯ КОЛОНКА (Абсолютное позиционирование заметок) */}
            {canUseNotes && (
              <aside className="relative hidden w-[280px] shrink-0 border-l-[3px] border-text/10 lg:block">
                {notes.length === 0 && (
                  <div className="absolute top-0 left-6 text-sm text-text/30">
                    Выделите текст в лекции, чтобы оставить заметку.
                  </div>
                )}
                {notes.map((note) => {
                  const isPositioned = notePositions[note.id] !== undefined;
                  return (
                    <motion.div
                      key={note.id}
                      ref={(el) => {
                        if (el) notesRef.current[note.id] = el;
                      }}
                      initial={false}
                      animate={{
                        y: notePositions[note.id] || 0,
                        opacity: isPositioned ? 1 : 0,
                        scale: isPositioned ? 1 : 0.95,
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      className="absolute top-0 right-0 left-6 will-change-transform"
                    >
                      <NoteCard note={note} />
                    </motion.div>
                  );
                })}
              </aside>
            )}
          </div>
        </div>
      </div>

      {canUseNotes && (
        <>
          <NotesHighlighterEngine
            containerRef={contentRef}
            onOpenCreateModal={setCreateModalData}
            onMobileNoteTap={(id, rect) => setMobilePopover({ noteId: id, rect })}
            onMarksRendered={updateNotePositions}
          />

          <CreateNoteModal
            isOpen={!!createModalData}
            onClose={() => setCreateModalData(null)}
            onApply={(note_text, color) => {
              if (!createModalData || !user || !sharedTreeId) return;
              addNote({
                shared_tree_id: sharedTreeId,
                lesson_id: lesson.id,
                author_id: user.id,
                note_text,
                color,
                selected_text: createModalData.text,
                prefix: createModalData.prefix,
                suffix: createModalData.suffix,
                text_offset: createModalData.offset,
              });
              setCreateModalData(null);
            }}
          />
        </>
      )}

      {createPortal(
        <AnimatePresence>
          {mobilePopover && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
              className="fixed z-[9999] w-[90vw] max-w-[350px] lg:hidden"
              style={{
                top: Math.max(
                  20,
                  Math.min(mobilePopover.rect.bottom + 10, window.innerHeight - 200),
                ),
                left: '50%',
              }}
            >
              <div
                className="fixed inset-0 z-[-1]"
                onClick={() => {
                  setMobilePopover(null);
                  useNotesStore.getState().setActiveNoteId(null);
                }}
              />
              <NoteCard note={notes.find((n) => n.id === mobilePopover.noteId)!} />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
