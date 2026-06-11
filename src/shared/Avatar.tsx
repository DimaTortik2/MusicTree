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
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const isFirstMount = useRef(true);
  const prevNameRef = useRef<string | undefined>(undefined);

  // --- 1. Анимация печати ---
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

    const timer = setTimeout(() => setIsTyping(false), 450);
    return () => clearTimeout(timer);
  }, [name, enableTypingEffect]);

  // --- 2. Прелоадер ---
  useEffect(() => {
    if (!src) {
      setLoadedSrc(null);
      return;
    }

    if (src === loadedSrc) return;

    let isMounted = true;
    const img = new window.Image();
    img.src = src;

    img.onload = () => {
      if (isMounted) setLoadedSrc(src);
    };

    img.onerror = () => {
      if (isMounted) setLoadedSrc(null);
    };

    return () => {
      isMounted = false;
    };
  }, [src, loadedSrc]);

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white isolate',
        className
      )}
      style={{
        backgroundColor: loadedSrc ? 'transparent' : bgColor,
        // ВОТ ОН ФИКС: Если картинка есть, обрубаем транзишн фона. 
        // Иначе старый цвет будет 1000ms затухать под фото и светиться по краям!
        transition: loadedSrc 
          ? 'transform 200ms ease-out' 
          : isTyping
            ? 'background-color 200ms ease-out, transform 200ms ease-out'
            : 'background-color 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out',
        transform: 'translateZ(0)',
        ...style,
      }}
    >
      {/* СЛОЙ 1: Градиент при печати */}
      {!loadedSrc && enableTypingEffect && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full transition-opacity ease-in-out',
            isTyping ? 'opacity-100 duration-200' : 'opacity-0 duration-1000'
          )}
        >
          <div className="absolute inset-[-50%] translate-z-0 animate-[spin_5s_linear_infinite] bg-gradient-to-tr from-primary/70 via-accent/70 to-access-glow opacity-95 blur-xl will-change-transform" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65)_0%,transparent_70%)] mix-blend-overlay" />
          <div className="absolute inset-0 bg-white/15 mix-blend-overlay" />
        </div>
      )}

      {/* СЛОЙ 2: Инициалы */}
      {!loadedSrc && (
        <span
          key={initial}
          className={cn(
            'z-10 font-medium ease-out-quint transition-all',
            isTyping && enableTypingEffect
              ? 'scale-[0.96] text-white/90 opacity-85 duration-200'
              : 'scale-100 opacity-100 duration-600'
          )}
        >
          {initial}
        </span>
      )}

      {/* СЛОЙ 3: Фотография */}
      {loadedSrc && (
        <img
          key={loadedSrc}
          src={loadedSrc}
          alt={name}
          decoding="async"
          // scale-[1.01] - это хак, который делает картинку на 1% больше контейнера.
          // Он физически перекрывает пиксели сглаживания (anti-aliasing) по краям круга.
          className="absolute inset-0 z-20 h-full w-full object-cover scale-[1.01] [transform:translate3d(0,0,0)] [backface-visibility:hidden] backface-hidden"
        />
      )}

      {/* СЛОЙ 4: Оверлей (кнопки, иконки) */}
      {children && (
        <div className="absolute inset-0 z-30 pointer-events-auto flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};