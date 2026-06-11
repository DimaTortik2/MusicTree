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
  const [imgLoaded, setImgLoaded] = useState(false); // Следим за реальной загрузкой картинки
  const isFirstMount = useRef(true);
  const prevNameRef = useRef<string | undefined>(undefined);

  // Сбрасываем статус загрузки при изменении src
  useEffect(() => {
    setImgLoaded(false);
  }, [src]);

  useEffect(() => {
    if (!enableTypingEffect) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    if (prevNameRef.current === undefined) {
      prevNameRef.current = name;
      return;
    }

    if (prevNameRef.current !== name) {
      prevNameRef.current = name;
      setIsTyping(true);
    }

    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [name, enableTypingEffect]);

  const mergedStyle: React.CSSProperties = {
    // ВАЖНО: Если картинка загрузилась, делаем фон прозрачным.
    // Это полностью убирает цветной микро-зазор по краям круга.
    backgroundColor: src && imgLoaded ? 'transparent' : bgColor,
    transition: isTyping
      ? 'background-color 200ms ease-out, transform 200ms ease-out'
      : 'background-color 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    ...style,
  };

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
        // Трюк для Safari
        'mask-image-gpu [mask-image:radial-gradient(circle,white_100%,transparent_100%)]',
        className,
      )}
      style={mergedStyle}
    >
      {!src && enableTypingEffect && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity ease-in-out',
            isTyping ? 'opacity-100 duration-200' : 'opacity-0 duration-1000',
          )}
        >
          <div className="absolute inset-[-50%] translate-z-0 animate-[spin_5s_linear_infinite] bg-gradient-to-tr from-primary/70 via-accent/70 to-access-glow opacity-95 blur-xl will-change-transform" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65)_0%,transparent_70%)] mix-blend-overlay" />
          <div className="absolute inset-0 bg-white/15 mix-blend-overlay" />
        </div>
      )}

      {src ? (
        <img
          src={src}
          alt={name}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            'absolute inset-0 h-full w-full rounded-full object-cover',
            '[transform:translate3d(0,0,0)] [backface-visibility:hidden] backface-hidden',
            // Картинка плавно проявится, когда полностью загрузится
            'transition-opacity duration-300 ease-in-out',
            imgLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <span
          key={initial}
          className={cn(
            'ease-out-quint z-10 font-medium transition-all',
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
