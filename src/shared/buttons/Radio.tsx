import React from 'react';
import { cn } from '@/app/utils/cn';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, containerClassName, label, description, children, ...props }, ref) => {
    const isComplex = Boolean(description || children);

    return (
      <label
        className={cn(
          'group relative flex cursor-pointer transition-opacity outline-none select-none',
          props.disabled && 'cursor-not-allowed opacity-50',
          isComplex ? 'items-start gap-3' : 'items-center gap-2.5',
          containerClassName,
        )}
      >
        {/* Контейнер для кастомного кружка */}
        <div
          className={cn(
            'relative flex size-5 shrink-0 items-center justify-center',
            isComplex && 'mt-[3px]',
          )}
        >
          {/* Скрытый нативный инпут */}
          <input type="radio" className="peer sr-only" ref={ref} {...props} />

          {/* Внешнее кольцо. Убрали лишний flex (оно пустое, он тут не нужен) */}
          <div className="size-full rounded-full border-[3px] border-text/30 bg-transparent transition-all duration-200 ease-out group-hover:border-primary/60 peer-checked:border-primary peer-checked:group-hover:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background" />

          {/* Внутренняя точка. 
              ДОБАВЛЕНО: inset-0 m-auto 
              Это (top:0, bottom:0, left:0, right:0, margin: auto) заставляет браузер 
              идеально ровно считать центрирование даже при 110%, 125% зуме. 
          */}
          <div className="pointer-events-none absolute inset-0 m-auto size-2 scale-0 rounded-full bg-primary transition-transform duration-200 ease-out peer-checked:scale-100" />
        </div>

        {/* Текстовый блок */}
        {(label || description || children) && (
          <div className={cn('flex flex-col', className)}>
            {label && <span className="text-base text-text">{label}</span>}
            {description && (
              <span className="mt-0.5 text-sm leading-tight text-text/40">{description}</span>
            )}
            {children}
          </div>
        )}
      </label>
    );
  },
);

Radio.displayName = 'Radio';
