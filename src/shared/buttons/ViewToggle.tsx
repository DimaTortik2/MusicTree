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

  const activeColorClass = color === 'primary' ? 'border-primary' : 'border-accent';

  return (
    <div
      className={cn(
        'relative flex items-center w-44 sm:w-48 rounded-full p-0 bg-surface/30 border-2 backdrop-blur-md select-none transition-colors duration-300',
        activeColorClass,
        className
      )}
    >
      {/* Me Option */}
      <button
        type="button"
        onClick={() => onChange('me')}
        className={cn(
          'relative w-1/2 h-9 sm:h-11 flex items-center justify-center rounded-l-full py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 outline-none cursor-pointer',
          viewTarget === 'me' ? 'text-white font-semibold' : 'text-text/60 hover:text-text'
        )}
      >
        {viewTarget === 'me' && (
          <motion.div
            layoutId="active-toggle-bg"
            className={cn(
              'absolute -top-[2px] -bottom-[2px] -left-[2px] -right-[1px] z-0 shadow-sm',
              color === 'primary' ? 'bg-primary' : 'bg-accent'
            )}
            style={{
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '9999px',
              borderTopRightRadius: '0px',
              borderBottomRightRadius: '9999px',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 z-10">
          <UserAvatar
            userId={user?.id}
            name={userAvatarName}
            src={profile?.avatar_url}
            lqip={profile?.avatar_lqip}
            forceGradient={profile?.use_gradient}
            className="size-7 sm:size-8 shrink-0"
          />
        </span>
        <span className="relative z-10 pl-7 sm:pl-8">Вы</span>
      </button>

      {/* Friend Option */}
      <button
        type="button"
        onClick={() => onChange('friend')}
        className={cn(
          'relative w-1/2 h-9 sm:h-11 flex items-center justify-center rounded-r-full py-1.5 transition-colors duration-200 outline-none cursor-pointer',
          viewTarget === 'friend' ? 'text-white font-semibold' : 'text-text/60 hover:text-text'
        )}
      >
        {viewTarget === 'friend' && (
          <motion.div
            layoutId="active-toggle-bg"
            className={cn(
              'absolute -top-[2px] -bottom-[2px] -right-[2px] -left-[1px] z-0 shadow-sm',
              color === 'primary' ? 'bg-primary' : 'bg-accent'
            )}
            style={{
              borderTopRightRadius: '9999px',
              borderBottomRightRadius: '9999px',
              borderTopLeftRadius: '9999px',
              borderBottomLeftRadius: '0px',
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <span className="absolute right-1 sm:right-1.5 top-1/2 -translate-y-1/2 z-10">
          <UserAvatar
            userId={activeSharedFriend.id}
            name={friendAvatarName}
            src={activeSharedFriend.avatar_url}
            lqip={activeSharedFriend.avatar_lqip}
            forceGradient={activeSharedFriend.use_gradient}
            className="size-7 sm:size-8 shrink-0"
          />
        </span>
      </button>
    </div>
  );
};
