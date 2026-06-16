import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/buttons/Button';
import { Cookie } from '@phosphor-icons/react';

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, соглашался ли юзер ранее
    const hasAccepted = localStorage.getItem('cookies_accepted');
    if (!hasAccepted) {
      // Небольшая задержка, чтобы не пугать сразу при загрузке
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookies_accepted', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 300 }}
          animate={{ y: 0 }}
          exit={{ y: 300}}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-4 bottom-4 left-4 z-[9999] sm:right-8 sm:bottom-8 sm:left-auto sm:max-w-sm"
        >
          <div className="flex flex-col gap-4 rounded-2xl bg-surface/90 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 items-center justify-center text-primary">
                <Cookie size={20} weight="fill" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-text">Мы используем Cookie 🍪</h3>
                <p className="text-xs leading-relaxed text-text/60">
                  Они нужны для работы аналитики, защиты от ботов (капча) и сохранения ваших сессий.
                  Никакой продажи данных рекламщикам.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button size="mini" variant="solid" color="primary" onClick={acceptCookies}>
                Понятно, спасибо
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
