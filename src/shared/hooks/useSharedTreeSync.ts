import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем навигацию!
import { supabase } from '@/shared/lib/supabase';
import { useSharedProgressStore } from '@/app/store/useSharedProgressStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { toast } from '@/app/utils/toast';

export const useSharedTreeSync = () => {
  const { sharedTreeId, exitSharedMode } = useAppModeStore();
  const navigate = useNavigate();
  const lastSavedState = useRef<string>('');

  useEffect(() => {
    if (!sharedTreeId) return;

    let timeout: ReturnType<typeof setTimeout>;
    let unsubStore: () => void;
    let channel: any;

    const initFetch = async () => {
      const { data } = await supabase
        .from('shared_trees')
        .select('progress_state')
        .eq('id', sharedTreeId)
        .single();

      if (data && data.progress_state) {
        lastSavedState.current = JSON.stringify(data.progress_state);
        useSharedProgressStore.setState(data.progress_state);
      } else {
        lastSavedState.current = JSON.stringify(useSharedProgressStore.getState());
      }

      // 1. ОТПРАВЛЯЕМ НАШИ ИЗМЕНЕНИЯ В БАЗУ
      unsubStore = useSharedProgressStore.subscribe((state) => {
        const currentStateStr = JSON.stringify(state);
        if (currentStateStr === lastSavedState.current) return;

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          lastSavedState.current = currentStateStr;
          await supabase
            .from('shared_trees')
            .update({ 
              progress_state: state,
              updated_at: new Date().toISOString()
            })
            .eq('id', sharedTreeId);
        }, 1000);
      });

      // 2. СЛУШАЕМ ИЗМЕНЕНИЯ ДРУГА В РЕАЛЬНОМ ВРЕМЕНИ
      channel = supabase
        .channel(`shared_tree_${sharedTreeId}`)
        // Слушаем обновления (друг прошел лекцию)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'shared_trees', filter: `id=eq.${sharedTreeId}` },
          (payload) => {
            if (payload.new && payload.new.progress_state) {
              const newStateStr = JSON.stringify(payload.new.progress_state);
              if (newStateStr !== lastSavedState.current) {
                lastSavedState.current = newStateStr;
                useSharedProgressStore.setState(payload.new.progress_state);
              }
            }
          }
        )
        // 🔥 БЕСШОВНОСТЬ: Слушаем удаление совместного дерева другом!
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'shared_trees', filter: `id=eq.${sharedTreeId}` },
          () => {
            exitSharedMode(); // Сбрасываем режим друга в LocalStorage
            navigate('/app/tree'); // Мягко возвращаем на свое дерево
            toast.info('Совместное дерево было удалено вашим другом');
          }
        )
        .subscribe();
    };

    initFetch();

    return () => {
      if (unsubStore) unsubStore();
      clearTimeout(timeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [sharedTreeId, exitSharedMode, navigate]);
};