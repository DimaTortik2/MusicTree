// src/shared/TreeElement.tsx
import React from 'react';
import { MicrophoneStage } from '@phosphor-icons/react';
import { cn } from '@/app/utils/cn';

export type TreeElementState = 'current' | 'completed' | 'ordinary' | 'locked' | 'current_completed';

export interface TreeElementProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: TreeElementState;
  iconSize?: number | string;
}

const stateStyles: Record<TreeElementState, string> = {
  current: 'border-primary hover:bg-primary',
  completed: 'border-accent hover:bg-accent',
  ordinary: 'border-transparent',
  locked: 'border-text/10 text-text/10',
  current_completed: 'border-accent hover:bg-accent',
};

export const TreeElement = React.forwardRef<HTMLButtonElement, TreeElementProps>(
  ({ state = 'ordinary', iconSize, className, ...props }, ref) => {
    return (
      <button
        disabled={state === 'locked'}
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-2xl border-4 bg-surface text-text/40 transition-all duration-200 hover:cursor-pointer hover:text-text',
          state !== 'locked'
            ? 'cursor-pointer hover:scale-105 active:scale-95'
            : 'pointer-events-none',
          'h-14 w-14 sm:h-20 sm:w-20',
          stateStyles[state],
          className,
        )}
        {...props}
      >
        <MicrophoneStage
          size={iconSize}
          className={cn(!iconSize && 'h-6 w-6 sm:h-9 sm:w-9')}
          weight="regular"
        />
      </button>
    );
  },
);
