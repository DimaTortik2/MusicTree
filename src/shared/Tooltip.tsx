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
  className,
}) => {
  const [renderState, setRenderState] = useState<'hidden' | 'measuring' | 'visible'>('hidden');
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState(position);

  // Состояние мобильного устройства, аналогичное AppLayout
  const [isMobile, setIsMobile] = useState(false);

  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rawShortcut = useShortcutStore((state) =>
    shortcutAction ? state.shortcuts[shortcutAction] : null,
  );

  const formattedShortcut = rawShortcut ? formatShortcut(rawShortcut) : null;

  // Отслеживаем размер экрана
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Инициализация при маунте
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return; // Игнорируем на мобилках
    timeoutRef.current = setTimeout(() => setRenderState('measuring'), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRenderState('hidden');
  };

  // Прячем тултип при скролле и ресайзе, чтобы он не отрывался
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

  // УМНОЕ ПОЗИЦИОНИРОВАНИЕ
  useLayoutEffect(() => {
    if (isMobile) return; // На мобилке расчеты не требуются

    if (renderState === 'measuring' && tooltipRef.current && triggerRef.current) {
      const trigger = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();

      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;

      const padding = 12; // Безопасное расстояние от краев экрана
      const gap = 8; // Отступ от элемента до тултипа

      let x = 0;
      let y = 0;
      let finalPlacement = position;

      // 1. Считаем идеальную позицию и отзеркаливаем при перекрытии
      switch (position) {
        case 'top':
          x = trigger.left + trigger.width / 2 - tooltip.width / 2;
          y = trigger.top - tooltip.height - gap;
          if (y < padding) {
            finalPlacement = 'bottom';
            y = trigger.bottom + gap;
          }
          break;
        case 'bottom':
          x = trigger.left + trigger.width / 2 - tooltip.width / 2;
          y = trigger.bottom + gap;
          if (y + tooltip.height > viewportHeight - padding) {
            finalPlacement = 'top';
            y = trigger.top - tooltip.height - gap;
          }
          break;
        case 'left':
          x = trigger.left - tooltip.width - gap;
          y = trigger.top + trigger.height / 2 - tooltip.height / 2;
          if (x < padding) {
            finalPlacement = 'right';
            x = trigger.right + gap;
          }
          break;
        case 'right':
          x = trigger.right + gap;
          y = trigger.top + trigger.height / 2 - tooltip.height / 2;
          if (x + tooltip.width > viewportWidth - padding) {
            finalPlacement = 'left';
            x = trigger.left - tooltip.width - gap;
          }
          break;
      }

      // 2. Жестко привязываем (клемпим) по вторичной оси к границам вьюпорта
      if (finalPlacement === 'top' || finalPlacement === 'bottom') {
        x = Math.max(padding, Math.min(x, viewportWidth - tooltip.width - padding));
      } else {
        y = Math.max(padding, Math.min(y, viewportHeight - tooltip.height - padding));
      }

      setCoords({ x, y });
      setPlacement(finalPlacement);
      setRenderState('visible');
    }
  }, [renderState, position, isMobile]);

  // Единая верстка внутренностей
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
        className="inline-block"
      >
        {children}
      </span>

      {typeof document !== 'undefined' &&
        !isMobile &&
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
