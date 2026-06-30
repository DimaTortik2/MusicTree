import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // <-- Добавили AnimatePresence
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

  const uniqueId = useId();

  if (!activeSharedFriend) return null;

  const userAvatarName = profile?.full_name || profile?.username || 'Вы';
  const friendAvatarName = activeSharedFriend.full_name || activeSharedFriend.username || 'Друг';

  const activeColorClass = color === 'primary' ? 'border-primary' : 'border-accent';

  const handleToggle = () => {
    onChange(viewTarget === 'me' ? 'friend' : 'me');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      style={{ transform: 'translateZ(0)' }} // <-- 1. Форсируем отрисовку на GPU, убивает лаги
      className={cn(
        'relative mx-auto flex h-[52px] w-full max-w-[280px] cursor-pointer items-center rounded-full border-2 bg-surface/30 p-0 backdrop-blur-md transition-colors duration-300 outline-none select-none md:h-[56px]',
        activeColorClass,
        className,
      )}
    >
      {/* Me Option */}
      <div
        className={cn(
          'relative flex h-full w-1/2 items-center justify-center overflow-hidden rounded-l-full py-1.5 transition-colors duration-200',
          viewTarget === 'me' ? 'font-semibold text-white' : 'text-text/60',
        )}
      >
        {/* 2. AnimatePresence initial={false} жестко убивает баг с заползанием при загрузке */}
        <AnimatePresence initial={false}>
          {viewTarget === 'me' && (
            <motion.div
              layoutId={`active-toggle-bg-${uniqueId}`}
              layout="position" // <-- 3. Запрещаем грузить проц, анимируем только позицию
              className={cn(
                'absolute inset-y-[-2px] right-[-1px] left-[-2px] z-0 shadow-sm',
                color === 'primary' ? 'bg-primary' : 'bg-accent',
              )}
              style={{
                borderTopLeftRadius: '9999px',
                borderBottomLeftRadius: '9999px',
                borderTopRightRadius: '0px',
                borderBottomRightRadius: '9999px',
              }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Красивый отступ pl-1.5 / md:pl-2 на месте */}
        <div className="relative z-10 flex h-full w-full items-center pr-2 pl-1.5 md:pl-2">
          <UserAvatar
            userId={user?.id}
            name={userAvatarName}
            src={profile?.avatar_url}
            lqip={profile?.avatar_lqip}
            forceGradient={profile?.use_gradient}
            className="size-[38px] shrink-0 md:size-[42px]"
          />
          <span className="ml-1 flex-1 truncate text-center text-sm md:text-base">Вы</span>
        </div>
      </div>

      {/* Friend Option */}
      <div
        className={cn(
          'relative flex h-full w-1/2 items-center justify-center overflow-hidden rounded-r-full py-1.5 transition-colors duration-200',
          viewTarget === 'friend' ? 'font-semibold text-white' : 'text-text/60',
        )}
      >
        <AnimatePresence initial={false}>
          {viewTarget === 'friend' && (
            <motion.div
              layoutId={`active-toggle-bg-${uniqueId}`}
              layout="position" // <-- 3. Запрещаем грузить проц
              className={cn(
                'absolute inset-y-[-2px] right-[-2px] left-[-1px] z-0 shadow-sm',
                color === 'primary' ? 'bg-primary' : 'bg-accent',
              )}
              style={{
                borderTopRightRadius: '9999px',
                borderBottomRightRadius: '9999px',
                borderTopLeftRadius: '9999px',
                borderBottomLeftRadius: '0px',
              }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Красивый отступ pr-1.5 / md:pr-2 на месте */}
        <div className="relative z-10 flex h-full w-full items-center pr-1.5 pl-2 md:pr-2">
          <span className="mr-1 flex-1 truncate text-center text-sm md:text-base">
            {friendAvatarName}
          </span>
          <UserAvatar
            userId={activeSharedFriend.id}
            name={friendAvatarName}
            src={activeSharedFriend.avatar_url}
            lqip={activeSharedFriend.avatar_lqip}
            forceGradient={activeSharedFriend.use_gradient}
            className="size-[38px] shrink-0 md:size-[42px]"
          />
        </div>
      </div>
    </button>
  );
};
