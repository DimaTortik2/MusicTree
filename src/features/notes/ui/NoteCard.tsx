import React from 'react';
import { type SharedNote, useNotesStore } from '../store/useNotesStore';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { Avatar } from '@/shared/Avatar';
import { Trash } from '@phosphor-icons/react';
import { isColorLight } from '@/features/notes/utils/notesUtils';
import { cn } from '@/app/utils/cn';

interface Props {
  note: SharedNote;
  hideHeader?: boolean;
}

export const NoteCard: React.FC<Props> = ({ note, hideHeader = false }) => {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);

  const setActiveNoteId = useNotesStore((s) => s.setActiveNoteId);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  if (!note) return null;

  const isMe = user?.id === note.author_id;
  const authorName = isMe ? profile?.full_name : activeSharedFriend?.full_name;
  const authorAvatar = isMe ? profile?.avatar_url : activeSharedFriend?.avatar_url;

  const isLight = isColorLight(note.color);
  const textColor = isLight ? '#0f0510' : '#ffffff';

  return (
    <div
      id={`note-card-${note.id}`}
      onClick={(e) => {
        e.stopPropagation();
        setActiveNoteId(note.id, 'text'); // <--- Добавили 'text'
          const mark = document.getElementById(`note-mark-${note.id}`);
          if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
      className="group relative cursor-pointer rounded-2xl p-4 shadow-sm transition-colors duration-300"
      style={{
        backgroundColor: note.color,
        color: textColor,
      }}
    >
      {isMe && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNote(note.id);
          }}
          className="absolute top-2 right-2 z-10 rounded-md p-1.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/10 [.light_&]:hover:bg-white/20"
        >
          <Trash size={18} weight="bold" />
        </button>
      )}

      {!hideHeader && (
        <div className="mb-2 flex items-center gap-2 pr-6">
          <Avatar
            name={authorName || 'User'}
            src={authorAvatar}
            className="size-6 border border-current/20"
          />
          <span className="text-sm font-medium opacity-40">{authorName}</span>
        </div>
      )}

      <p className={cn('text-[15px] leading-snug break-words whitespace-pre-wrap', isMe && 'pr-6')}>
        {note.note_text}
      </p>
    </div>
  );
};
