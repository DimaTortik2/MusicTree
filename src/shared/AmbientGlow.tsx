import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useProgressStore } from '@/app/store/useProgressStore';

const DITHER_NOISE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E";

const SCRIM_MASK = `radial-gradient(
  closest-side,
  rgba(0,0,0,1) 0%,
  rgba(0,0,0,0.738) 19%,
  rgba(0,0,0,0.541) 34%,
  rgba(0,0,0,0.382) 47%,
  rgba(0,0,0,0.278) 56.5%,
  rgba(0,0,0,0.194) 65%,
  rgba(0,0,0,0.126) 73%,
  rgba(0,0,0,0.075) 80.2%,
  rgba(0,0,0,0.042) 86.1%,
  rgba(0,0,0,0.021) 91%,
  rgba(0,0,0,0.008) 95.2%,
  rgba(0,0,0,0.002) 98.2%,
  transparent 100%
)`;

const GLOW_CONFIG: Record<string, { top: string; bottom: string }> = {
  '/app/tree': { top: 'var(--accent)', bottom: 'var(--primary)' },
  '/app/current/lecture': { top: 'var(--primary)', bottom: 'var(--access-glow)' },
  '/app/chains': { top: 'var(--text)', bottom: 'var(--homework-glow)' },
  '/app/homeworks': { top: 'var(--homework-glow)', bottom: 'var(--accent)' },
  '/app/tests': { top: 'var(--accent)', bottom: 'var(--access-glow)' },
  '/app/exam': { top: 'var(--primary)', bottom: 'var(--homework-glow)' },
  '/app/mic': { top: 'var(--primary)', bottom: 'var(--primary)' },
  '/app/settings': { top: 'var(--accent)', bottom: 'var(--text)' },
};

const DEFAULT_GLOW = { top: 'var(--accent)', bottom: 'var(--primary)' };

export const AmbientGlow = () => {
  const { pathname } = useLocation();
  const { enableAmbientGlow } = useProgressStore();

  const activeColors = useMemo(() => {
    const match = Object.keys(GLOW_CONFIG).find((route) => pathname.includes(route));
    return match ? GLOW_CONFIG[match] : DEFAULT_GLOW;
  }, [pathname]);

  if (!enableAmbientGlow) return null;

  return (
    <>
      {/* 🔵 СЛОЙ 1: СВЕЧЕНИЕ (Увеличен размер, центры ушли в углы на 1/2, opacity снижена) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Верхнее левое */}
        <motion.div
          initial={false}
          animate={{ backgroundColor: activeColors.top }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute top-0 left-0 size-[800px] -translate-x-1/2 -translate-y-1/2 transform-gpu rounded-full opacity-[0.07] will-change-[background-color] md:size-[1000px]"
          style={{ maskImage: SCRIM_MASK, WebkitMaskImage: SCRIM_MASK }}
        />

        {/* Нижнее правое */}
        <motion.div
          initial={false}
          animate={{ backgroundColor: activeColors.bottom }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute right-0 bottom-0 size-[1000px] translate-x-1/2 translate-y-1/2 transform-gpu rounded-full opacity-[0.07] will-change-[background-color] md:size-[1200px]"
          style={{ maskImage: SCRIM_MASK, WebkitMaskImage: SCRIM_MASK }}
        />
      </div>

      {/* 🪄 СЛОЙ 3: ШУМ (Поверх обоев) */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.06] sm:opacity-[0.04]"
        style={{
          backgroundImage: `url("${DITHER_NOISE}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          imageRendering: 'pixelated',
        }}
      />
    </>
  );
};
