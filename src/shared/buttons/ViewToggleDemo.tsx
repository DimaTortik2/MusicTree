import React, { useState, useEffect } from 'react';
import { ViewToggle } from './ViewToggle';
import { useAppModeStore } from '@/app/store/useAppModeStore';

/**
 * Простой демонстрационный компонент для локальной проверки внешнего вида и анимации переключателя.
 * Заполняет хранилище моковыми данными друга, чтобы компонент не возвращал null.
 */
export const ViewToggleDemo: React.FC = () => {
  const [viewTarget, setViewTarget] = useState<'me' | 'friend'>('me');

  useEffect(() => {
    // Сохраняем предыдущее состояние
    const prevFriend = useAppModeStore.getState().activeSharedFriend;

    // Временный мок друга для отрисовки аватара
    useAppModeStore.setState({
      activeSharedFriend: {
        id: 'friend-123',
        full_name: 'Черника Друг',
        username: 'blueberry_friend',
        avatar_url: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?auto=format&fit=crop&q=80&w=200',
        avatar_lqip: '',
        use_gradient: false,
        created_at: new Date().toISOString(),
        email: 'friend@test.com',
        progress_state: null,
      } as any
    });

    // Очищаем/восстанавливаем при размонтировании
    return () => {
      useAppModeStore.setState({ activeSharedFriend: prevFriend });
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 bg-surface/80 backdrop-blur-md rounded-[24px] border border-line/20 max-w-sm mx-auto my-10 font-sans shadow-xl">
      <h3 className="text-sm font-medium text-text/60">Тестирование ViewToggle</h3>
      
      <ViewToggle
        viewTarget={viewTarget}
        onChange={setViewTarget}
        color="primary"
      />
      
      <div className="text-xs text-text/40">
        Активный режим: <span className="font-semibold text-text">{viewTarget === 'me' ? 'Вы' : 'Друг'}</span>
      </div>
    </div>
  );
};
