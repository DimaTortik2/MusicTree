import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export interface ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  layout?: 'vertical' | 'horizontal';
  inline?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  onIconClick?: () => void;
  iconContainerClassName?: string;
  className?: string;
}

// Премиальный микро-скейл и микро-сдвиг без лишнего «скакания»
const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
    y: 8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 380, // Быстрый старт
      damping: 30, // Полное гашение отскока (никакого дрожания)
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 6,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const Modal: React.FC<ModalProps> = ({
  isOpen = true,
  onClose,
  layout = 'vertical',
  inline = false,
  title,
  description,
  children,
  actions,
  icon,
  onIconClick,
  iconContainerClassName,
  className,
}) => {
  // Реф для отслеживания старта клика
  const isMouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (inline || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, inline, onClose]);

  const CardContent = (
    <motion.div
      variants={inline ? undefined : cardVariants}
      initial={inline ? undefined : 'hidden'}
      animate={inline ? undefined : 'visible'}
      exit={inline ? undefined : 'exit'}
      className={cn(
        // Оставляем transition-colors для смены тем, убрав конфликтующий transition-all
        'flex w-full bg-surface transition-colors duration-300',
        layout === 'vertical'
          ? 'max-w-2xl flex-col gap-6 rounded-[24px] p-6 sm:p-8'
          : 'max-w-2xl flex-col items-start justify-center gap-5 rounded-xl p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {layout === 'horizontal' ? (
        <>
          <div className="flex flex-col items-start gap-1 pr-6">
            {title && <h2 className="text-start text-base font-medium text-text">{title}</h2>}
            {description && <div className="text-start text-sm text-text/40">{description}</div>}
            {children}
          </div>

          {icon && (
            <div
              onClick={onIconClick}
              className={cn(
                'flex size-14 shrink-0 items-center justify-center self-end rounded-2xl transition-transform sm:size-16 sm:self-auto',
                onIconClick && 'cursor-pointer text-text hover:scale-105 active:scale-95',
                iconContainerClassName,
              )}
            >
              {icon}
            </div>
          )}
        </>
      ) : (
        <>
          {(title || description) && (
            <div className="flex flex-col gap-2">
              {title && (
                <h2 className="text-xl leading-snug font-medium text-text sm:text-2xl">{title}</h2>
              )}
              {description && (
                <div className="text-sm leading-relaxed text-text/60 sm:text-base">
                  {description}
                </div>
              )}
            </div>
          )}

          {children && <div className="w-full">{children}</div>}

          {actions && (
            <div className="mt-2 flex w-full flex-col-reverse gap-4 sm:flex-row sm:justify-center">
              {actions}
            </div>
          )}
        </>
      )}
    </motion.div>
  );

  if (inline) {
    return CardContent;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-2000 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            // Запоминаем, что мышку нажали ИМЕННО на фоне, а не внутри карточки
            isMouseDownOnBackdrop.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            // Закрываем, только если и начали клик на фоне, и закончили на фоне
            if (isMouseDownOnBackdrop.current && e.target === e.currentTarget) {
              onClose?.();
            }
            // Сбрасываем стейт клика
            isMouseDownOnBackdrop.current = false;
          }}
        >
          {CardContent}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
