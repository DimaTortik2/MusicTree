import { cn } from '@/app/utils/cn';
import React from 'react';

export type ButtonVariant = 'solid' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonColor = 'primary' | 'accent' | 'homework' | 'access' | 'text';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  children: React.ReactNode;
}

// Базовые стили: анимации, фокусы, стейты (убрал лишние цвета отсюда)
const baseStyles =
  'inline-flex items-center justify-center font-normal transition-all duration-200 select-none active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:cursor-pointer hover:scale-102';

// Размеры: бордер задаем ВСЕМ кнопкам, чтобы при переключении solid <-> outline
// кнопка не дергалась в размерах на 5 пикселей.
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-6 py-2.5 text-sm rounded-[14px] border-2',
  md: 'px-10 py-3.5 text-base rounded-[16px] border-[3px]',
  lg: 'px-20 py-5 text-xl rounded-[24px] border-[5px]', // Твой оригинальный размер
};

// Матрица цветов и вариантов
const colorStyles: Record<ButtonVariant, Record<ButtonColor, string>> = {
  solid: {
    primary: 'bg-primary border-primary text-white hover:bg-primary hover:border-primary',
    accent: 'bg-accent border-accent text-white hover:bg-accent hover:border-accent',
    homework: 'bg-homework border-homework text-white hover:bg-homework hover:border-homework',
    access: 'bg-access border-access text-white hover:bg-access hover:border-access',
    text: 'bg-text border-text text-surface hover:bg-text hover:border-text',
  },
  outline: {
    // Outline прозрачный, при наведении заливается цветом
    primary: 'bg-surface border-primary text-white hover:bg-primary',
    accent: 'bg-surface border-accent text-white hover:bg-accent',
    homework: 'bg-surface border-homework text-white hover:bg-homework',
    access: 'bg-surface border-access text-white hover:bg-access',
    text: 'bg-surface border-text text-white hover:bg-text hover:text-surface',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'outline',
  size = 'md',
  color = 'primary', // Твой старый цвет по умолчанию
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(baseStyles, sizeStyles[size], colorStyles[variant][color], className)}
      {...props}
    >
      {children}
    </button>
  );
};
