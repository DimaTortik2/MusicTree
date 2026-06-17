import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import { useSharedProgressStore } from '@/app/store/useSharedProgressStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { toast } from '@/app/utils/toast';

// Вырезаем локальную навигацию перед отправкой в БД
const stripNav = (fullState: any) => {
  if (!fullState) return {};
  const { currentLesson, lastUncompletedLesson, lessonScrollPositions, ...stateToSave } = fullState;
  return stateToSave;
};

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
        const localState = useSharedProgressStore.getState();
        const mergedState = {
          ...data.progress_state,
          currentLesson: localState.currentLesson,
          lastUncompletedLesson: localState.lastUncompletedLesson,
          lessonScrollPositions: localState.lessonScrollPositions,
        };
        lastSavedState.current = JSON.stringify(stripNav(mergedState));
        useSharedProgressStore.setState(mergedState);
      } else {
        lastSavedState.current = JSON.stringify(stripNav(useSharedProgressStore.getState()));
      }

      // 1. ОТПРАВКА В БАЗУ (Безопасный таймер 1000мс)
      unsubStore = useSharedProgressStore.subscribe((state) => {
        const stateToSave = stripNav(state);
        const currentStateStr = JSON.stringify(stateToSave);
        if (currentStateStr === lastSavedState.current) return;

        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          lastSavedState.current = currentStateStr;
          await supabase
            .from('shared_trees')
            .update({ 
              progress_state: stateToSave,
              updated_at: new Date().toISOString()
            })
            .eq('id', sharedTreeId);
        }, 1000); // Оставили 1 секунду, чтобы беречь лимиты!
      });

      // 2. ПРИЁМ ИЗ БАЗЫ (УМНЫЙ MERGE)
      channel = supabase
        .channel(`shared_tree_${sharedTreeId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'shared_trees', filter: `id=eq.${sharedTreeId}` },
          (payload) => {
            if (payload.new && payload.new.progress_state) {
              const dbState = payload.new.progress_state;
              const incomingStateStr = JSON.stringify(stripNav(dbState));
              
              if (incomingStateStr !== lastSavedState.current) {
                lastSavedState.current = incomingStateStr;
                const localState = useSharedProgressStore.getState();
                
                // 🔥 УМНЫЙ MERGE: объединяем БД и то, что юзер успел накликать
                const mergedPassedLessons = [...new Set([
                  ...(localState.passedLessons || []),
                  ...(dbState.passedLessons || [])
                ])];

                const mergedPassedHomeworks = [...new Set([
                  ...(localState.passedHomeworks || []),
                  ...(dbState.passedHomeworks || [])
                ])];

                const mergedHalfPassed = {
                  ...(localState.halfPassedLessons || {}),
                  ...(dbState.halfPassedLessons || {})
                };

                // Если урок пройден полностью - вычищаем его из "половинок"
                mergedPassedLessons.forEach(id => {
                  delete mergedHalfPassed[id];
                });

                useSharedProgressStore.setState({
                  ...dbState,
                  passedLessons: mergedPassedLessons,
                  passedHomeworks: mergedPassedHomeworks,
                  halfPassedLessons: mergedHalfPassed,
                  // Сохраняем локальные данные скролла и навигации
                  currentLesson: localState.currentLesson,
                  lastUncompletedLesson: localState.lastUncompletedLesson,
                  lessonScrollPositions: localState.lessonScrollPositions,
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'shared_trees', filter: `id=eq.${sharedTreeId}` },
          () => {
            exitSharedMode();
            navigate('/app/tree');
            toast.info('Совместное дерево удалено вашим другом');
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