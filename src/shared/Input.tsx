import React, { forwardRef } from 'react';
import { cn } from '@/app/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'placeholder:text-text/30 w-full border-b-2 border-primary bg-transparent pb-2 text-lg font-medium text-text transition-colors outline-none',
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';
