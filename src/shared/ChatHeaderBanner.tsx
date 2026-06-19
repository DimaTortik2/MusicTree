import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBendUpLeft } from '@phosphor-icons/react';
import { UserAvatar } from '@/shared/UserAvatar';
import { cn } from '@/app/utils/cn';
import type { FriendProfile } from '@/features/friends/hooks/useFriends';


interface ChatHeaderBannerProps {
  isScrolled: boolean;
  activeSharedFriend: FriendProfile; // используем готовый тип
  onBack: () => void;
}

export const ChatHeaderBanner: React.FC<ChatHeaderBannerProps> = ({
  isScrolled,
  activeSharedFriend,
  onBack,
}) => {
  return (
    <header className="pointer-events-none absolute top-4 right-0 left-0 z-50 px-4 md:top-8 md:px-6">
      <div className="relative flex w-full">
        {/* Кнопка "назад" абсолютно спозиционирована слева, чтобы не влиять на flex-центрирование */}
        <button
          onClick={onBack}
          className="pointer-events-auto absolute top-0 left-0 z-10 flex h-12 items-center p-2 text-text/40 transition-colors outline-none hover:text-text md:hidden"
        >
          <ArrowBendUpLeft size={28} />
        </button>

        {/* Родительский контейнер управляет выравниванием по горизонтали через justify-content */}
        <div
          className={cn(
            'flex w-full',
            isScrolled ? 'justify-end' : 'justify-center', // Вправо при скролле вниз, по центру при скролле вверх
          )}
        >
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
            className="pointer-events-auto flex h-12 items-center overflow-hidden rounded-full border-2 border-accent/50 bg-surface/80 p-1.5 shadow-lg backdrop-blur-md"
          >
            <motion.div
              layout="position"
              className="relative flex size-8 shrink-0 items-center justify-center"
            >
              <UserAvatar
                userId={activeSharedFriend.id}
                name={activeSharedFriend.full_name || 'Друг'}
                src={activeSharedFriend.avatar_url}
                lqip={activeSharedFriend.avatar_lqip}
                forceGradient={activeSharedFriend.use_gradient}
                className="size-8"
              />
            </motion.div>

            <AnimatePresence initial={false}>
              {!isScrolled && (
                <motion.div
                  layout="position"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <span className="block pr-4 pl-3 text-sm font-medium text-text md:text-base">
                    {activeSharedFriend.full_name?.split(' ')[0] || 'Друг'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </header>
  );
};
