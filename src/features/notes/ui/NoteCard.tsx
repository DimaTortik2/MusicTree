import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { type SharedNote, useNotesStore } from '../store/useNotesStore';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { Avatar } from '@/shared/Avatar';
import { Trash, ArrowBendDownRight } from '@phosphor-icons/react';
import { isColorLight } from '@/features/notes/utils/notesUtils';
import { cn } from '@/app/utils/cn';

interface Props {
  note: SharedNote;
  hideHeader?: boolean;
}

export const NoteCard: React.FC<Props> = ({ note, hideHeader = false }) => {
  // 1. ОПТИМИЗАЦИЯ: Читаем из стора только то, что нужно
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);

  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const setActiveNoteId = useNotesStore((s) => s.setActiveNoteId);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  if (!note) return null;

  const isMe = user?.id === note.author_id;
  const authorName = isMe ? profile?.full_name : activeSharedFriend?.full_name;
  const authorAvatar = isMe ? profile?.avatar_url : activeSharedFriend?.avatar_url;

  // 2. ОПТИМИЗАЦИЯ: Мемоизируем вычисления цвета (чтобы не пересчитывать каждый рендер)
  const { isLight, textColor } = useMemo(() => {
    const light = isColorLight(note.color);
    return { isLight: light, textColor: light ? '#0f0510' : '#ffffff' };
  }, [note.color]);

  const isActive = activeNoteId === note.id;
  const isDimmed = activeNoteId !== null && activeNoteId !== note.id;

  // 3. ОПТИМИЗАЦИЯ: Проверяем размер ТОЛЬКО когда карточка свернута, чтобы не ломать анимацию
  useEffect(() => {
    if (!isActive && textRef.current) {
      // clientHeight/scrollHeight вызывают Reflow. Делаем это аккуратно.
      const isTextTruncated = textRef.current.scrollHeight > textRef.current.clientHeight;
      if (isTruncated !== isTextTruncated) {
        setIsTruncated(isTextTruncated);
      }
    }
  }, [note.note_text, isActive]); // Убрали isTruncated из зависимостей

  // 4. ОПТИМИЗАЦИЯ: Кэшируем функции кликов
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!isActive) {
        setActiveNoteId(note.id, 'text');
      } else {
        const mark = document.getElementById(`note-mark-${note.id}`);
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          mark.classList.add('animate-pulse');
          setTimeout(() => mark.classList.remove('animate-pulse'), 1500);
        }
      }
    },
    [isActive, note.id, setActiveNoteId],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNote(note.id);
    },
    [deleteNote, note.id],
  );

  const pendingDeletionIds = useNotesStore((s) => s.pendingDeletionIds);
  const isPending = pendingDeletionIds.includes(note.id);

  return (
    <div
      id={`note-card-${note.id}`}
      onClick={handleCardClick}
      className={cn(
        // ОПТИМИЗАЦИЯ: Убрали will-change (ест память) и transition-all (анимирует лишнее)
        // Оставили только точечные анимации теней и трансформаций
        'group relative overflow-hidden rounded-2xl p-4 transition-[box-shadow,transform,cursor] duration-300 ease-out',
        isActive
          ? 'cursor-default shadow-lg ring-2 ring-black/10 dark:ring-white/10'
          : 'cursor-pointer shadow-sm hover:-translate-y-0.5 hover:shadow-md',
        isPending && 'pointer-events-none scale-95 opacity-0',
      )}
      style={{
        backgroundColor: note.color,
        color: textColor,
      }}
    >
      {/* СЛОЙ ЗАТЕМНЕНИЯ */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-30 transition-opacity duration-300',
          isDimmed ? 'bg-black/25 opacity-100 dark:bg-black/50' : 'opacity-0',
        )}
      />

      {/* КНОПКА УДАЛЕНИЯ */}
      {isMe && (
        <button
          onClick={handleDelete}
          className={cn(
            'absolute top-2 right-2 z-40 rounded-md p-1.5 transition-opacity duration-200',
            'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
            isLight ? 'hover:bg-black/10' : 'hover:bg-white/20',
          )}
          title="Удалить заметку"
        >
          <Trash size={18} weight="fill" className="opacity-80 hover:opacity-100" />
        </button>
      )}

      {/* ШАПКА */}
      {!hideHeader && (
        <div className="relative z-10 mb-2.5 flex items-center gap-2 pr-6">
          <Avatar
            name={authorName || 'User'}
            src={authorAvatar}
            className="size-6 border border-current/20 shadow-sm"
          />
          <span className="text-sm font-medium opacity-60">{authorName}</span>
        </div>
      )}

      {/* ТЕКСТ ЗАМЕТКИ */}
      <div className="relative z-10">
        <p
          ref={textRef}
          className={cn(
            // ОПТИМИЗАЦИЯ: Убрали transition-all с текста. Браузеру очень больно анимировать перенос строк при line-clamp.
            'text-[15px] leading-relaxed break-words whitespace-pre-wrap',
            isMe && 'pr-6',
            !isActive && 'line-clamp-3',
          )}
        >
          {note.note_text}
        </p>

        {/* Градиент */}
        {!isActive && isTruncated && (
          <div
            className="absolute right-0 bottom-0 left-0 h-6 w-full"
            style={{
              background: `linear-gradient(to top, ${note.color} 10%, transparent 100%)`,
            }}
          />
        )}
      </div>

      {/* ПОДСКАЗКА (Скрыта на мобилках: hidden lg:block) */}
      {isActive && (
        <div className="animate-in fade-in relative z-10 mt-3 hidden duration-200 lg:block">
          <div
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors active:scale-95',
              isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20',
            )}
          >
            <ArrowBendDownRight weight="bold" size={14} className="opacity-80" />
            <span>К лекции</span>
          </div>
        </div>
      )}
    </div>
  );
};
