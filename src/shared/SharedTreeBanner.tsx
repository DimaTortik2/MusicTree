import React from 'react';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { UserAvatar } from '@/shared/UserAvatar';

export const SharedTreeBanner: React.FC = () => {
  const { activeSharedFriend } = useAppModeStore();

  if (!activeSharedFriend) return null;

  return (
    <div className="pointer-events-none absolute top-6 left-0 z-50 flex w-full justify-center md:top-8">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-primary/50 bg-surface/80 py-1.5 pr-6 pl-2 shadow-lg backdrop-blur-md">
        <UserAvatar
          userId={activeSharedFriend.id}
          name={activeSharedFriend.full_name || 'Друг'}
          src={activeSharedFriend.avatar_url}
          lqip={activeSharedFriend.avatar_lqip}
          forceGradient={activeSharedFriend.use_gradient}
          className="size-8"
        />
        <span className="text-sm font-medium text-text md:text-base">
          Дерево с {activeSharedFriend.full_name?.split(' ')[0] || 'другом'}
        </span>
      </div>
    </div>
  );
};
