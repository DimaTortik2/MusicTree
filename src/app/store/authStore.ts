import { supabase } from '@/shared/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import localforage from 'localforage';

export interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  username: string;
  avatar_lqip: string | null;
  can_upload_avatar: boolean;
  can_use_gradient: boolean;
  use_gradient: boolean;
  can_use_presence: boolean;
  can_use_qr_login: boolean;
  can_use_friends: boolean;
  can_use_chats: boolean;
  can_use_notes: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  initialized: boolean;

  // Указываем, что initialize возвращает функцию очистки
  initialize: () => () => void;
  signOut: () => Promise<void>;
  updateProfileState: (updates: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  initialized: false,

  updateProfileState: (updates) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));
  },

  initialize: () => {
    // Вспомогательная функция для загрузки кастомных данных профиля из БД
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select(
          'full_name, avatar_url, avatar_lqip, can_upload_avatar, can_use_gradient, use_gradient, username, can_use_presence, can_use_qr_login, can_use_friends, can_use_chats, can_use_notes',
        )
        .eq('id', userId)
        .single();

      if (data) {
        set({ profile: data });
      }
    };

    // Получаем текущую сессию при загрузке
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true });
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Подписываемся на изменения (вход / выход / смена аккаунта)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = get().user;
      set({ session, user: session?.user ?? null });

      // Если юзер только залогинился или сменился аккаунт - грузим его профиль
      if (session?.user && session.user.id !== currentUser?.id) {
        fetchProfile(session.user.id);
      } else if (!session?.user) {
        // Если разлогинился - очищаем профиль
        set({ profile: null });
      }
    });

    // Возвращаем функцию отписки
    return () => {
      subscription.unsubscribe();
    };
  },

  signOut: async () => {
    const deviceId = localStorage.getItem('music-tree-device-id');
    if (deviceId) {
      await supabase.rpc('terminate_device', {
        target_device_id: deviceId,
        current_device_id: deviceId,
      });
    }

    await supabase.auth.signOut({ scope: 'local' });

    // 1. Очищаем IndexedDB (все локальные аудиозаписи)
    await localforage.clear();

    // 2. Очищаем LocalStorage (прогресс и шорткаты)
    localStorage.removeItem("music-tree-progress");
    localStorage.removeItem("app-shortcuts-storage");
    localStorage.removeItem("music-tree-device-id");
    localStorage.removeItem("music-tree-app-mode");
    localStorage.removeItem("music-tree-friend-cache");
    // 3. Делаем хард-редирект на главную (или в /app/tree).
    // Это гарантированно выгрузит старые данные из оперативной памяти Zustand.
    window.location.href = '/';
  },
}));
