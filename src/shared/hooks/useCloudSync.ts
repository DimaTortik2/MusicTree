import { useAuthStore } from '@/app/store/authStore';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useShortcutStore } from '@/app/store/useShortcutStore';
import { supabase } from '@/shared/lib/supabase';
import { useEffect } from 'react';


export const useCloudSync = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    let timeout: ReturnType<typeof setTimeout>;
    let isInitialized = false;
    let unsubProgress: () => void;
    let unsubShortcuts: () => void;

    const loadAndSubscribe = async () => {
      // 1. СКАЧИВАЕМ ДАННЫЕ ПРИ ВХОДЕ
      const { data, error } = await supabase
        .from('profiles')
        .select('progress_state, shortcut_state')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        // Если в облаке есть данные, принудительно обновляем Zustand (и localStorage)
        if (data.progress_state && Object.keys(data.progress_state).length > 0) {
          useProgressStore.setState(data.progress_state);
        }
        if (data.shortcut_state && Object.keys(data.shortcut_state).length > 0) {
          useShortcutStore.setState(data.shortcut_state);
        }
      }

      isInitialized = true; // Разрешаем отправку данных обратно в облако

      // 2. ФУНКЦИЯ ОТПРАВКИ В ОБЛАКО
      const saveToCloud = async () => {
        // ZustandgetState() возвращает стейт + функции.
        // Supabase при конвертации в JSON автоматически отбросит функции, сохранив только данные!
        await supabase
          .from('profiles')
          .update({
            progress_state: useProgressStore.getState(),
            shortcut_state: useShortcutStore.getState(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      };

      // 3. ПОДПИСЫВАЕМСЯ НА ИЗМЕНЕНИЯ СТЕЙТА
      const onChange = () => {
        if (!isInitialized) return; // Защита от случайной перезаписи при загрузке

        // Очищаем предыдущий таймер, если юзер быстро-быстро кликает
        clearTimeout(timeout);
        // Сохраняем в БД только когда юзер перестал кликать на 2 секунды
        timeout = setTimeout(saveToCloud, 2000);
      };

      // Zustand позволяет подписаться на любые изменения в сторе
      unsubProgress = useProgressStore.subscribe(onChange);
      unsubShortcuts = useShortcutStore.subscribe(onChange);
    };

    loadAndSubscribe();

    // Очистка при размонтировании (или выходе юзера)
    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubShortcuts) unsubShortcuts();
      clearTimeout(timeout);
    };
  }, [user]);
};
