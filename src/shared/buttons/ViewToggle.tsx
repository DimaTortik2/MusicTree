import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/app/utils/cn';
import { UserAvatar } from '@/shared/UserAvatar';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';

interface ViewToggleProps {
  viewTarget: 'me' | 'friend';
  onChange: (target: 'me' | 'friend') => void;
  color?: 'primary' | 'accent';
  className?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewTarget,
  onChange,
  color = 'primary',
  className,
}) => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);

  if (!activeSharedFriend) return null;

  const userAvatarName = profile?.full_name || profile?.username || 'Вы';
  const friendAvatarName = activeSharedFriend.full_name || activeSharedFriend.username || 'Друг';

  return (
    <div
      className={cn(
        'relative flex items-center gap-1 rounded-full p-1 bg-surface/30 border border-line/25 backdrop-blur-md select-none',
        className
      )}
      style={{ width: 'fit-content' }}
    >
      {/* Sliding Active Background */}
      <motion.div
        className={cn(
          'absolute inset-y-1 rounded-full z-0 shadow-sm',
          color === 'primary' ? 'bg-primary' : 'bg-accent'
        )}
        initial={false}
        animate={{
          left: viewTarget === 'me' ? 4 : 'calc(50% + 2px)',
          right: viewTarget === 'me' ? 'calc(50% + 2px)' : 4,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      />

      {/* Me Option */}
      <button
        type="button"
        onClick={() => onChange('me')}
        className={cn(
          'relative z-10 flex items-center justify-center gap-2 rounded-full py-1 px-3 text-xs sm:text-sm font-medium transition-colors duration-200 outline-none',
          viewTarget === 'me' ? 'text-white' : 'text-text/60 hover:text-text'
        )}
      >
        <UserAvatar
          userId={user?.id}
          name={userAvatarName}
          src={profile?.avatar_url}
          lqip={profile?.avatar_lqip}
          forceGradient={profile?.use_gradient}
          className="size-7 sm:size-8 shrink-0"
        />
        <span>Вы</span>
      </button>

      {/* Friend Option */}
      <button
        type="button"
        onClick={() => onChange('friend')}
        className={cn(
          'relative z-10 flex items-center justify-center rounded-full py-1 px-4 transition-colors duration-200 outline-none',
          viewTarget === 'friend' ? 'text-white' : 'text-text/60 hover:text-text'
        )}
      >
        <UserAvatar
          userId={activeSharedFriend.id}
          name={friendAvatarName}
          src={activeSharedFriend.avatar_url}
          lqip={activeSharedFriend.avatar_lqip}
          forceGradient={activeSharedFriend.use_gradient}
          className="size-7 sm:size-8 shrink-0"
        />
      </button>
    </div>
  );
};
