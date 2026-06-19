import React, { useMemo, useState, useEffect, useLayoutEffect, Suspense, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentConfig } from '@/contentConfig';
import { FireSimple, Check } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Твои сторы и хуки
import { useCurrentProgress } from '@/app/hooks/useCurrentProgress';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useAuthStore } from '@/app/store/authStore';
import { cn } from '@/app/utils/cn';

// --- НОВЫЕ ИМПОРТЫ ДЛЯ ЗАМЕТОК ---
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

// ... тут твой MdxContentWrapper (оставляем без изменений)
const MdxContentWrapper = ({
  lessonId,
  children,
}: {
  lessonId: string;
  children: React.ReactNode;
}) => {
  // ... весь твой код скролла (не меняем)
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
  const contentRef = useRef<HTMLDivElement>(null); // Реф для контейнера контента

  const { currentLesson, passLesson, passedLessons, halfPassedLessons, halfPassLesson } =
    useCurrentProgress();
  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const { user, profile } = useAuthStore();

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Стейты для заметок ---
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

  const lesson = useMemo(() => {
    return contentConfig.find((l) => l.id === currentLesson) || contentConfig[0];
  }, [currentLesson]);

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

  // Проверка прав на заметки: должен быть режим с другом и флаг в профиле
  const canUseNotes = isSharedMode && !!profile?.can_use_notes;

  // --- Загрузка заметок ---
  useEffect(() => {
    if (canUseNotes && sharedTreeId && lesson.id) {
      fetchNotes(sharedTreeId, lesson.id);
      const unsub = subscribeToNotes(sharedTreeId, lesson.id);
      return () => unsub();
    }
  }, [canUseNotes, sharedTreeId, lesson.id, fetchNotes, subscribeToNotes]);

  // Закрытие мобильного попапа (и сброс активной заметки) при скролле
  useEffect(() => {
    const handleScroll = () => {
      setMobilePopover(null);
      // Сбрасываем активную заметку, чтобы с карточек тоже спадал фокус
      useNotesStore.getState().setActiveNoteId(null);
    };

    // capture: true ловит скролл внутри любого контейнера страницы
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

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

    if (isSharedMode && !friendFinishedFirst && !iFinishedFirst) {
      if (user) {
        halfPassLesson(lesson.id, user.id);
        navigate('/app/tree');
      }
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
      {/* 
        ОБЁРТКА МЕНЯЕТСЯ ТОЛЬКО ПРИ canUseNotes 
        Если это личная лекция, классы останутся как было: max-w-[1000px]
      */}
      <div
        className={cn(
          'flex w-full px-6 py-12 pb-[50vh] transition-all duration-300',
          canUseNotes
            ? 'max-w-[1300px] flex-col gap-10 lg:flex-row'
            : 'max-w-[1000px] justify-center',
        )}
      >
        {/* ЛЕВАЯ КОЛОНКА (САМ ТЕКСТ ЛЕКЦИИ) */}
        <div
          className={cn(
            'w-full transition-all duration-300',
            canUseNotes ? 'max-w-[800px]' : 'max-w-[1000px]',
          )}
        >
          <header className="mb-5">
            <h1 className="text-3xl leading-tight font-normal tracking-tight text-text sm:text-4xl md:text-[42px]">
              {lesson.title}
            </h1>
          </header>

          <main
            ref={contentRef}
            className="prose max-w-none prose-invert prose-headings:font-normal prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-xl sm:prose-h2:text-2xl prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-text/85 prose-hr:my-10 prose-hr:border-text/10"
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

            {/* --- БЛОК КНОПОК --- */}
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
        </div>

        {/* ПРАВАЯ КОЛОНКА (ЗАМЕТКИ - ТОЛЬКО ДЕСКТОП И ТОЛЬКО ПРИ canUseNotes) */}
        {canUseNotes && (
          <aside className="custom-scroll sticky top-[100px] mt-[100px] hidden h-fit max-h-[80vh] w-[280px] shrink-0 flex-col gap-4 overflow-y-auto pr-2 lg:flex">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
            {notes.length === 0 && (
              <div className="mt-10 text-center text-sm text-text/30">
                Выделите текст в лекции, чтобы оставить заметку.
              </div>
            )}
          </aside>
        )}
      </div>

      {/* --- ИНСТРУМЕНТЫ ЗАМЕТОК (Рендерим только если есть права) --- */}
      {canUseNotes && (
        <>
          <NotesHighlighterEngine
            containerRef={contentRef}
            onOpenCreateModal={setCreateModalData}
            onMobileNoteTap={(id, rect) => setMobilePopover({ noteId: id, rect })}
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

      {/* МОБИЛЬНЫЙ ПОПОВЕР ДЛЯ ЗАМЕТОК */}
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
              {/* Невидимый оверлей для закрытия при клике вокруг */}
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
};;
