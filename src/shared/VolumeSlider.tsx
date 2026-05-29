import React from 'react';
import { cn } from '@/app/utils/cn';

interface VolumeSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({ value, className, ...props }) => {
  return (
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onPointerUp={(e) => e.currentTarget.blur()}
      {...props}
      className={cn(
        'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface outline-none [-webkit-appearance:none]',
        '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow-md lg:[&::-webkit-slider-thumb]:size-4',
        '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:shadow-md lg:[&::-moz-range-thumb]:size-4',
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${value}%, var(--color-surface) ${value}%, var(--color-surface) 100%)`,
        ...props.style,
      }}
    />
  );
};
