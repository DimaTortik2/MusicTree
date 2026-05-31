import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';

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

  if (!isOpen && !inline) return null;

  const CardContent = (
    <div
      className={cn(
        'flex w-full bg-surface transition-all duration-300',
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
                onIconClick && 'cursor-pointer text-white hover:scale-105 active:scale-95',
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
    </div>
  );

  if (inline) {
    return CardContent;
  }

  return createPortal(
    <div
      className="animate-in fade-in fixed inset-0 z-2000 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      {CardContent}
    </div>,
    document.body,
  );
};
