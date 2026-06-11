import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  enableTypingEffect?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  className,
  style,
  children,
  enableTypingEffect = false,
}) => {
  const bgColor = getAvatarColor(name);
  const initial = getInitial(name);

  const [isTyping, setIsTyping] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!enableTypingEffect) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setIsTyping(true);

    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [name, enableTypingEffect]);

  const mergedStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    transition: isTyping
      ? 'background-color 200ms ease-out, transform 200ms ease-out'
      : 'background-color 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out',
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
      {!src && enableTypingEffect && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity ease-in-out',
            // ДИНАМИЧЕСКИЕ ТАЙМИНГИ:
            isTyping
              ? 'opacity-100 duration-200' // Быстрый вход (200ms)
              : 'opacity-0 duration-1000', // Очень плавное "таяние" градиента (1 секунда!)
          )}
        >
          {/* Вращающийся градиент */}
          <div className="absolute inset-[-50%] translate-z-0 animate-[spin_5s_linear_infinite] bg-gradient-to-tr from-primary/70 via-accent/70 to-access-glow opacity-95 blur-xl will-change-transform" />

          {/* Центральный белый блик */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65)_0%,transparent_70%)] mix-blend-overlay" />

          {/* Легкая подложка */}
          <div className="absolute inset-0 bg-white/15 mix-blend-overlay" />
        </div>
      )}

      {src ? (
        <img
          src={src}
          alt={name}
          className="animate-in fade-in absolute inset-0 h-full w-full object-cover duration-200"
        />
      ) : (
        <span
          key={initial}
          className={cn(
            'ease-out-quint z-10 font-medium transition-all',
            // Буква возвращается в исходное состояние так же мягко (600ms)
            isTyping && enableTypingEffect
              ? 'scale-[0.96] text-white/90 opacity-85 duration-200'
              : 'scale-100 opacity-100 duration-600',
          )}
        >
          {initial}
        </span>
      )}
      {children}
    </div>
  );
};
