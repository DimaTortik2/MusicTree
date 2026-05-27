import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/app/utils/cn';

export interface ModalProps {
  /** Если true, модалка рендерится. Игнорируется, если inline={true} */
  isOpen?: boolean;
  /** Коллбек закрытия (на клик по фону или Esc) */
  onClose?: () => void;

  /**
   * 'vertical' - для центрированных модалок с кнопками внизу (скрины 3, 4, 5)
   * 'horizontal' - для баннеров/карточек (скрины 1, 2)
   */
  layout?: 'vertical' | 'horizontal';

  /** Если true, рендерится как обычный div, без портала и затемнения фона */
  inline?: boolean;

  /** Контент */
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode; // Для кастомного контента (например, инпутов)

  /** Только для layout="vertical": кнопки действий внизу */
  actions?: React.ReactNode;

  /** Только для layout="horizontal": иконка справа */
  icon?: React.ReactNode;
  /** Если передан, иконка обернется в кнопку */
  onIconClick?: () => void;
  /** Классы для контейнера иконки (чтобы задать цвет фона, ховеры) */
  iconContainerClassName?: string;

  /** Кастомные классы для главной карточки (bg-surface) */
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
  // Блокируем скролл и слушаем Esc для всплывающих модалок
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

  // Внутренняя структура карточки зависит от layout
  const CardContent = (
    <div
      className={cn(
        'flex w-full bg-surface transition-all duration-300',
        layout === 'vertical'
          ? 'max-w-2xl flex-col gap-6 rounded-[24px] p-6 sm:p-8' // Скрины 3,4,5
          : 'max-w-2xl flex-col items-start justify-center gap-5 rounded-xl p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0', // Скрины 1,2
        className,
      )}
      onClick={(e) => e.stopPropagation()} // Чтобы клик по карточке не закрывал модалку
    >
      {layout === 'horizontal' ? (
        // --- ГОРИЗОНТАЛЬНЫЙ ЛЕЙАУТ ---
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
        // --- ВЕРТИКАЛЬНЫЙ ЛЕЙАУТ ---
        <>
          <div className="flex flex-col gap-2">
            {title && (
              <h2 className="text-xl leading-snug font-medium text-text sm:text-2xl">{title}</h2>
            )}
            {description && (
              <div className="text-sm leading-relaxed text-text/60 sm:text-base">{description}</div>
            )}
          </div>

          {/* Для кастомных блоков (иконка с названием файла, инпут) */}
          {children && <div className="w-full">{children}</div>}

          {/* Кнопки внизу */}
          {actions && (
            <div className="mt-2 flex w-full flex-col-reverse gap-4 sm:flex-row sm:justify-center">
              {actions}
            </div>
          )}
        </>
      )}
    </div>
  );

  // Если inline, просто отдаем карточку (для встраивания в страницу)
  if (inline) {
    return CardContent;
  }

  // Если это настоящая модалка, рендерим через портал с фоном
  return createPortal(
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-200"
      onClick={onClose}
    >
      {CardContent}
    </div>,
    document.body,
  );
};
