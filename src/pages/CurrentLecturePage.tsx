import React, { Suspense, useLayoutEffect, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FireSimple, Check } from '@phosphor-icons/react';
import { Button } from '@/shared/buttons/Button';
import { MdxSkeleton } from '@/shared/MdxSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';

// Компоненты заметок
import { NotesHighlighterEngine } from '@/features/notes/ui/NotesHighlighterEngine';
import { CreateNoteModal } from '@/features/notes/ui/CreateNoteModal';
import { NoteCard } from '@/features/notes/ui/NoteCard';
import { useCurrentProgress } from '@/app/hooks/useCurrentProgress';

// Импортируем наш новый хук! Укажи правильный путь
import { useLecturePageLogic } from '@/features/notes/hooks/useLecturePageLogic';

const mdxLectures = import.meta.glob('/src/content/**/*.mdx');
const mdxLecturesCache: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {};

// ИСПРАВЛЕНИЕ: Защита от старых JS-чанков на Vercel (Фикс Failed to fetch)
for (const path in mdxLectures) {
  mdxLecturesCache[path] = React.lazy(async () => {
    try {
      return await (mdxLectures[path] as () => Promise<{ default: React.ComponentType<any> }>)();
    } catch (error: any) {
      if (
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Importing a module script failed')
      ) {
        window.location.reload();
      }
      throw error;
    }
  });
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
    setTimeout(() => applyScroll(savedY), 50);
    setTimeout(() => applyScroll(savedY), 150);
    setTimeout(() => {
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
        if (!isUnmounting)
          useCurrentProgress.getState().setLessonScrollPosition(lessonId, latestValidY);
      }, 300);
    };

    scrollNode.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      isUnmounting = true;
      scrollNode.removeEventListener('scroll', handleScroll);
      if (!isRestoring)
        useCurrentProgress.getState().setLessonScrollPosition(lessonId, latestValidY);
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

  const {
    refs: { pageRef, contentRef, asideRef, notesRef },
    state: {
      showSuccessOverlay,
      mobilePopover,
      createModalData,
      noteLayout,
      activeNoteId,
      activeFocusMode,
    },
    computed: { lesson, isPassed, isSharedMode, canUseNotes, iFinishedFirst, friendFinishedFirst },
    actions: {
      handleCompleteClick,
      handleFinish,
      setMobilePopover,
      setCreateModalData,
      updateNotePositions,
      handlePageClick,
    },
    notesData: { notes, addNote, user, sharedTreeId },
  } = useLecturePageLogic();

  const LazyMdxContent = lesson ? mdxLecturesCache[lesson.mdxPath] : null;

  useLayoutEffect(() => {
    if (!pageRef.current) return;
    const scrollNode = getScrollNode(pageRef.current);
    const savedY = useCurrentProgress.getState().lessonScrollPositions[lesson.id] || 0;
    if (scrollNode === window) window.scrollTo({ top: savedY, left: 0, behavior: 'instant' });
    else (scrollNode as HTMLElement).scrollTop = savedY;
  }, [lesson.id, pageRef]);

  const previousNoteLayout = useRef(noteLayout);
  useEffect(() => {
    previousNoteLayout.current = noteLayout;
  }, [noteLayout]);

  const [isReadyToAnimate, setIsReadyToAnimate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReadyToAnimate(true);
    }, 1000); // 1 секунды достаточно, чтобы весь макет лекции полностью загрузился и встал на свои места
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={pageRef}
      onClick={handlePageClick}
      className="relative flex min-h-full w-full justify-center font-sans text-text selection:bg-primary/20"
    >
      <div className="flex w-full justify-center px-6 pb-[50vh] transition-all duration-300">
        {/* Контейнер, разделяющий колонки */}
        <div
          className={cn(
            'flex w-full gap-8 transition-all duration-300 lg:gap-12',
            canUseNotes ? 'max-w-[1100px]' : 'max-w-[1000px] justify-center',
          )}
        >
          {/* ЛЕВАЯ КОЛОНКА (Заголовок + Текст) */}
          <div
            className={cn(
              'flex w-full min-w-0 flex-col',
              canUseNotes ? 'max-w-[800px]' : 'max-w-[1000px]',
            )}
          >
            <header className="mb-5">
              <h1 className="mt-12 text-3xl leading-tight font-normal tracking-tight text-text sm:text-4xl md:text-[42px]">
                {lesson.title}
              </h1>
            </header>

            <main
              ref={contentRef}
              className={cn(
                // Добавили класс prose-content-transition
                'prose-content-transition prose max-w-none prose-invert prose-headings:font-normal prose-headings:tracking-tight prose-h2:mt-12 prose-h2:mb-6 prose-h2:text-xl sm:prose-h2:text-2xl prose-p:text-[17px] prose-p:leading-relaxed prose-p:text-text/85 prose-hr:my-10 prose-hr:border-text/10',
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
          </div>

          {/* ПРАВАЯ КОЛОНКА (Заметки) */}
          {canUseNotes && (
            <motion.aside
              ref={asideRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
              className="relative hidden w-[280px] shrink-0 border-l-[3px] border-text/10 lg:block"
            >
              {notes.map((note) => {
                const layout = noteLayout[note.id];
                const isPositioned = layout !== undefined;

                const isFirstPositioning = isPositioned && !previousNoteLayout.current[note.id];

                // Анимируем сдвиги по Y только если страница уже загрузилась (прошла 1 сек)
                // и это НЕ первое появление этой конкретной заметки
                const shouldAnimateY = isReadyToAnimate && isPositioned && !isFirstPositioning;

                // ЗАТЕМНЕНИЕ ДЛЯ ASIDE:
                const isDimmed =
                  activeFocusMode === 'aside' && activeNoteId && activeNoteId !== note.id;

                return (
                  <motion.div
                    key={note.id}
                    ref={(el) => {
                      if (el) notesRef.current[note.id] = el;
                    }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{
                      y: layout?.y || 0,
                      opacity: isPositioned ? (isDimmed ? 0.3 : 1) : 0,
                      scale: isPositioned ? 1 : 0.95,
                    }}
                    transition={{
                      // Если макет страницы еще грузится (первая секунда) ИЛИ это новое появление карточки -> прыгаем мгновенно.
                      // Если страница готова и мы удалили/добавили другую заметку -> остальные плавно сдвигаются.
                      y: shouldAnimateY
                        ? { type: 'spring', stiffness: 200, damping: 25 }
                        : { duration: 0 },
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.2, ease: 'easeOut' },
                    }}
                    className="absolute top-0 right-0 left-6 origin-center will-change-transform"
                    style={{
                      pointerEvents: isPositioned ? 'auto' : 'none',
                    }}
                  >
                    <NoteCard note={note} hideHeader={layout?.isGrouped} />
                  </motion.div>
                );
              })}
            </motion.aside>
          )}
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
              {/* ИСПРАВЛЕНИЕ: Невидимый слой-перехватчик удален, скролл работает свободно */}
              <NoteCard
                note={notes.find((n) => n.id === mobilePopover.noteId)!}
                hideHeader={false}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ЭКРАН ПООЩРЕНИЯ (ОГОНЁК) */}
      {showSuccessOverlay && (
        <>
          <style>{`
            @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes contentScaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .animate-overlay-fade { animation: overlayFadeIn 0.25s ease-out forwards; }
            .animate-content-scale { animation: contentScaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          `}</style>

          <div
            onClick={handleFinish}
            className="animate-overlay-fade fixed inset-0 z-[5000] flex cursor-pointer flex-col items-center justify-center bg-[var(--background)]/90 backdrop-blur-[2px]"
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
      <style>{`
        .prose-content-transition {
          position: relative;
        }
        .prose-content-transition::after {
          content: "";
          position: absolute;
          inset: -20px;
          background-color: var(--background, #0f0510);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease-out;
          z-index: 10;
        }
        .prose-content-transition img,
        .prose-content-transition pre,
        .prose-content-transition hr,
        .prose-content-transition table,
        .prose-content-transition mark {
          transition: opacity 0.3s ease-out, filter 0.3s ease-out;
        }

        ${
          activeFocusMode === 'text' && activeNoteId
            ? `
          @media (min-width: 1024px) {
            /* Мгновенно и одновременно затемняем весь текст оверлеем */
            .prose-content-transition::after {
              opacity: 0.75; /* Сила затемнения (регулируйте по вкусу) */
            }
            
            /* Дополнительно приглушаем картинки и блоки кода */
            .prose-content-transition img,
            .prose-content-transition pre,
            .prose-content-transition hr,
            .prose-content-transition table {
              opacity: 0.25 !important;
            }

            /* Неактивные маркеры тускнеют под оверлеем */
            .prose-content-transition mark:not([data-note-id="${activeNoteId}"]) {
              opacity: 0.3 !important;
              filter: grayscale(80%) !important;
            }

            /* ВЫТАСКИВАЕМ активную заметку ПОВЕРХ оверлея затемнения (z-index 20 > 10) */
            .prose-content-transition mark[data-note-id="${activeNoteId}"] {
              position: relative !important;
              z-index: 20 !important;
              filter: brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.3)) !important;
            }
          }
        `
            : ''
        }
      `}</style>
    </div>
  );
};
