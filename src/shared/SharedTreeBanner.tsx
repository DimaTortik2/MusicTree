import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { UserAvatar } from '@/shared/UserAvatar';
import { cn } from '@/app/utils/cn';

const BannerContent: React.FC<{ activeSharedFriend: any }> = ({ activeSharedFriend }) => {
  // Стартуем с true, чтобы плашка изначально была свернута (слева) и ждала 800мс
  const [isScrolled, setIsScrolled] = useState(true);

  useEffect(() => {
    let isReady = false; // Тот самый блокиратор для автоскролла
    let rafId: number;

    const handleScroll = (e: Event) => {
      // Игнорируем любые скроллы первые 800мс
      if (!isReady) return;

      const target = e.target as HTMLElement;
      if (target && target.classList && target.classList.contains('overflow-y-auto')) {
        // Обернул в RAF для 60FPS
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          setIsScrolled(target.scrollTop > 40);
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    // Твоя логика ожидания окончания автоскролла страницы
    const timer = setTimeout(() => {
      isReady = true;

      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        setIsScrolled(scrollContainer.scrollTop > 40);
      } else {
        setIsScrolled(false); // Если скролла нет, раскрываем по центру
      }
    }, 800);

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute top-6 right-0 left-0 z-50 flex px-4 md:px-6">
      <div className="relative h-12 w-full">
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
          className={cn(
            'pointer-events-auto absolute top-0 flex items-center overflow-hidden rounded-full border-2 border-primary/50 bg-surface/80 p-1.5 shadow-lg backdrop-blur-md',
            isScrolled ? 'left-0' : 'left-1/2 -ml-[110px]',
          )}
          style={{ transform: isScrolled ? 'none' : 'translateX(-50%)' }}
        >
          {/* Аватарка защищена от изменения размеров родителя через layout="position" */}
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
                  Дерево с {activeSharedFriend.full_name?.split(' ')[0] || 'другом'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export const SharedTreeBanner: React.FC = () => {
  const { activeSharedFriend } = useAppModeStore();
  const location = useLocation();

  if (!activeSharedFriend || location.pathname !== '/app/tree') return null;

  return <BannerContent activeSharedFriend={activeSharedFriend} />;
};
