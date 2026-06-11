import { useAuthStore } from '@/app/store/authStore';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useShortcutStore } from '@/app/store/useShortcutStore';
import { supabase } from '@/shared/lib/supabase';
import { useEffect, useState } from 'react';
import localforage from 'localforage';

export const useCloudSync = () => {
  const { user, initialized } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    if (!initialized) {
      setIsSyncing(true);
      return;
    }

    if (!user) {
      setIsSyncing(false);
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let isInitializedState = false;
    let unsubProgress: () => void;
    let unsubShortcuts: () => void;

    const loadAndSubscribe = async () => {
      setIsSyncing(true);

      // Запрашиваем состояние и ФЛАГ доступа к облачному аудио
      const { data, error } = await supabase
        .from('profiles')
        .select('progress_state, shortcut_state, can_cloud_audio')
        .eq('id', user.id)
        .single();

      const hasCloudProgress = data?.progress_state && Object.keys(data.progress_state).length > 0;
      const userHasCloudAccess = !!data?.can_cloud_audio;

      if (data && !error) {
        // 1. Применяем прогресс из облака, если он есть
        if (hasCloudProgress) {
          useProgressStore.setState(data.progress_state);
          if (data.shortcut_state && Object.keys(data.shortcut_state).length > 0) {
            useShortcutStore.setState(data.shortcut_state);
          }
        }

        // 2. Умная миграция аудио (РАБОТАЕТ ТОЛЬКО ЕСЛИ ДАЛИ ОБЛАКО)
        const state = useProgressStore.getState();
        if (userHasCloudAccess && state.audioRecordIds && state.audioRecordIds.length > 0) {
          let allSuccess = true;

          for (const id of state.audioRecordIds) {
            try {
              const recData = await localforage.getItem<any>(id);
              if (recData && recData.blob) {
                const ext =
                  recData.blob.type.includes('mp4') || recData.blob.type.includes('m4a')
                    ? 'm4a'
                    : 'webm';
                const filePath = `${user.id}/${id}.${ext}`;

                // Загружаем в Storage
                const { error: uploadError } = await supabase.storage
                  .from('audio_records')
                  .upload(filePath, recData.blob, { contentType: recData.blob.type });

                // Игнорируем ошибку, если такой файл там уже лежит
                if (
                  uploadError &&
                  !uploadError.message.includes('already exists') &&
                  !uploadError.message.includes('Duplicate')
                ) {
                  throw uploadError;
                }

                // Добавляем запись в БД (проверяем, чтобы не было дублей)
                const { count } = await supabase
                  .from('audio_tracks')
                  .select('id', { count: 'exact', head: true })
                  .eq('id', id);
                if (count === 0) {
                  const { error: dbError } = await supabase.from('audio_tracks').insert([
                    {
                      id: id,
                      user_id: user.id,
                      title: recData.title,
                      dur: recData.dur,
                      url: filePath,
                      created_at: recData.createdAt,
                    },
                  ]);
                  if (dbError) throw dbError;
                }
              }
            } catch (e) {
              console.error('Ошибка миграции аудио:', e);
              allSuccess = false; // Если хоть один файл упал, мы НЕ будем чистить локалку
            }
          }

          // 3. Стираем локальные данные ТОЛЬКО если перенос прошел без единой ошибки
          if (allSuccess) {
            await localforage.clear();
            useProgressStore.setState({ audioRecordIds: [] });
          }
        }
      }

      setIsSyncing(false);
      isInitializedState = true;

      const saveToCloud = async () => {
        await supabase
          .from('profiles')
          .update({
            progress_state: useProgressStore.getState(),
            shortcut_state: useShortcutStore.getState(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      };

      const onChange = () => {
        if (!isInitializedState) return;
        clearTimeout(timeout);
        timeout = setTimeout(saveToCloud, 2000);
      };

      unsubProgress = useProgressStore.subscribe(onChange);
      unsubShortcuts = useShortcutStore.subscribe(onChange);
    };

    loadAndSubscribe();

    return () => {
      if (unsubProgress) unsubProgress();
      if (unsubShortcuts) unsubShortcuts();
      clearTimeout(timeout);
    };
  }, [user, initialized]);

  return { isSyncing };
};
