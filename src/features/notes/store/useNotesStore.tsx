// src/features/notes/store/useNotesStore.ts
import { create } from 'zustand';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/app/utils/toast';

export interface SharedNote {
  id: string;
  shared_tree_id: string;
  lesson_id: string;
  author_id: string;
  note_text: string;
  color: string;
  selected_text: string;
  prefix: string;
  suffix: string;
  text_offset: number;
  created_at: string;
}

interface NotesState {
  notes: SharedNote[];
  activeNoteId: string | null;
  isLoading: boolean;

  fetchNotes: (treeId: string, lessonId: string) => Promise<void>;
  subscribeToNotes: (treeId: string, lessonId: string) => () => void;
  addNote: (note: Omit<SharedNote, 'id' | 'created_at'>) => Promise<void>;
  deleteNote: (noteId: string) => void;
  setActiveNoteId: (id: string | null) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,

  setActiveNoteId: (id) => set({ activeNoteId: id }),

  fetchNotes: async (treeId, lessonId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('shared_notes')
      .select('*')
      .eq('shared_tree_id', treeId)
      .eq('lesson_id', lessonId)
      .order('text_offset', { ascending: true });

    if (data) set({ notes: data });
    set({ isLoading: false });
  },

  subscribeToNotes: (treeId, lessonId) => {
    const channel = supabase
      .channel(`notes_${treeId}_${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_notes',
          filter: `shared_tree_id=eq.${treeId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as SharedNote).lesson_id !== lessonId) return;

          set((state) => {
            let newNotes = [...state.notes];
            if (payload.eventType === 'INSERT') {
              // ИСПРАВЛЕНИЕ: Блокируем дублирование из-за оптимистичного UI
              if (!newNotes.some((n) => n.id === payload.new.id)) {
                newNotes.push(payload.new as SharedNote);
              }
            } else if (payload.eventType === 'DELETE') {
              newNotes = newNotes.filter((n) => n.id !== payload.old.id);
            }
            return { notes: newNotes.sort((a, b) => a.text_offset - b.text_offset) };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  addNote: async (notePayload) => {
    // ИСПРАВЛЕНИЕ: Надежно генерируем UUID на клиенте, чтобы избежать дублей
    const newId = crypto.randomUUID();
    const finalNote = { ...notePayload, id: newId, created_at: new Date().toISOString() };

    set((state) => ({
      notes: [...state.notes, finalNote].sort((a, b) => a.text_offset - b.text_offset),
    }));

    const { error } = await supabase.from('shared_notes').insert(finalNote);

    if (error) {
      toast.error('Не удалось сохранить заметку');
      set((state) => ({ notes: state.notes.filter((n) => n.id !== newId) }));
    } else {
      toast.success('Заметка успешно создана');
    }
  },

  deleteNote: (noteId) => {
    const noteToDelete = get().notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
    let isUndone = false;

    const toastId = toast.undo(
      <div className="flex w-full items-center justify-between gap-3">
        <span>Заметка удалена</span>
        <button
          className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            isUndone = true;
            toast.dismiss(toastId);
            set((state) => ({
              notes: [...state.notes, noteToDelete].sort((a, b) => a.text_offset - b.text_offset),
            }));
          }}
        >
          Отменить
        </button>
      </div>,
      {
        autoClose: 4000,
        onClose: async () => {
          if (!isUndone) {
            await supabase.from('shared_notes').delete().eq('id', noteId);
          }
        },
      },
    );
  },
}));
