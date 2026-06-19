import React, { useEffect, useState } from 'react';
import { useNotesStore } from '../store/useNotesStore';
import { Quotes, NoteBlank } from '@phosphor-icons/react';
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
  const activeNoteId = useNotesStore((s) => s.activeNoteId);

  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectionData, setSelectionData] = useState<{
    text: string;
    prefix: string;
    suffix: string;
    offset: number;
  } | null>(null);

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

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [containerRef]);

  // 2. Многоабзацный хайлайтер
  useEffect(() => {
    if (!containerRef.current) return;

    const existingMarks = Array.from(containerRef.current.querySelectorAll('mark.mt-shared-note'));
    existingMarks.forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
      parent?.removeChild(mark);
    });

    containerRef.current.normalize();

    if (notes.length === 0) {
      if (onMarksRendered) setTimeout(onMarksRendered, 50);
      return;
    }

    const sortedNotes = [...notes].sort((a, b) => b.text_offset - a.text_offset);

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
          mark.className = 'mt-shared-note transition-colors duration-300 relative';

          if (op.isFirst) mark.classList.add('border-l-[3px]', 'rounded-l-[3px]');
          if (op.isLast) mark.classList.add('border-r-[3px]', 'rounded-r-[3px]');

          mark.style.backgroundColor = note.color;
          mark.style.borderColor = isColorLight(note.color) ? '#0f051060' : '#f3f4f660';
          mark.style.color = isColorLight(note.color) ? '#0f0510' : '#f3f4f6';

          if (op.isFirst) mark.id = `note-mark-${note.id}`;

          mark.onclick = (e) => {
            e.stopPropagation();
            setActiveNoteId(note.id, 'aside'); // <--- Добавили 'aside'
            const card = document.getElementById(`note-card-${note.id}`);
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (window.innerWidth < 1024) onMobileNoteTap(note.id, mark.getBoundingClientRect());
          };

          mark.appendChild(split1.cloneNode(true));
          split1.parentNode?.replaceChild(mark, split1);
        });
      } catch (e) {
        console.error('Ошибка выделения', e);
      }
    });

    // Уведомляем систему о том, что новые элементы вставлены и можно считать координаты
    if (onMarksRendered) {
      setTimeout(onMarksRendered, 50);
    }
  }, [notes, containerRef, onMobileNoteTap, setActiveNoteId, onMarksRendered]);

  return (
    <AnimatePresence>
      {selectionRect && selectionData && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed z-[2000] flex items-center gap-2 rounded-xl bg-primary px-3 py-2"
          style={{
            top: Math.max(10, selectionRect.top - 60),
            left: Math.max(
              10,
              Math.min(window.innerWidth - 110, selectionRect.left + selectionRect.width / 2 - 50),
            ),
          }}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              console.log(`Перенос в чат: "${selectionData.text}"`);
              setSelectionRect(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="cursor-pointer rounded-lg p-1.5 text-white transition-colors hover:bg-white/20"
          >
            <Quotes size={22} weight="fill" />
          </button>
          <div className="h-6 w-px bg-white/30" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onOpenCreateModal(selectionData);
              setSelectionRect(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="cursor-pointer rounded-lg p-1.5 text-white transition-colors hover:bg-white/20"
          >
            <NoteBlank size={22} weight="fill" />
          </button>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
