import { useProgressStore } from '@/app/store/useProgressStore';
import { useSharedProgressStore } from '@/app/store/useSharedProgressStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';

/**
 * Возвращает нужный стор в зависимости от того, находимся ли мы в личном дереве
 * или в совместном с другом.
 */
export const useCurrentProgress = () => {
  const isSharedMode = useAppModeStore((s) => !!s.activeSharedFriend);
  
  const personalProgress = useProgressStore();
  const sharedProgress = useSharedProgressStore();

  return isSharedMode ? sharedProgress : personalProgress;
};

/**
 * 💡 МАГИЯ: Добавляем метод .getState(), чтобы он работал как настоящий Zustand-стор.
 * Это позволяет использовать useCurrentProgress.getState() внутри useEffect
 * без вызова ре-рендеров (например, для сохранения скролла).
 */
useCurrentProgress.getState = () => {
  // Смотрим в сторе режимов, есть ли активный друг
  const isSharedMode = !!useAppModeStore.getState().activeSharedFriend;
  
  // Возвращаем состояние нужного стора
  return isSharedMode 
    ? useSharedProgressStore.getState() 
    : useProgressStore.getState();
};