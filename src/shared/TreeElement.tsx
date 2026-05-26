// src/shared/TreeElement.tsx
import React from 'react';
import { MicrophoneStage } from '@phosphor-icons/react';
import { cn } from '@/app/utils/cn';

export type TreeElementState = 'current' | 'completed' | 'ordinary';

export interface TreeElementProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: TreeElementState;
  // Теперь это может быть и строка (например, для CSS-единиц)
  iconSize?: number | string;
}

const stateStyles: Record<TreeElementState, string> = {
  current: 'border-primary hover:bg-primary',
  completed: 'border-accent hover:bg-accent',
  ordinary: 'border-transparent',
};

export const TreeElement = React.forwardRef<HTMLButtonElement, TreeElementProps>(
  ({ state = 'ordinary', iconSize, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          // Добавляем адаптивность: на мобилках размер h-14 w-14 (56px), на десктопе возвращаем h-20 w-20 (80px)
          'inline-flex items-center justify-center rounded-2xl border-4 bg-surface text-text/40 transition-all duration-200 hover:cursor-pointer hover:text-text',
          'h-14 w-14 sm:h-20 sm:w-20',
          stateStyles[state],
          className,
        )}
        {...props}
      >
        <MicrophoneStage
          // Если iconSize передан жестко — он отработает. Если нет — работают адаптивные классы.
          size={iconSize}
          className={cn(!iconSize && 'h-6 w-6 sm:h-9 sm:w-9')}
          weight="regular"
        />
      </button>
    );
  },
);
