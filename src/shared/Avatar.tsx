import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/app/utils/cn';
import { getAvatarColor, getInitial, getOAuthLqipUrl } from '@/shared/utils/avatar';

const ANIMATION_CONFIG = {
  // Как часто меняется базовый цвет фона (в миллисекундах)
  colorCycleIntervalMs: 2500,

  // Плавность перетекания цвета фона, когда тогл ВКЛЮЧЕН (в мс)
  bgTransitionGradientMs: 500,

  // Плавность смены цвета при ручном НАБОРЕ текста (в мс)
  bgTransitionTypingMs: 200,

  // Плавность возврата цвета в спокойном состоянии (в мс)
  bgTransitionIdleMs: 200,

  // Скорость вращения градиентного пятна при НАБОРЕ текста
  spinDurationFast: '5s',

  // Скорость вращения градиентного пятна, когда тогл ВКЛЮЧЕН (фоновое)
  spinDurationSlow: '5s',
};

interface AvatarProps {
  name: string;
  src?: string | null;
  lqip?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  enableTypingEffect?: boolean;
  forceGradient?: boolean;
}

export const Avatar: React.FC<AvatarProps> = React.memo(
  ({
    name,
    src,
    lqip,
    className,
    style,
    children,
    enableTypingEffect = false,
    forceGradient = false,
  }) => {
    // Базовый цвет из хэша (меняется при вводе)
    const bgColorHash = getAvatarColor(name);
    const initial = getInitial(name);

    const [isTyping, setIsTyping] = useState(false);
    const [highResLoaded, setHighResLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Стейт для цикличного цвета
    const [autoColorIndex, setAutoColorIndex] = useState(1);

    const prevNameRef = useRef<string>(name);
    const isFirstMount = useRef(true);

    // Логика цикличного изменения цвета, когда включен тогл
    useEffect(() => {
      if (!forceGradient) return;
      const interval = setInterval(() => {
        // Переключаем цвета от 1 до 7
        setAutoColorIndex((prev) => (prev % 7) + 1);
      }, ANIMATION_CONFIG.colorCycleIntervalMs);

      return () => clearInterval(interval);
    }, [forceGradient]);

    useEffect(() => {
      setHighResLoaded(false);
      setHasError(false);
    }, [src]);

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

    const computedLqip = lqip || getOAuthLqipUrl(src);
    const hasValidSrc = !!src && !hasError;
    const showLqip = hasValidSrc && !!computedLqip && !highResLoaded;
    const showHighRes = hasValidSrc && highResLoaded;
    const showFallback = !showLqip && !showHighRes;

    const showSpinningGradient =
      (enableTypingEffect && isTyping && !showHighRes) || (forceGradient && !showHighRes);

    // Если тогл включен - берем цвет из цикла, иначе из хэша имени
    const currentBgColor = forceGradient ? `var(--avatar-${autoColorIndex})` : bgColorHash;

    return (
      <div
        className={cn(
          'relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full text-white',
          className,
        )}
        style={{
          // Подставляем вычисленный цвет
          backgroundColor: showFallback ? currentBgColor : 'transparent',
          // Используем константы для плавности перехода цвета
          transition: showHighRes
            ? 'transform 200ms ease-out'
            : isTyping
              ? `background-color ${ANIMATION_CONFIG.bgTransitionTypingMs}ms ease-out, transform 200ms ease-out`
              : forceGradient
                ? `background-color ${ANIMATION_CONFIG.bgTransitionGradientMs}ms linear, transform 200ms ease-out`
                : `background-color ${ANIMATION_CONFIG.bgTransitionIdleMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms ease-out`,
          transform: 'translateZ(0)',
          ...style,
        }}
      >
        {/* СЛОЙ 1: Крутящийся брендовый градиент */}
        {!showHighRes && (enableTypingEffect || forceGradient) && (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-full transition-opacity ease-in-out',
              showSpinningGradient ? 'opacity-100 duration-200' : 'opacity-0 duration-1000',
            )}
          >
            {/* Крутящееся пятно */}
            <div
              className={cn(
                'absolute inset-[-50%] translate-z-0 animate-spin bg-gradient-to-tr from-primary/70 via-accent/70 to-access-glow opacity-95 blur-xl will-change-transform',
              )}
              style={{
                // Динамическая смена скорости вращения
                animationDuration:
                  forceGradient && !isTyping
                    ? ANIMATION_CONFIG.spinDurationSlow
                    : ANIMATION_CONFIG.spinDurationFast,
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65)_0%,transparent_70%)] mix-blend-overlay" />
            <div className="absolute inset-0 bg-white/15 mix-blend-overlay" />
          </div>
        )}

        {/* СЛОЙ 2: Инициалы */}
        {showFallback && (
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

        {/* СЛОЙ 3: Изображения */}
        {hasValidSrc && (
          <div className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-hidden rounded-full">
            {showLqip && (
              <img
                src={computedLqip}
                alt=""
                className="absolute inset-0 h-full w-full object-cover blur-md"
                style={{
                  transform: 'scale(1.5) translateZ(0)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              />
            )}
            <img
              src={src}
              alt={name}
              decoding="async"
              loading="lazy"
              onLoad={() => setHighResLoaded(true)}
              onError={() => setHasError(true)}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out',
                highResLoaded ? 'opacity-100' : 'opacity-0',
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
