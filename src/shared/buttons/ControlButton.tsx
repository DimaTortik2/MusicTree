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
      {/* ИСПРАВЛЕНО: Полупрозрачный фон, который мягко реагирует на наведение в обеих темах */}
      <div
        className={cn(
          'rounded-md bg-text/10 text-text transition-colors hover:bg-text/20',
          innerClassName,
        )}
      >
        {icon}
      </div>
    </button>
  );
};
