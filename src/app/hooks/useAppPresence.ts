// src/app/hooks/useAppPresence.ts
import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { usePresenceStore } from '@/app/store/presenceStore';

export const useAppPresence = () => {
  const { user, profile } = useAuthStore();
  const setOnlineUsers = usePresenceStore((state) => state.setOnlineUsers);

  useEffect(() => {
    // Если юзера нет или у него в БД can_use_presence === false — выходим
    if (!user || !profile || !profile.can_use_presence) {
      setOnlineUsers({});
      return;
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: { key: user.id },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const currentOnlineUsers: Record<string, boolean> = {};

      for (const id in state) {
        currentOnlineUsers[id] = true;
      }

      setOnlineUsers(currentOnlineUsers);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          // Если вкладка активна при загрузке — отправляем онлайн
          if (document.visibilityState === 'visible') {
            await channel.track({ online_at: new Date().toISOString() });
          }
        } catch (error) {
          console.warn('Ошибка отправки онлайна:', error);
        }
      }
    });

    // ✨ МАГИЯ: Обработчик сворачивания / переключения вкладок
    const handleVisibilityChange = async () => {
      try {
        if (document.visibilityState === 'hidden') {
          // Юзер ушел на другую вкладку или свернул браузер -> Убираем онлайн
          await channel.untrack();
        } else {
          // Юзер вернулся -> Возвращаем онлайн
          await channel.track({ online_at: new Date().toISOString() });
        }
      } catch (error) {
        // Игнорируем возможные сетевые микро-ошибки при скрытии
      }
    };

    // Слушаем поведение вкладки браузера
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // При размонтировании убираем слушатель
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Синхронно удаляем канал. Supabase сам отправит "Leave" пакет серверу.
      // (Не используем здесь untrack(), чтобы не было ошибки StrictMode)
      supabase.removeChannel(channel);
    };
  }, [user?.id, profile?.can_use_presence, setOnlineUsers]);
};
