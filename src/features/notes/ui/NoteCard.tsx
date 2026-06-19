// src/features/notes/ui/NoteCard.tsx
import React from 'react';
import { type SharedNote, useNotesStore } from '../store/useNotesStore';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { Avatar } from '@/shared/Avatar';
import { Trash } from '@phosphor-icons/react';
import { isColorLight } from '@/features/notes/utils/notesUtils';

interface Props {
  note: SharedNote;
}

export const NoteCard: React.FC<Props> = ({ note }) => {
  if (!note) return null;
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);

  const setActiveNoteId = useNotesStore((s) => s.setActiveNoteId);
  const activeNoteId = useNotesStore((s) => s.activeNoteId);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const isMe = user?.id === note.author_id;
  const authorName = isMe ? profile?.full_name : activeSharedFriend?.full_name;
  const authorAvatar = isMe ? profile?.avatar_url : activeSharedFriend?.avatar_url;

  const isLight = isColorLight(note.color);
  const textColor = isLight ? '#0f0510' : '#ffffff';
  const isActive = activeNoteId === note.id;

  return (
    <div
      id={`note-card-${note.id}`}
      onClick={() => {
        setActiveNoteId(note.id);
        const mark = document.getElementById(`note-mark-${note.id}`);
        if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
      className="cursor-pointer rounded-2xl p-4 transition-all duration-300"
      style={{
        backgroundColor: note.color,
        color: textColor,
        transform: isActive ? 'scale(1.02)' : 'scale(1)',
        opacity: activeNoteId && !isActive ? 0.6 : 1,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar
            name={authorName || 'User'}
            src={authorAvatar}
            className="size-6 border border-current/20"
          />
          <span className="text-sm font-medium opacity-40">{authorName}</span>
        </div>

        {/* ИСПРАВЛЕНИЕ: Бледная мусорка, которая проявляется при наведении */}
        {isMe && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNote(note.id);
            }}
            className="p-1 opacity-40 transition-opacity outline-none hover:opacity-100"
          >
            <Trash size={18} weight="bold" />
          </button>
        )}
      </div>

      <p className="text-[15px] leading-snug">{note.note_text}</p>
    </div>
  );
};
