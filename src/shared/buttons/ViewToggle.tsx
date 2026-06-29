import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// made by gemini with antigravity
export const ViewToggle: React.FC<ViewToggleProps> = ({
  viewTarget,
  onChange,
  color = 'primary',
  className,
}) => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);

  // made by technocat
  const clicksRef = useRef<number[]>([]);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  if (!activeSharedFriend) return null;

  const userAvatarName = profile?.full_name || profile?.username || 'Вы';
  const friendAvatarName = activeSharedFriend.full_name || activeSharedFriend.username || 'Друг';

  const activeColorClass = color === 'primary' ? 'border-primary' : 'border-accent';

  const handleToggle = () => {
    onChange(viewTarget === 'me' ? 'friend' : 'me');

    // Отслеживаем 5 кликов за 2 секунды для пасхалки
    const now = Date.now();
    const recentClicks = clicksRef.current.filter((t) => now - t <= 2000);
    recentClicks.push(now);
    clicksRef.current = recentClicks;

    if (recentClicks.length >= 5) {
      setShowEasterEgg(true);
      clicksRef.current = []; // сброс счетчика после активации
      setTimeout(() => {
        setShowEasterEgg(false);
      }, 3000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'relative flex items-center w-full h-[58px] md:h-[62px] rounded-full p-0 bg-surface/30 border-2 backdrop-blur-md select-none transition-colors duration-300 outline-none cursor-pointer',
          activeColorClass,
          className
        )}
      >
        {/* Me Option */}
        <div
          className={cn(
            'relative w-1/2 h-full flex items-center justify-center rounded-l-full py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200',
            viewTarget === 'me' ? 'text-white font-semibold' : 'text-text/60'
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
          <span className="absolute left-[7px] top-1/2 -translate-y-1/2 z-10">
            <UserAvatar
              userId={user?.id}
              name={userAvatarName}
              src={profile?.avatar_url}
              lqip={profile?.avatar_lqip}
              forceGradient={profile?.use_gradient}
              className="size-10 md:size-[44px] shrink-0"
            />
          </span>
          <span className="absolute left-[47px] md:left-[51px] right-0 top-0 bottom-0 flex items-center justify-center z-10">
            <span>Вы</span>
          </span>
        </div>

        {/* Friend Option */}
        <div
          className={cn(
            'relative w-1/2 h-full flex items-center justify-center rounded-r-full py-1.5 transition-colors duration-200',
            viewTarget === 'friend' ? 'text-white font-semibold' : 'text-text/60'
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
          <span className="absolute right-[7px] top-1/2 -translate-y-1/2 z-10">
            <UserAvatar
              userId={activeSharedFriend.id}
              name={friendAvatarName}
              src={activeSharedFriend.avatar_url}
              lqip={activeSharedFriend.avatar_lqip}
              forceGradient={activeSharedFriend.use_gradient}
              className="size-10 md:size-[44px] shrink-0"
            />
          </span>
        </div>
      </button>

      {/* Easter Egg Toast */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border-2 border-primary bg-surface/80 px-4 py-3 text-xs font-semibold text-text shadow-xl backdrop-blur-md pointer-events-none"
            style={{ boxShadow: '0 10px 30px rgba(var(--primary-rgb), 0.2)' }}
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>hello from gemini | by technocat</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
