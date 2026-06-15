import { SidebarIcon } from '@/shared/icons/sidebarIcon';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MobileSidebarPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileSidebarPortal = ({ isOpen, onClose, children }: MobileSidebarPortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-background"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="absolute inset-y-0 left-0 flex w-full flex-col shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between p-6 pb-0">
              <button
                onClick={onClose}
                // Добавили -m-2 p-2 для увеличения области нажатия, как во втором варианте
                className="-m-2 p-2 text-text/40 transition-colors hover:text-text active:scale-95"
              >
                {/* Явно задаем размер иконке */}
                <SidebarIcon />
              </button>
            </div>

            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};