import { supabase } from '@/shared/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

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
  },
}));
