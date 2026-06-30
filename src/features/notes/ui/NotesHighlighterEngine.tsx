import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNotesStore } from '../store/useNotesStore';
import { NoteBlank } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { isColorLight } from '@/features/notes/utils/notesUtils';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpenCreateModal: (data: {
    text: string;
    prefix: string;
    suffix: string;
    offset: number;
  }) => void;
  onMobileNoteTap: (noteId: string, rect: DOMRect) => void;
  onMarksRendered?: () => void;
}

export const NotesHighlighterEngine: React.FC<Props> = ({
  containerRef,
  onOpenCreateModal,
  onMobileNoteTap,
  onMarksRendered,
}) => {
  const notes = useNotesStore((s) => s.notes);
  const setActiveNoteId = useNotesStore((s) => s.setActiveNoteId);

  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionData, setSelectionData] = useState<{
    text: string;
    prefix: string;
    suffix: string;
    offset: number;
  } | null>(null);

  // ОПТИМИЗАЦИЯ 1: Прячем коллбеки в ref, чтобы их изменение не вызывало
  // полную перерисовку (ререндер) всего DOM-дерева хайлайтов!
  const handlers = useRef({ onOpenCreateModal, onMobileNoteTap, onMarksRendered, setActiveNoteId });
  useLayoutEffect(() => {
    handlers.current = { onOpenCreateModal, onMobileNoteTap, onMarksRendered, setActiveNoteId };
  });

  // 1. Сохранение текущего выделения юзером
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        setSelectionRect(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setSelectionRect(null);
        return;
      }

      const fullText = containerRef.current.innerText;
      const text = selection.toString().trim();
      if (!text) return;

      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preSelectionRange.toString().length;

      const prefix = fullText.substring(Math.max(0, startOffset - 30), startOffset);
      const suffix = fullText.substring(startOffset + text.length, startOffset + text.length + 30);

      setSelectionData({ text, prefix, suffix, offset: startOffset });

      const rects = range.getClientRects();
      if (rects.length > 0) setSelectionRect(rects[0]);
    };

    const handleScroll = () => {
      if (window.getSelection()?.toString()) {
        setSelectionRect(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mouseup', handleSelection);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mouseup', handleSelection);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [containerRef]);

  // ОПТИМИЗАЦИЯ: Прямая работа с DOM без ререндера компонента!
  useEffect(() => {
    // Подписываемся на изменения Zustand в обход React-цикла
    const unsub = useNotesStore.subscribe((state, prevState) => {
      if (state.activeNoteId !== prevState.activeNoteId) {
        if (!containerRef.current) return;

        const marks = containerRef.current.querySelectorAll<HTMLElement>('mark.mt-shared-note');
        marks.forEach((mark) => {
          if (mark.dataset.noteId === state.activeNoteId) {
            mark.classList.add('active-note-mark');
          } else {
            mark.classList.remove('active-note-mark');
          }
        });
      }
    });

    return unsub;
  }, [containerRef]);

  // 2. Многоабзацный хайлайтер (Оптимизированный)
  useEffect(() => {
    if (!containerRef.current) return;

    // ОПТИМИЗАЦИЯ 2: Пакетная очистка DOM.
    // Снимаем все старые обертки мгновенно за 1 цикл, не дожидаясь анимаций.
    // Анимации текста ломали Reflow браузера и вызывали жесткие лаги при удалении.
    const existingMarks = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('mark.mt-shared-note'),
    );
    existingMarks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });

    // Склеиваем разбитые текстовые ноды (вызывает Reflow 1 раз, а не 100 раз)
    containerRef.current.normalize();

    if (notes.length === 0) {
      if (handlers.current.onMarksRendered) setTimeout(handlers.current.onMarksRendered, 50);
      return;
    }

    // ИСПРАВЛЕНИЕ БАГА С НАЛОЖЕНИЕМ:
    // Сортируем СНАЧАЛА самые длинные (абзацы), ЗАТЕМ короткие (предложения).
    // Таким образом короткая заметка оборачивает текст ВНУТРИ длинной заметки
    // и оказывается визуально поверх неё!
    const sortedNotes = [...notes].sort((a, b) => {
      const lenA = a.selected_text.length;
      const lenB = b.selected_text.length;
      if (lenA !== lenB) {
        return lenB - lenA; // По убыванию длины
      }
      // Если длина одинаковая, то сортируем по расположению в тексте
      return a.text_offset - b.text_offset;
    });

    sortedNotes.forEach((note) => {
      try {
        const walker = document.createTreeWalker(containerRef.current!, NodeFilter.SHOW_TEXT, null);
        let currentOffset = 0;
        const targetStart = note.text_offset;
        const targetEnd = targetStart + note.selected_text.length;

        const textNodesToWrap: Array<{ node: Text; startOffset: number; endOffset: number }> = [];
        let currentNode: Node | null;

        while ((currentNode = walker.nextNode())) {
          const textNode = currentNode as Text;
          const nodeLength = textNode.nodeValue?.length || 0;
          const nodeStart = currentOffset;
          const nodeEnd = currentOffset + nodeLength;

          if (nodeEnd > targetStart && nodeStart < targetEnd) {
            textNodesToWrap.push({
              node: textNode,
              startOffset: Math.max(0, targetStart - nodeStart),
              endOffset: Math.min(nodeLength, targetEnd - nodeStart),
            });
          }

          currentOffset += nodeLength;
          if (currentOffset >= targetEnd) break;
        }

        const ops = textNodesToWrap
          .map((item, i) => ({
            ...item,
            isFirst: i === 0,
            isLast: i === textNodesToWrap.length - 1,
          }))
          .reverse();

        ops.forEach((op) => {
          if (op.startOffset >= op.endOffset) return;

          const split1 = op.node.splitText(op.startOffset);
          split1.splitText(op.endOffset - op.startOffset);

          const mark = document.createElement('mark');
          mark.dataset.noteId = note.id;

          // Добавили легкую тень и z-index, чтобы вложенные заметки визуально "отрывались" от родительских
          mark.className =
            'mt-shared-note transition-colors duration-200 relative shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:shadow-md';

          if (op.isFirst) mark.classList.add('rounded-l-[4px]');
          if (op.isLast) mark.classList.add('rounded-r-[4px]');

          mark.style.backgroundColor = note.color;
          mark.style.color = isColorLight(note.color) ? '#0f0510' : '#ffffff';

          if (op.isFirst) mark.id = `note-mark-${note.id}`;

          mark.onclick = (e) => {
            e.stopPropagation(); // ВАЖНО: Останавливает клик, чтобы не нажималась родительская заметка!

            handlers.current.setActiveNoteId(note.id, 'aside');
            const card = document.getElementById(`note-card-${note.id}`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (window.innerWidth < 1024) {
              handlers.current.onMobileNoteTap(note.id, mark.getBoundingClientRect());
            }
          };

          mark.appendChild(split1.cloneNode(true));
          split1.parentNode?.replaceChild(mark, split1);
        });
      } catch (e) {
        console.error('Ошибка выделения', e);
      }
    });

    if (handlers.current.onMarksRendered) {
      setTimeout(handlers.current.onMarksRendered, 50);
    }
  }, [notes, containerRef]); // В зависимостях оставили только notes. Никаких лишних ререндеров!

  // ОПТИМИЗАЦИЯ УРОВНЯ БОГ: Мягкое скрытие маркеров без перерисовки DOM
  const pendingDeletionIds = useNotesStore((s) => s.pendingDeletionIds);

  useEffect(() => {
    if (!containerRef.current) return;

    const allMarks = containerRef.current.querySelectorAll<HTMLElement>('mark.mt-shared-note');

    allMarks.forEach((mark) => {
      const noteId = mark.dataset.noteId;
      if (!noteId) return;

      if (pendingDeletionIds.includes(noteId)) {
        // Убираем фон и тени, а цвет текста возвращаем к дефолтному
        mark.style.backgroundColor = 'transparent';
        mark.style.color = 'inherit';
        mark.style.boxShadow = 'none';
        mark.style.pointerEvents = 'none';
      } else {
        // Если отменили удаление - восстанавливаем цвета из стора Zustand
        // Получаем актуальный стейт через getState, чтобы не ререндерить этот компонент при добавлении новых заметок
        const note = useNotesStore.getState().notes.find((n) => n.id === noteId);
        if (note) {
          mark.style.backgroundColor = note.color;
          mark.style.color = isColorLight(note.color) ? '#0f0510' : '#ffffff';
        }
        mark.style.boxShadow = ''; // Пустая строка вернет тень от tailwind-классов
        mark.style.pointerEvents = 'auto';
      }
    });
  }, [pendingDeletionIds, containerRef]);

return (
  <AnimatePresence>
    {selectionRect &&
      selectionData &&
      (() => {
        // Оцениваем позицию динамически при каждом выделении
        const isMobile = window.innerWidth < 1024;
        const tooltipHeight = 44;
        const tooltipWidth = 50; // Примерная ширина с 1 кнопкой
        const gap = 10; // Отступ от текста

        // Проверяем, хватает ли места до нижнего края экрана
        const spaceBelow = window.innerHeight - selectionRect.bottom;

        // Размещаем снизу только на телефонах И если хватает места до края экрана
        const isBelow = isMobile && spaceBelow > tooltipHeight + gap;

        // Расчет позиции по оси Y
        const topPos = isBelow
          ? selectionRect.bottom + gap
          : Math.max(10, selectionRect.top - tooltipHeight - gap);

        // Центрируем относительно выделения по оси X (с защитой от вылета за боковые края)
        const leftPos = Math.max(
          10,
          Math.min(
            window.innerWidth - tooltipWidth - 10,
            selectionRect.left + selectionRect.width / 2 - tooltipWidth / 2,
          ),
        );

        // Направление анимации (чтобы всегда вылетал "из текста")
        const initialY = isBelow ? -10 : 10;

        return (
          <motion.div
            initial={{ opacity: 0, y: initialY, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[2000] flex items-center justify-center rounded-xl bg-primary px-2 py-1.5 shadow-lg"
            style={{
              top: topPos,
              left: leftPos,
            }}
          >
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                handlers.current.onOpenCreateModal(selectionData);
                setSelectionRect(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-white transition-colors hover:bg-white/20"
              title="Создать заметку"
            >
              <NoteBlank size={22} weight="fill" />
            </button>

            {/* Динамический хвостик: если поповер под текстом — хвостик смотрит вверх, если над — вниз */}
            {isBelow ? (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-primary" />
            ) : (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
            )}
          </motion.div>
        );
      })()}
  </AnimatePresence>
);
};
