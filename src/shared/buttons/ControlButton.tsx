import React from 'react';
import { cn } from '@/app/utils/cn';

interface ControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isActive?: boolean;
  innerClassName?: string;
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  isActive = true,
  className,
  innerClassName,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        'flex cursor-pointer items-center justify-center transition-all duration-150 outline-none',
        isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100',
        className,
      )}
      {...props}
    >
      <div className={cn('rounded-md bg-text text-surface', innerClassName)}>{icon}</div>
    </button>
  );
};
