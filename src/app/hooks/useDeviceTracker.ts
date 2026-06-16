import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';

export const useDeviceTracker = () => {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  useEffect(() => {
    if (!user) return;

    // 1. Генерируем уникальный ID для ЭТОГО браузера/телефона
    let deviceId = localStorage.getItem('music-tree-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('music-tree-device-id', deviceId);
    }

    // Простенький детект (можно потом заменить на библиотеку UAParser)
    const isMobile = /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent);
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown';
    const deviceName = `${isMobile ? 'Телефон' : 'Браузер'} на ${platform}`;

    // 2. Регистрируем устройство в базе (обновляем время активности)
    supabase.from('active_devices').upsert({
      id: deviceId,
      user_id: user.id,
      device_name: deviceName,
      device_type: isMobile ? 'mobile' : 'desktop',
      last_active: new Date().toISOString(),
    }).then();

    // 3. СЛУШАЕМ СВОЮ СМЕРТЬ. Если нас удалили из базы — нас кикнули. Выходим!
    const channel = supabase
      .channel(`device_tracker_${deviceId}`)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'active_devices', filter: `id=eq.${deviceId}` },
        () => {
          signOut(); // Тотальная очистка локальных данных из твоего zustand стора
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, signOut]);
};