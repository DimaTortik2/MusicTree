import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';
import { useNotesStore } from '../store/useNotesStore';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { NoteCard } from './NoteCard';
import { NotesHighlighterEngine } from './NotesHighlighterEngine';
import { CreateNoteModal } from './CreateNoteModal';

interface Props {
  contentId?: string; // Это может быть lessonId, chainId или homeworkId
  children: React.ReactNode;
  className?: string; // Сюда передадим стили prose из нужной страницы
}

export const SharedNotesContainer: React.FC<Props> = ({ contentId, children, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const {
    notes,
    fetchNotes,
    subscribeToNotes,
    addNote,
    activeNoteId,
    activeFocusMode,
    setActiveNoteId,
    pendingDeletionIds,
  } = useNotesStore();

  const canUseNotes = !!activeSharedFriend && !!profile?.can_use_notes;

  const [createModalData, setCreateModalData] = useState<{
    text: string;
    prefix: string;
    suffix: string;
    offset: number;
  } | null>(null);
  const [mobilePopover, setMobilePopover] = useState<{ noteId: string; rect: DOMRect } | null>(
    null,
  );
  const [noteLayout, setNoteLayout] = useState<
    Record<string, { y: number; isGrouped: boolean; zIndex: number; scale: number }>
  >({});
  const [isReadyToAnimate, setIsReadyToAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReadyToAnimate(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Подгрузка заметок
  useEffect(() => {
    if (canUseNotes && sharedTreeId && contentId) {
      fetchNotes(sharedTreeId, contentId);
      const unsub = subscribeToNotes(sharedTreeId, contentId);
      return () => unsub();
    }
  }, [canUseNotes, sharedTreeId, contentId, fetchNotes, subscribeToNotes]);

  // Закрытие поповеров
  useEffect(() => {
    const handleScroll = () => setMobilePopover((prev) => (prev !== null ? null : prev));
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[id^="note-card-"]') && !target.closest('[id^="note-mark-"]')) {
        setMobilePopover(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Рассчет позиций карточек
  const updateNotePositions = useCallback(() => {
    if (!contentRef.current || notes.length === 0) return;

    const newLayout: Record<
      string,
      { y: number; isGrouped: boolean; zIndex: number; scale: number }
    > = {};
    const baseTop = asideRef.current
      ? asideRef.current.getBoundingClientRect().top
      : contentRef.current.getBoundingClientRect().top;

    const visibleNotes = notes.filter((n) => !pendingDeletionIds.includes(n.id));
    const sortedNotes = [...visibleNotes].sort((a, b) => a.text_offset - b.text_offset);

    const notesWithTargets = sortedNotes.map((note) => {
      const mark = document.getElementById(`note-mark-${note.id}`);
      const targetY = mark ? mark.getBoundingClientRect().top - baseTop : 0;
      const height = notesRef.current[note.id]?.offsetHeight || 80;
      return { note, targetY, height };
    });

    const CLUSTER_DISTANCE = 120;
    const clusters: (typeof notesWithTargets)[] = [];
    let currentCluster: typeof notesWithTargets = [];

    notesWithTargets.forEach((item) => {
      if (currentCluster.length === 0) {
        currentCluster.push(item);
      } else {
        const firstItem = currentCluster[0];
        if (item.targetY - firstItem.targetY < CLUSTER_DISTANCE) {
          currentCluster.push(item);
        } else {
          clusters.push(currentCluster);
          currentCluster = [item];
        }
      }
    });
    if (currentCluster.length > 0) clusters.push(currentCluster);

    let nextMinY = 0;
    const STANDARD_GAP = 16;
    const GROUP_GAP = 6;
    const STACK_OFFSET = 12;
    const SCALE_STEP = 0.03;

    clusters.forEach((cluster) => {
      const isActiveCluster = cluster.some((item) => item.note.id === activeNoteId);
      let clusterStartY = Math.max(cluster[0].targetY, nextMinY);

      cluster.forEach((item, index) => {
        let finalY = clusterStartY;
        let scale = 1;
        let zIndex = 10 - index;
        let isGrouped = false;

        const prevItem = index > 0 ? cluster[index - 1] : null;
        const isSameAuthor = prevItem && prevItem.note.author_id === item.note.author_id;

        if (isActiveCluster) {
          if (item.note.id === activeNoteId) zIndex = 50;
          if (
            isSameAuthor &&
            clusterStartY <= (newLayout[prevItem!.note.id]?.y || 0) + prevItem!.height + 40
          ) {
            isGrouped = true;
            finalY = clusterStartY;
          } else {
            finalY = clusterStartY;
          }
          clusterStartY = finalY + item.height + (isGrouped ? GROUP_GAP : STANDARD_GAP);
        } else {
          finalY = clusterStartY + index * STACK_OFFSET;
          scale = 1 - index * SCALE_STEP;
          isGrouped = false;
        }

        newLayout[item.note.id] = { y: finalY, isGrouped, zIndex, scale };
      });

      if (isActiveCluster) {
        nextMinY = clusterStartY;
      } else {
        nextMinY =
          clusterStartY + cluster[0].height + (cluster.length - 1) * STACK_OFFSET + STANDARD_GAP;
      }
    });

    setNoteLayout((prev) =>
      JSON.stringify(prev) !== JSON.stringify(newLayout) ? newLayout : prev,
    );
  }, [notes, activeNoteId, pendingDeletionIds]);

  useEffect(() => {
    updateNotePositions();
  }, [updateNotePositions, activeNoteId, notes, pendingDeletionIds]);

  useEffect(() => {
    if (!canUseNotes || !contentRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    let previousWidth = contentRef.current?.offsetWidth || 0;

    const observer = new ResizeObserver((entries) => {
      const contentEntry = entries.find((e) => e.target === contentRef.current);
      if (contentEntry) {
        const currentWidth = contentEntry.contentRect.width;
        if (currentWidth === previousWidth) return;
        previousWidth = currentWidth;
      }
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => updateNotePositions(), 30);
    });

    if (contentRef.current) observer.observe(contentRef.current);
    const currentNotesRef = notesRef.current;
    Object.values(currentNotesRef).forEach((cardEl) => {
      if (cardEl) observer.observe(cardEl);
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [canUseNotes, updateNotePositions, notes]);

  const previousNoteLayout = useRef(noteLayout);
  useEffect(() => {
    previousNoteLayout.current = noteLayout;
  }, [noteLayout]);

  const handlePageClick = () => setActiveNoteId(null);

  return (
    <div className="relative flex w-full" onClick={handlePageClick}>
      <div
        className={cn(
          'flex w-full gap-8 transition-all duration-300 lg:gap-12',
          canUseNotes ? 'max-w-[1100px]' : 'w-full',
        )}
      >
        {/* ЛЕВАЯ КОЛОНКА (Контент) */}
        <div className="flex w-full min-w-0 flex-col">
          <div
            ref={contentRef}
            className={cn(
              'prose-content-transition w-full',
              activeFocusMode === 'text' && activeNoteId ? 'focus-mode-active' : '',
              className,
            )}
          >
            {children}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА (Заметки) */}
        {canUseNotes && (
          <motion.aside
            ref={asideRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
            className="relative hidden w-[280px] shrink-0 border-text/10 lg:block"
          >
            {notes.map((note) => {
              const layout = noteLayout[note.id];
              const isPositioned = layout !== undefined;
              const isFirstPositioning = isPositioned && !previousNoteLayout.current[note.id];
              const shouldAnimateY = isReadyToAnimate && isPositioned && !isFirstPositioning;

              return (
                <motion.div
                  key={note.id}
                  ref={(el) => {
                    if (el) notesRef.current[note.id] = el;
                  }}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{
                    y: layout?.y || 0,
                    opacity: isPositioned ? 1 : 0,
                    scale: isPositioned ? (layout?.scale ?? 1) : 0.95,
                  }}
                  transition={{
                    y: shouldAnimateY
                      ? { type: 'spring', stiffness: 200, damping: 25 }
                      : { duration: 0 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2, ease: 'easeOut' },
                  }}
                  className="absolute top-0 right-0 left-6 origin-top will-change-transform"
                  style={{
                    pointerEvents: isPositioned ? 'auto' : 'none',
                    zIndex: layout?.zIndex || 1,
                  }}
                >
                  <NoteCard note={note} hideHeader={layout?.isGrouped} />
                </motion.div>
              );
            })}
          </motion.aside>
        )}
      </div>

      {/* МОДАЛКИ И ВЫДЕЛЕНИЕ */}
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
              if (!createModalData || !user || !sharedTreeId || !contentId) return;
              addNote({
                shared_tree_id: sharedTreeId,
                lesson_id: contentId, // Сохраняем под переданным ID (урок/цепь/домашка)
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
          {/* ИСПРАВЛЕНИЕ: Убеждаемся, что заметка всё ещё существует в массиве */}
          {mobilePopover && notes.some((n) => n.id === mobilePopover.noteId) && (
            <motion.div
              key={`mobile-popover-${mobilePopover.noteId}`} // <-- ВАЖНО: Добавлен обязательный key
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
              <NoteCard
                note={notes.find((n) => n.id === mobilePopover.noteId)!}
                hideHeader={false}
              />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <style>{`
        .prose-content-transition { position: relative; }
        .prose-content-transition::after {
          content: ""; position: absolute; inset: -20px;
          background-color: var(--background, #0f0510);
          opacity: 0; pointer-events: none; transition: opacity 0.3s ease-out; z-index: 10;
          border-radius: 24px;
        }
        .prose-content-transition img, .prose-content-transition pre,
        .prose-content-transition hr, .prose-content-transition table, .prose-content-transition mark {
          transition: opacity 0.3s ease-out, filter 0.3s ease-out;
        }
        @media (min-width: 1024px) {
          .prose-content-transition.focus-mode-active::after { opacity: 0.75; }
          .prose-content-transition.focus-mode-active img, .prose-content-transition.focus-mode-active pre,
          .prose-content-transition.focus-mode-active hr, .prose-content-transition.focus-mode-active table {
            opacity: 0.25 !important;
          }
          .prose-content-transition.focus-mode-active mark:not(.active-note-mark):not(:has(.active-note-mark)) {
            opacity: 0.3 !important; filter: grayscale(80%) !important;
          }
          .prose-content-transition.focus-mode-active mark.active-note-mark {
            position: relative !important; z-index: 20 !important;
            filter: brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.3)) !important;
          }
        }
      `}</style>
    </div>
  );
};
