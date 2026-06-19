import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Logo } from '@/pages/LandingPage/Logo';
import { Microphone } from '@/pages/LandingPage/Microphone';
import { PinkWave } from '@/pages/LandingPage/PinkWave';
import { Button } from '@/shared/buttons/Button';
import { useNavigate } from 'react-router-dom';
import { unlockAudioContext } from '@/shared/lib/audioEngine';
import { TreeWallpaper } from '@/wallpapers/TreeWallpaper';
import { useBlobTransition } from '@/app/store/useBlobTransition';

// Маска сглаживания для мягкого затухания краев свечения
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

// Маска шума (дизеринг)
const DITHER_NOISE =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E";

export function LandingPage() {
  const navigate = useNavigate();
  const { startTransition } = useBlobTransition();

  // Параллакс логика
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const translateX = useTransform(mouseX, [-1, 1], [20, -20]);
  const translateY = useTransform(mouseY, [-1, 1], [20, -20]);

  const springConfig = { damping: 30, stiffness: 50, mass: 0.5 };
  const springX = useSpring(translateX, springConfig);
  const springY = useSpring(translateY, springConfig);

  useEffect(() => {
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    if (!hasMouse) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const handleStart = async () => {
    // 1. Сначала разблокируем звук (взаимодействие пользователя!)
    await unlockAudioContext();

    // 2. Затем делаем редирект в приложение (на дерево)
    startTransition(() => {
      navigate('/app');
    });
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background font-sans text-text">
      {/* 🔴 СВЕЧЕНИЯ ПО КРАЯМ (Все 4 угла) */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {/* Верхнее левое свечение */}
        <div
          className="absolute top-0 left-0 size-[500px] -translate-x-1/3 -translate-y-1/3 transform-gpu rounded-full bg-primary will-change-[background-color] sm:size-[800px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />

        {/* Верхнее правое свечение */}
        <div
          className="absolute top-0 right-0 size-[500px] translate-x-1/3 -translate-y-1/3 transform-gpu rounded-full bg-primary will-change-[background-color] sm:size-[800px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />

        {/* Нижнее левое свечение */}
        <div
          className="absolute bottom-0 left-0 size-[600px] -translate-x-1/3 translate-y-1/3 transform-gpu rounded-full bg-primary will-change-[background-color] sm:size-[900px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />

        {/* Нижнее правое свечение */}
        <div
          className="absolute right-0 bottom-0 size-[600px] translate-x-1/3 translate-y-1/3 transform-gpu rounded-full bg-primary will-change-[background-color] sm:size-[900px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <motion.div style={{ x: springX, y: springY }} className="absolute h-[105%] w-[105%]">
          <TreeWallpaper className="h-full w-full object-cover text-text opacity-[0.03]" />
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.06] sm:opacity-[0.04]"
        style={{
          backgroundImage: `url("${DITHER_NOISE}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          imageRendering: 'pixelated',
        }}
      />

      <header className="absolute top-0 z-20 flex w-full justify-center px-4 pt-6 sm:pt-8">
        <p className="max-w-70 text-center text-[10px] leading-tight font-light tracking-wide text-text/40 sm:max-w-none sm:text-sm">
          Сервис является выполнением практической работы по программированию
        </p>
      </header>

      {/* Розовая волна */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <PinkWave className="h-full w-full scale-110 object-cover object-center sm:scale-100" />
      </div>

      {/* PC MIC */}
      <div className="pointer-events-none absolute right-0 bottom-0 z-10 hidden w-220 max-w-[18rem] translate-x-[5%] translate-y-[5%] sm:block md:max-w-[20rem] lg:max-w-100 xl:translate-x-0">
        <Microphone className="h-auto w-full" />
      </div>

      <main className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 pt-20 pb-10 sm:items-center">
        <div className="z-20 flex w-full flex-col items-center justify-center">
          <p className="mb-2 text-center text-xl font-light sm:mb-4 sm:text-left sm:text-3xl">
            Добро пожаловать на
          </p>
          <Logo className="mb-8 h-auto w-[85%] max-w-[320px] drop-shadow-sm sm:mb-12 sm:w-full sm:max-w-120" />
          {/* Mobile MIC */}
          <div className="relative -right-8 mb-10 flex max-w-[20rem] self-end sm:hidden">
            <Microphone className="h-auto w-[120%] rotate-[-20deg]" />
          </div>
          {/* Кнопка */}
          <Button onClick={handleStart} color="accent" variant="solid" size="lg">
            Начать
          </Button>
        </div>
        <footer className="absolute bottom-0 left-0 z-20 flex w-full justify-center gap-6 pb-6 text-xs text-[0.65rem] text-text/40 sm:pb-8 sm:text-sm">
          <button
            onClick={() => navigate('/terms')}
            className="cursor-pointer transition-colors hover:text-primary"
          >
            Условия использования
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="cursor-pointer transition-colors hover:text-primary"
          >
            Конфиденциальность
          </button>
        </footer>
      </main>
    </div>
  );
}
