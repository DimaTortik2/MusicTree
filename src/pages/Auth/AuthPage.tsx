import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { RegisterForm } from '@/pages/Auth/RegisterForm';
import { Microphone } from '@/pages/LandingPage/Microphone';
import { TreeWallpaper } from '@/wallpapers/TreeWallpaper';

// Маска сглаживания и шум
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

export const AuthPage = () => {
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

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-background font-sans text-text">
      {/* 🔴 СЛОЙ 1: СТАТИЧЕСКОЕ СВЕЧЕНИЕ (В правых краях, цвет primary) */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        {/* Верхнее правое свечение */}
        <div
          className="absolute top-0 right-0 size-[800px] translate-x-1/2 -translate-y-1/2 transform-gpu rounded-full bg-primary will-change-[background-color] md:size-[1000px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />

        {/* Нижнее правое свечение */}
        <div
          className="absolute right-0 bottom-0 size-[1000px] translate-x-1/2 translate-y-1/2 transform-gpu rounded-full bg-primary will-change-[background-color] md:size-[1200px]"
          style={{
            maskImage: SCRIM_MASK,
            WebkitMaskImage: SCRIM_MASK,
            opacity: 'var(--glow-opacity)',
            mixBlendMode: 'var(--glow-blend)' as any,
          }}
        />
      </div>

      {/* 🌲 СЛОЙ 2: ОБОИ С ПАРАЛЛАКСОМ И ОТРАЖЕНИЕМ */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <motion.div style={{ x: springX, y: springY }} className="absolute h-[105%] w-[105%]">
          {/* scale-x-[-1] зеркально отражает SVG по горизонтали */}
          <TreeWallpaper className="h-full w-full scale-x-[-1] object-cover text-text opacity-[0.03]" />
        </motion.div>
      </div>

      {/* 🪄 СЛОЙ 3: ДИЗЕРИНГ-ШУМ (Поверх обоев) */}
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.06] sm:opacity-[0.04]"
        style={{
          backgroundImage: `url("${DITHER_NOISE}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          imageRendering: 'pixelated',
        }}
      />

      {/* Левая панель с формой (активируется во весь экран на экранах <= 767px благодаря md:) */}
      <div className="relative z-20 flex w-full flex-col bg-surface p-6 sm:p-12 md:w-[480px] xl:w-[540px]">
        <RegisterForm />
      </div>

      {/* Правая часть с микрофоном (скрывается на мобильных <= 767px благодаря md:flex) */}
      <div className="relative z-10 hidden flex-1 items-end justify-end overflow-hidden md:flex">
        {/* Опциональное легкое свечение на фоне */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-surface),_transparent_70%)] opacity-20"></div>

        {/* Микрофон */}
        <div className="pointer-events-none absolute right-0 bottom-0 z-10 w-120 max-w-[400px] translate-x-[15%] translate-y-[10%] xl:max-w-[700px]">
          <Microphone className="h-auto w-full text-primary" />
        </div>
      </div>
    </div>
  );
};
