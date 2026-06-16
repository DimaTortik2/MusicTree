import React, { useState, useEffect, useId } from 'react';
import QRCode from 'react-qr-code';
import { cn } from '@/app/utils/cn';

const GRADIENT_PAIRS = [
  { from: 'var(--primary)', to: 'var(--accent)' },
  { from: 'var(--accent)', to: 'var(--avatar-4)' },
  { from: 'var(--avatar-7)', to: 'var(--avatar-1)' },
];

const getRandomPair = (currentPair?: { from: string; to: string }) => {
  const available = currentPair
    ? GRADIENT_PAIRS.filter((pair) => pair.from !== currentPair.from || pair.to !== currentPair.to)
    : GRADIENT_PAIRS;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
};

export interface GradientQrCodeProps {
  value?: string | null;
  size?: number;
  className?: string;
}

export const GradientQrCode: React.FC<GradientQrCodeProps> = ({ value, size = 200, className }) => {
  const uniqueId = useId();
  const gradientElementId = `qr-gradient-${uniqueId}`;
  const filterId = `qr-rounded-filter-${uniqueId}`;

  const [colorPair, setColorPair] = useState(() => getRandomPair());
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    // 1. При монтировании (когда модалка или страница открывается)
    // ставим цвет без анимации. Даем браузеру 50ms на отрисовку.
    const transitionTimeout = setTimeout(() => {
      setEnableTransition(true);
    }, 50);

    // 2. Медленно меняем цвета
    const interval = setInterval(() => {
      setColorPair((current) => getRandomPair(current));
    }, 7000);

    return () => {
      clearTimeout(transitionTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={cn('relative mx-auto w-fit rounded-3xl bg-white p-5 shadow-inner', className)}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradientElementId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={colorPair.from}
              style={{ transition: enableTransition ? 'stop-color 1.5s ease-in-out' : 'none' }}
            />
            <stop
              offset="100%"
              stopColor={colorPair.to}
              style={{ transition: enableTransition ? 'stop-color 1.5s ease-in-out' : 'none' }}
            />
          </linearGradient>

          {/* Фильтр для эффекта жидкого скругления */}
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.3" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -11.5"
            />
          </filter>
        </defs>
      </svg>

      {/* Обертка с фильтром */}
      <div style={{ filter: `url(#${filterId})` }}>
        {value ? (
          <QRCode
            value={value}
            size={size}
            fgColor={`url(#${gradientElementId})`}
            bgColor="transparent"
          />
        ) : (
          <div
            className="animate-pulse rounded-2xl bg-text/10"
            style={{ width: size, height: size }}
          />
        )}
      </div>
    </div>
  );
};
