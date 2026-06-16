import { useState, useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore, type UserProfile } from '@/app/store/authStore';
import { toast } from '@/app/utils/toast';

export interface FriendProfile extends UserProfile {
  id: string;
}

export interface AppNotification {
  id: string;
  type: 'friend_request' | 'friend_removed';
  sender_id: string;
  created_at: string;
  sender: FriendProfile;
}

// ДОБАВИЛИ username
const PROFILE_FIELDS =
  'id, full_name, avatar_url, avatar_lqip, username, can_upload_avatar, can_use_gradient, use_gradient, can_use_presence';

export const useFriends = () => {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data: friendsData } = await supabase
      .from('friends')
      .select(`friend_id, profiles!friends_friend_id_fkey(${PROFILE_FIELDS})`)
      .eq('user_id', user.id);

    if (friendsData) {
      const mappedFriends = friendsData.map((f: any) => {
        const profile = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles;
        return profile as FriendProfile;
      });
      setFriends(mappedFriends);
    }

    const { data: notifData } = await supabase
      .from('notifications')
      .select(
        `id, type, sender_id, created_at, sender:profiles!notifications_sender_id_fkey(${PROFILE_FIELDS})`,
      )
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (notifData) {
      const mappedNotifs = notifData.map((n: any) => {
        const senderProfile = Array.isArray(n.sender) ? n.sender[0] : n.sender;
        return { ...n, sender: senderProfile as FriendProfile };
      });

      // Отфильтровываем уведомления, если профиль отправителя не найден (null)
      const validNotifs = mappedNotifs.filter((n) => n.sender != null);

      setNotifications(validNotifs as AppNotification[]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    if (!user) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => loadData(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // БЕЗОПАСНЫЙ ПОИСК ЧЕРЕЗ RPC
  const searchUsers = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const { data } = await supabase.rpc('search_users_secure', {
      search_query: trimmedQuery,
    });

    if (data) setSearchResults(data as FriendProfile[]);
    setIsSearching(false);
  };

  const sendRequest = async (recipientId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .insert([{ recipient_id: recipientId, sender_id: user.id, type: 'friend_request' }]);
    if (!error) toast.success('Заявка отправлена!');
  };

  // 4. Принять заявку (теперь через безопасный RPC)
  const acceptRequest = async (notificationId: string, senderId: string) => {
    if (!user) return;

    // Вызываем нашу транзакцию на стороне БД
    const { error } = await supabase.rpc('accept_friend_request', {
      notif_id: notificationId,
      sender: senderId,
    });

    if (error) {
      console.error('Ошибка при добавлении в друзья:', error);
      toast.error('Не удалось добавить в друзья');
      return;
    }

    // Успех! Очищаем UI локально и перезагружаем
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    loadData();
    toast.success('Пользователь добавлен в друзья!');
  };

  // 5. Удалить из друзей
  const removeFriend = async (friendId: string) => {
    if (!user) return;

    // Пытаемся удалить перекрестно
    const { error: err1 } = await supabase
      .from('friends')
      .delete()
      .match({ user_id: user.id, friend_id: friendId });
    const { error: err2 } = await supabase
      .from('friends')
      .delete()
      .match({ user_id: friendId, friend_id: user.id });

    if (err1 || err2) {
      console.error('Ошибка при удалении из друзей:', err1 || err2);
      toast.error('Не удалось удалить пользователя');
      return;
    }

    // Отправляем уведомление об удалении
    await supabase
      .from('notifications')
      .insert([{ recipient_id: friendId, sender_id: user.id, type: 'friend_removed' }]);

    loadData();
    toast.success('Пользователь удален из друзей');
  };

  const dismissNotification = async (notificationId: string) => {
    await supabase.from('notifications').delete().eq('id', notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  return {
    friends,
    notifications,
    searchResults,
    isSearching,
    isLoading,
    searchUsers,
    sendRequest,
    acceptRequest,
    removeFriend,
    dismissNotification,
  };
};
