import React from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, className, style, children }) => {
  const bgColor = getAvatarColor(name);
  const initial = getInitial(name);

  const mergedStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    // Настраиваем раздельные тайминги:
    // Медленное, медитативное перетекание цвета (1.2 секунды)
    // и отзывчивый трансформ при взаимодействии (300 миллисекунд)
    transition:
      'background-color 1200ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...style,
  };

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
        className,
      )}
      style={mergedStyle}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="animate-in fade-in absolute inset-0 h-full w-full object-cover duration-300"
        />
      ) : (
        <span key={initial} className="animate-in fade-in font-medium duration-200">
          {initial}
        </span>
      )}
      {children}
    </div>
  );
};
