import React from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  children?: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, className, children }) => {
  const bgColor = getAvatarColor(name);
  const initial = getInitial(name);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
        className,
      )}
      style={!src ? { backgroundColor: bgColor } : undefined}
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
