import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial, getOAuthLqipUrl } from '@/shared/utils/avatar';

interface AvatarProps {
  name: string;
  src?: string | null;
  lqip?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  enableTypingEffect?: boolean;
}

export const Avatar: React.FC<AvatarProps> = React.memo(
  ({ name, src, lqip, className, style, children, enableTypingEffect = false }) => {
    const bgColor = getAvatarColor(name);
    const initial = getInitial(name);

    const computedLqip = lqip || getOAuthLqipUrl(src);

    const [isTyping, setIsTyping] = useState(false);
    const [highResLoaded, setHighResLoaded] = useState(false);
    const [lqipLoaded, setLqipLoaded] = useState(!!computedLqip?.startsWith('data:'));
    const [hasError, setHasError] = useState(false);

    const prevNameRef = useRef<string>(name);
    const isFirstMount = useRef(true);

    useEffect(() => {
      setHighResLoaded(false);
      setHasError(false);
      setLqipLoaded(!!computedLqip?.startsWith('data:'));
    }, [src, computedLqip]);

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

    const hasValidSrc = !!src && !hasError;
    const showHighRes = hasValidSrc && highResLoaded;

    // Фолбэк (кружок с цветом и буквой) показываем ТОЛЬКО если у нас еще нет НИ ОДНОЙ картинки
    const showFallback = !hasValidSrc || (!lqipLoaded && !highResLoaded);

    const showSpinningGradient = enableTypingEffect && isTyping && !showHighRes;

    return (
      <div
        className={cn(
          'relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
          className,
        )}
        style={{
          // УБРАЛИ background-color ОТСЮДА! Больше никаких рамок по краям.
          transform: 'translateZ(0)',
          ...style,
        }}
      >
        {/* СЛОЙ 1: Крутящийся брендовый градиент */}
        {!showHighRes && enableTypingEffect && (
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

        {/* СЛОЙ 2: Фолбэк (Фон + Инициалы) */}
        {/* Как только картинка загрузится (даже мыльная), этот слой станет opacity-0 и рамка исчезнет */}
        <div
          className={cn(
            'absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-500 ease-out',
            showFallback ? 'opacity-100' : 'opacity-0',
          )}
          style={{ backgroundColor: bgColor }}
        >
          <span
            className={cn(
              'ease-out-quint font-medium transition-all',
              isTyping && enableTypingEffect
                ? 'scale-[0.96] text-white/90 opacity-85 duration-200'
                : 'scale-100 opacity-100 duration-600',
            )}
          >
            {initial}
          </span>
        </div>

        {/* СЛОЙ 3: Изображения */}
        {hasValidSrc && (
          <div className="pointer-events-none absolute inset-0 z-20 h-full w-full rounded-full">
            {/* А. Размытый превью (base64 или мини-URL) */}
            {!!computedLqip && (
              <img
                src={computedLqip}
                alt=""
                onLoad={() => setLqipLoaded(true)}
                className={cn(
                  'absolute inset-0 z-10 h-full w-full object-cover blur-md transition-opacity duration-300 ease-out',
                  lqipLoaded ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  transform: 'scale(1.5) translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              />
            )}

            {/* Б. Полноразмерное изображение */}
            <img
              src={src}
              alt={name}
              decoding="async"
              loading="lazy"
              onLoad={() => setHighResLoaded(true)}
              onError={() => setHasError(true)}
              className={cn(
                'absolute inset-0 z-20 h-full w-full object-cover transition-opacity duration-500 ease-out',
                showHighRes ? 'opacity-100' : 'opacity-0',
              )}
              style={{
                transform: 'scale(1.01) translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
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

Avatar.displayName = 'Avatar';
