import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/app/utils/toast';

interface FriendProgressData {
  passedLessons: string[];
  passedTests: Record<string, { score: number; maxScore: number; userAnswers?: number[][] }>;
}

export function useFriendProgress(friendId: string | undefined) {
  const [progress, setProgress] = useState<FriendProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriendProgress = useCallback(async () => {
    if (!friendId) {
      setProgress(null);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('progress_state')
        .eq('id', friendId)
        .single();

      if (error) throw error;

      const progressState = data?.progress_state as any;
      const progressData: FriendProgressData = {
        passedLessons: Array.isArray(progressState?.passedLessons) ? progressState.passedLessons : [],
        passedTests: progressState?.passedTests && typeof progressState.passedTests === 'object' 
          ? progressState.passedTests 
          : {},
      };

      // Update cache
      const cacheStr = localStorage.getItem('music-tree-friend-cache') || '{}';
      let cache: any = {};
      try {
        cache = JSON.parse(cacheStr);
      } catch (e) {
        // ignore
      }
      
      if (!cache[friendId]) {
        cache[friendId] = {};
      }
      cache[friendId].progress = progressData;
      cache[friendId].progressTimestamp = Date.now();
      localStorage.setItem('music-tree-friend-cache', JSON.stringify(cache));

      setProgress(progressData);
    } catch (err) {
      console.error('Error fetching friend progress:', err);

      // Fallback to cache
      const cacheStr = localStorage.getItem('music-tree-friend-cache') || '{}';
      try {
        const cache = JSON.parse(cacheStr);
        const cachedProgress = cache[friendId]?.progress;
        if (cachedProgress) {
          setProgress(cachedProgress);
          toast.info('Не удалось загрузить свежий прогресс друга. Показана копия из кэша.');
        } else {
          setProgress(null);
          toast.error('Не удалось загрузить прогресс друга.');
        }
      } catch (cacheErr) {
        setProgress(null);
        toast.error('Не удалось загрузить прогресс друга.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    fetchFriendProgress();
  }, [fetchFriendProgress]);

  return { progress, isLoading, refetch: fetchFriendProgress };
}
