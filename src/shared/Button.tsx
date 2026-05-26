// Переделаю на норм кнопку

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'solid',
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-[24px] px-20 py-5 text-xl font-normal text-white transition-all duration-200 select-none active:scale-[0.98] outline-none  focus-visible:ring-offset-background hover:cursor-pointer hover:scale-102';

  const variants = {
    solid: 'bg-[#5A4A13] hover:bg-[#6C5919]',
    outline: 'border-[5px] border-[#5A4A13] bg-[#110B18] hover:bg-[#1a1125]',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
