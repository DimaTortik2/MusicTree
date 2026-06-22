import { create } from 'zustand';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/app/utils/toast';
import { encryptNoteText, decryptNoteText } from '../utils/crypto';

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
  activeFocusMode: 'aside' | 'text' | null;

  fetchNotes: (treeId: string, lessonId: string) => Promise<void>;
  subscribeToNotes: (treeId: string, lessonId: string) => () => void;
  addNote: (note: Omit<SharedNote, 'id' | 'created_at'>) => Promise<void>;
  deleteNote: (noteId: string) => void;
  setActiveNoteId: (id: string | null, mode?: 'aside' | 'text' | null) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  activeFocusMode: null,

  setActiveNoteId: (id, mode = null) => set({ activeNoteId: id, activeFocusMode: mode }),

  fetchNotes: async (treeId, lessonId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('shared_notes')
      .select('*')
      .eq('shared_tree_id', treeId)
      .eq('lesson_id', lessonId)
      .order('text_offset', { ascending: true });

    if (data) {
      // Расшифровываем все заметки
      const decryptedNotes = await Promise.all(
        data.map(async (note) => ({
          ...note,
          note_text: await decryptNoteText(note.note_text, treeId),
        })),
      );
      set({ notes: decryptedNotes });
    }
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
        async (payload) => {
          // Если это удаление - сразу удаляем из стейта по ID
          // (Теперь БД будет присылать нам событие, потому что фильтр сработает!)
          if (payload.eventType === 'DELETE') {
            set((state) => ({
              notes: state.notes.filter((n) => n.id !== payload.old.id),
            }));
            return;
          }

          // Для INSERT и UPDATE проверяем, относится ли это к текущему уроку
          const newNote = payload.new as SharedNote;
          if (newNote.lesson_id !== lessonId) return;

          // Если добавилась новая заметка
          if (payload.eventType === 'INSERT') {
            const decryptedText = await decryptNoteText(newNote.note_text, treeId);

            set((state) => {
              const newNotes = [...state.notes];
              // Проверка от дублирования оптимистичного UI
              if (!newNotes.some((n) => n.id === newNote.id)) {
                newNotes.push({ ...newNote, note_text: decryptedText });
              }
              return { notes: newNotes.sort((a, b) => a.text_offset - b.text_offset) };
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  addNote: async (notePayload) => {
    const newId = crypto.randomUUID();
    const finalNote: SharedNote = {
      ...notePayload,
      id: newId,
      created_at: new Date().toISOString(),
    };

    // Оптимистичный UI: добавляем расшифрованную версию в стейт
    set((state) => ({
      notes: [...state.notes, finalNote].sort((a, b) => a.text_offset - b.text_offset),
    }));

    // Шифруем текст перед отправкой в БД
    const encryptedText = await encryptNoteText(finalNote.note_text, finalNote.shared_tree_id);
    const dbPayload = { ...finalNote, note_text: encryptedText };

    const { error } = await supabase.from('shared_notes').insert(dbPayload);

    if (error) {
      toast.error('Ошибка сохранения. Возможно, друг удалил дерево.');
      set((state) => ({ notes: state.notes.filter((n) => n.id !== newId) }));
    } else {
      toast.success('Заметка успешно создана');
    }
  },

  deleteNote: (noteId) => {
    const noteToDelete = get().notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    // 1. Убираем из локального стейта моментально (для самого юзера)
    set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
    let isUndone = false;

    // 2. Запускаем тост с таймером
    const toastId = toast.undo(
      <div className="flex w-full items-center justify-between gap-3">
        <span>Заметка удалена</span>
        <button
          className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary transition-colors hover:bg-primary/20"
          onClick={(e) => {
            e.stopPropagation();
            isUndone = true; // Ставим флаг отмены
            toast.dismiss(toastId);

            // Возвращаем в локальный стейт (БД мы не трогали, так что шифровать заново не надо)
            set((state) => ({
              notes: [...state.notes, noteToDelete].sort((a, b) => a.text_offset - b.text_offset),
            }));
          }}
        >
          Отменить
        </button>
      </div>,
      {
        autoClose: 4000, // Ждем 4 секунды
        onClose: async () => {
          // 3. Если время вышло и юзер НЕ нажал "Отменить" — удаляем из БД окончательно
          if (!isUndone) {
            await supabase.from('shared_notes').delete().eq('id', noteId);
            // Именно здесь БД отправит Realtime DELETE-событие другу, и заметка у него исчезнет!
          }
        },
      },
    );
  },
}));
