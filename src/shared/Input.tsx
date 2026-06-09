import React, { forwardRef } from 'react';
import { cn } from '@/app/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full border-b-2 border-primary bg-transparent pb-2.5 text-xl font-medium text-text transition-colors outline-none placeholder:text-text/30',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
