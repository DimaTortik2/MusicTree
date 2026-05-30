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
        // Базовые стили трека: при наведении плавно увеличиваем высоту с h-1.5 до h-2
        'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface transition-all duration-150 outline-none [-webkit-appearance:none] hover:h-2',

        /* === ПОЛЗУНОК ДЛЯ CHROME / SAFARI === */
        '[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
        '[&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:shadow-md', // Всегда плотный сплошной цвет без прозрачности
        '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150', // Плавное увеличение размера

        // Масштабирование ползунка при наведении и нажатии
        'group-hover:[&::-webkit-slider-thumb]:scale-125',
        'hover:[&::-webkit-slider-thumb]:scale-125',
        'active:[&::-webkit-slider-thumb]:scale-110',

        /* === ПОЛЗУНОК ДЛЯ FIREFOX === */
        '[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none',
        '[&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:shadow-md', // Всегда плотный сплошной цвет без прозрачности
        '[&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150',

        'group-hover:[&::-moz-range-thumb]:scale-125',
        'hover:[&::-moz-range-thumb]:scale-125',
        'active:[&::-moz-range-thumb]:scale-110',

        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--color-text) 0%, var(--color-text) ${value}%, var(--color-surface) ${value}%, var(--color-surface) 100%)`,
        ...props.style,
      }}
    />
  );
};
