import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  lqip?: string | null; // <-- Новая пропса для Base64 превью
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  enableTypingEffect?: boolean;
}

export const Avatar: React.FC<AvatarProps> = React.memo(
  ({ name, src, lqip, className, style, children, enableTypingEffect = false }) => {
    const bgColor = getAvatarColor(name);
    const initial = getInitial(name);

    const [isTyping, setIsTyping] = useState(false);
    const [highResLoaded, setHighResLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const prevNameRef = useRef<string>(name);
    const isFirstMount = useRef(true);

    // Сброс при смене исходника
    useEffect(() => {
      setHighResLoaded(false);
      setHasError(false);
    }, [src]);

    // Анимация печати никнейма (оптимизирована, чтобы не дергать DOM зря)
    useEffect(() => {
      if (!enableTypingEffect) return;

      if (isFirstMount.current) {
        isFirstMount.current = false;
        return;
      }

      if (prevNameRef.current !== name) {
        prevNameRef.current = name;
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 450);
        return () => clearTimeout(timer);
      }
    }, [name, enableTypingEffect]);

    const showImageLayers = !!src && !hasError;
    // Если у нас нет картинки вообще ИЛИ включен эффект печати + мы печатаем
    const showSpinningGradient = enableTypingEffect && isTyping && !highResLoaded;

    return (
      <div
        className={cn(
          'relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
          className,
        )}
        style={{
          backgroundColor: highResLoaded ? 'transparent' : bgColor,
          transition: highResLoaded
            ? 'transform 200ms ease-out'
            : isTyping
              ? 'background-color 200ms ease-out, transform 200ms ease-out'
              : 'background-color 1000ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out',
          transform: 'translateZ(0)',
          ...style,
        }}
      >
        {/* СЛОЙ 1: Крутящийся брендовый градиент (активен только при наборе текста) */}
        {!highResLoaded && enableTypingEffect && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full transition-opacity ease-in-out',
              showSpinningGradient ? 'opacity-100 duration-200' : 'opacity-0 duration-1000',
            )}
          >
            <div className="absolute inset-[-50%] translate-z-0 animate-[spin_5s_linear_infinite] bg-gradient-to-tr from-primary/70 via-accent/70 to-access-glow opacity-95 blur-xl will-change-transform" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65)_0%,transparent_70%)] mix-blend-overlay" />
            <div className="absolute inset-0 bg-white/15 mix-blend-overlay" />
          </div>
        )}

        {/* СЛОЙ 2: Инициалы */}
        {!highResLoaded && (
          <span
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

        {/* СЛОЙ 3: Прогрессивные изображения (LQIP Base64 -> High Res) */}
        {showImageLayers && (
          <div className="absolute inset-0 z-20 h-full w-full overflow-hidden rounded-full bg-surface">
            {/* А. Мгновенный LQIP из Base64 */}
            {lqip && !highResLoaded && (
              <img
                src={lqip}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
                style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
              />
            )}

            {/* Б. Полноразмерное изображение */}
            <img
              src={src!}
              alt={name}
              decoding="async"
              loading="lazy" // Полезно для списков друзей
              onLoad={() => setHighResLoaded(true)}
              onError={() => setHasError(true)}
              className={cn(
                'absolute inset-0 h-full w-full scale-[1.01] object-cover transition-opacity duration-500 ease-out',
                highResLoaded ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
            />
          </div>
        )}

        {/* СЛОЙ 4: Оверлей (кнопки, иконки) */}
        {children && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center">
            {children}
          </div>
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar'; // Важно для React.memo
