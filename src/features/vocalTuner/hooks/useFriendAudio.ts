import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/app/utils/toast';
import type { Recording } from '@/features/vocalTuner/types';

interface FriendCache {
  [friendId: string]: {
    recordings?: Omit<Recording, 'blob'>[];
    audioTimestamp?: number;
    progress?: any;
    progressTimestamp?: number;
  };
}

export function useFriendAudio(friendId: string | undefined) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriendAudio = useCallback(async () => {
    if (!friendId) {
      setRecordings([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('user_id', friendId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let loaded: Recording[] = [];
      if (data && data.length > 0) {
        const paths = data.map((track) => track.url);
        // signedUrl TTL: 86400 seconds (24 hours) to match useVocalTuner.tsx
        const { data: signedUrlsData, error: storageError } = await supabase.storage
          .from('audio_records')
          .createSignedUrls(paths, 86400);

        if (storageError) throw storageError;

        loaded = data.map((track, index) => ({
          id: track.id,
          name: track.title,
          time: new Date(track.created_at).toLocaleDateString(),
          url: signedUrlsData?.[index]?.signedUrl || '',
          dur: track.dur,
          blob: new Blob(),
          createdAt: track.created_at,
        }));
      }

      // Update cache
      const cacheStr = localStorage.getItem('music-tree-friend-cache') || '{}';
      let cache: FriendCache = {};
      try {
        cache = JSON.parse(cacheStr);
      } catch (e) {
        // ignore
      }
      if (!cache[friendId]) {
        cache[friendId] = {};
      }
      cache[friendId].recordings = loaded.map(({ blob, ...r }) => r);
      cache[friendId].audioTimestamp = Date.now();
      localStorage.setItem('music-tree-friend-cache', JSON.stringify(cache));

      setRecordings(loaded);
    } catch (err) {
      console.error('Error fetching friend audio:', err);
      
      // Fallback to cache
      const cacheStr = localStorage.getItem('music-tree-friend-cache') || '{}';
      try {
        const cache: FriendCache = JSON.parse(cacheStr);
        const cachedEntry = cache[friendId];
        if (cachedEntry && cachedEntry.recordings) {
          const cachedRecordings: Recording[] = cachedEntry.recordings.map((r) => ({
            ...r,
            blob: new Blob(),
          }));
          setRecordings(cachedRecordings);
          toast.info('Не удалось загрузить свежие записи друга. Показана копия из кэша.');
        } else {
          setRecordings([]);
          toast.error('Не удалось загрузить записи друга.');
        }
      } catch (cacheErr) {
        setRecordings([]);
        toast.error('Не удалось загрузить записи друга.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    fetchFriendAudio();
  }, [fetchFriendAudio]);

  return { recordings, isLoading, refetch: fetchFriendAudio };
}
