import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/app/utils/cn';
import { useShortcutStore, type ShortcutAction } from '@/app/store/useShortcutStore';
import { formatShortcut } from '@/app/utils/formatShortcut';

export interface TooltipProps {
  children: React.ReactNode;
  content: string;
  shortcutAction?: ShortcutAction;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  trigger?: 'hover' | 'click';
  hideAfter?: number;
  className?: string;
}

const animationVariants = {
  top: { y: 4, opacity: 0, scale: 0.95 },
  bottom: { y: -4, opacity: 0, scale: 0.95 },
  left: { x: 4, opacity: 0, scale: 0.95 },
  right: { x: -4, opacity: 0, scale: 0.95 },
};

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  shortcutAction,
  position = 'top',
  delay = 300,
  trigger = 'hover',
  hideAfter,
  className,
}) => {
  const [renderState, setRenderState] = useState<'hidden' | 'measuring' | 'visible'>('hidden');
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState(position);
  const [isMobile, setIsMobile] = useState(false);

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawShortcut = useShortcutStore((state) =>
    shortcutAction ? state.shortcuts[shortcutAction] : null,
  );
  const formattedShortcut = rawShortcut ? formatShortcut(rawShortcut) : null;

  // Отслеживаем мобилку
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
  const handleMouseEnter = () => {
    if (trigger === 'click' || isMobile) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setRenderState('measuring'), delay);
  };

  const handleMouseLeave = () => {
    if (trigger === 'click' || isMobile) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRenderState('hidden');
  };

  const handleClick = () => {
    if (trigger !== 'click') return;

    if (renderState === 'visible' || renderState === 'measuring') {
      setRenderState('hidden');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      setRenderState('measuring');
      if (hideAfter) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setRenderState('hidden');
        }, hideAfter);
      }
    }
  };

  // Закрытие при клике ВНЕ тултипа (если это click-поповер)
  useEffect(() => {
    if (renderState !== 'visible' || trigger !== 'click') return;
    const handleDocClick = (e: MouseEvent | TouchEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !tooltipRef.current?.contains(e.target as Node)
      ) {
        setRenderState('hidden');
      }
    };
    document.addEventListener('touchstart', handleDocClick);
    document.addEventListener('mousedown', handleDocClick);
    return () => {
      document.removeEventListener('touchstart', handleDocClick);
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [renderState, trigger]);

  // Скрытие при скролле (чтобы тултип не "отрывался")
  useEffect(() => {
    if (renderState === 'hidden') return;
    const handleScrollOrResize = () => setRenderState('hidden');
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [renderState]);

  // --- УМНОЕ ПОЗИЦИОНИРОВАНИЕ ---
  useLayoutEffect(() => {
    if (renderState === 'measuring' && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const padding = 12; // Безопасное расстояние от краев экрана
      const gap = 8; // Отступ от элемента до тултипа

      let x = 0;
      let y = 0;
      let finalPlacement = position;

      switch (position) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.top - tooltipRect.height - gap;
          if (y < padding) {
            finalPlacement = 'bottom';
            y = triggerRect.bottom + gap;
          }
          break;
        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.bottom + gap;
          if (y + tooltipRect.height > viewportHeight - padding) {
            finalPlacement = 'top';
            y = triggerRect.top - tooltipRect.height - gap;
          }
          break;
        case 'left':
          x = triggerRect.left - tooltipRect.width - gap;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          if (x < padding) {
            finalPlacement = 'right';
            x = triggerRect.right + gap;
          }
          break;
        case 'right':
          x = triggerRect.right + gap;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          if (x + tooltipRect.width > viewportWidth - padding) {
            finalPlacement = 'left';
            x = triggerRect.left - tooltipRect.width - gap;
          }
          break;
      }

      // Клемпим (жестко привязываем) по вторичной оси к границам экрана
      if (finalPlacement === 'top' || finalPlacement === 'bottom') {
        x = Math.max(padding, Math.min(x, viewportWidth - tooltipRect.width - padding));
      } else {
        y = Math.max(padding, Math.min(y, viewportHeight - tooltipRect.height - padding));
      }

      setCoords({ x, y });
      setPlacement(finalPlacement);
      setRenderState('visible');
    }
  }, [renderState, position]);

  const innerContent = (
    <>
      {content}
      {formattedShortcut && (
        <span className="ml-1.5 text-[10px] opacity-50">{formattedShortcut}</span>
      )}
    </>
  );

  const baseTooltipClasses = cn(
    'flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium shadow-[0_4px_16px_rgba(0,0,0,0.5)]',
    'bg-[#1a0b22] text-[#f3f4f6]',
    className,
  );

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="inline-block"
      >
        {children}
      </span>

      {/* Теперь рендерим Portal на любых устройствах, если юзер активировал тултип */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {renderState === 'measuring' && (
              <div
                ref={tooltipRef}
                className={baseTooltipClasses}
                style={{ position: 'fixed', top: -9999, left: -9999, visibility: 'hidden' }}
              >
                {innerContent}
              </div>
            )}

            <AnimatePresence>
              {renderState === 'visible' && (
                <motion.div
                  initial={animationVariants[placement]}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={baseTooltipClasses}
                  style={{
                    position: 'fixed',
                    top: coords.y,
                    left: coords.x,
                    pointerEvents: 'none',
                    zIndex: 99999,
                  }}
                >
                  {innerContent}
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body,
        )}
    </>
  );
};
