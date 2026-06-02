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
      <div
        className={cn(
          'rounded-md transition-all duration-150',
          'flex shrink-0 items-center justify-center bg-text p-1.5 text-surface opacity-70 hover:opacity-100',
          '[.light_&]:block [.light_&]:p-0 [.light_&]:opacity-100',
          '[.light_&]:bg-text/10 [.light_&]:text-text [.light_&]:hover:bg-text/20',

          innerClassName,
        )}
      >
        {icon}
      </div>
    </button>
  );
};
