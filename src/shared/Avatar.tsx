import React from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  style?: React.CSSProperties; // Добавили поддержку стилей
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, className, style, children }) => {
  const bgColor = getAvatarColor(name);
  const initial = getInitial(name);

  // Смешиваем стили: внешний style имеет приоритет над авто-цветом bgColor
  const mergedStyle: React.CSSProperties = {
    ...(!src ? { backgroundColor: bgColor } : {}),
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
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium">{initial}</span>
      )}
      {children}
    </div>
  );
};
