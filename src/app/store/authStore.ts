import { supabase } from '@/shared/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import localforage from 'localforage';

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;

  // Указываем, что initialize возвращает функцию очистки (которая в свою очередь возвращает void)
  initialize: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,

  initialize: () => {
    // Получаем текущую сессию при загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true });
    });

    // Подписываемся на изменения
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });

    // Возвращаем функцию отписки, которая полностью соответствует новому типу в интерфейсе
    return () => {
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    await supabase.auth.signOut();

    // 1. Очищаем IndexedDB (все локальные аудиозаписи)
    await localforage.clear();

    // 2. Очищаем LocalStorage (прогресс и шорткаты)
    localStorage.removeItem('music-tree-progress');
    localStorage.removeItem('app-shortcuts-storage');

    // 3. Делаем хард-редирект на главную (или в /app/tree).
    // Это гарантированно выгрузит старые данные из оперативной памяти Zustand.
    window.location.href = '/';
  },
}));
