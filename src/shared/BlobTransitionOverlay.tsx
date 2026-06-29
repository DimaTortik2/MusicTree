import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useAnimation } from 'framer-motion';
import type { TransitionDirection } from '@/app/store/useBlobTransition';
import { useBlobTransition } from '@/app/store/useBlobTransition';
import { cn } from '@/app/utils/cn';

type CustomAnimationControls = ReturnType<typeof useAnimation>;

const easeCurve: [number, number, number, number] = [0.76, 0, 0.24, 1];
const TRANSITION_DURATION = 0.55;
const LAYER_DELAY = 0.08;

const WaveVerticalSVG = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 1000 100"
    preserveAspectRatio="none"
    className={cn('block shrink-0 fill-current', className)}
    style={{ transform: 'translateZ(0)', willChange: 'transform' }} // 🔥 Хак для SVG
  >
    <path d="M 0 100 L 0 52 C 135 46, 210 78, 380 82 C 540 86, 615 32, 790 38 C 910 42, 955 58, 1000 54 L 1000 100 Z" />
  </svg>
);

const WaveHorizontalSVG = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 1000"
    preserveAspectRatio="none"
    className={cn('block shrink-0 fill-current', className)}
    style={{ transform: 'translateZ(0)', willChange: 'transform' }} // 🔥 Хак для SVG
  >
    <path d="M 100 0 L 52 0 C 46 135, 78 210, 82 380 C 86 540, 32 615, 38 790 C 42 910, 58 955, 54 1000 L 100 1000 Z" />
  </svg>
);

const directionConfig: Record<
  TransitionDirection,
  { start: string; cover: string; end: string; isVertical: boolean }
> = {
  up: { isVertical: true, start: '100lvh', cover: '-20lvh', end: '-150lvh' },
  down: { isVertical: true, start: '-150lvh', cover: '-20lvh', end: '100lvh' },
  left: { isVertical: false, start: '100lvw', cover: '-20lvw', end: '-150lvw' },
  right: { isVertical: false, start: '-150lvw', cover: '-20lvw', end: '100lvw' },
};

const TransitionLayer = React.memo(
  ({
    conf,
    controls,
    colorClass,
    zIndex,
  }: {
    conf: (typeof directionConfig)[TransitionDirection];
    controls: CustomAnimationControls;
    colorClass: string;
    zIndex: string;
  }) => {
    const initialAxis = conf.isVertical
      ? { y: conf.start, x: 0, z: 0 }
      : { x: conf.start, y: 0, z: 0 };

    return (
      <motion.div
        className={cn(
          'fixed flex',
          zIndex,
          colorClass,
          conf.isVertical
            ? 'inset-x-0 top-0 h-[145lvh] w-full flex-col'
            : 'inset-y-0 left-0 h-full w-[145lvw] flex-row',
        )}
        initial={initialAxis}
        animate={controls}
        style={{
          willChange: 'transform',
          contain: 'strict',
          // 🔥 ХАК 1: Полностью отключаем просчет мыши/тачей для этих огромных слоев,
          // чтобы сэкономить ресурсы процессора на мобилках.
          pointerEvents: 'none',
          // 🔥 ХАК 2: Принудительное 3D-ускорение (выделяет слоям собственную память в GPU)
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          WebkitPerspective: 1000,
          perspective: 1000,
        }}
      >
        {conf.isVertical ? (
          <>
            <WaveVerticalSVG className="h-[20vh] w-full" />
            <div className="-mt-[2px] h-[105vh] w-full shrink-0 bg-current" />
            <WaveVerticalSVG className="-mt-[2px] h-[20vh] w-full -scale-y-100" />
          </>
        ) : (
          <>
            <WaveHorizontalSVG className="h-full w-[20vw]" />
            <div className="-ml-[2px] h-full w-[105vw] shrink-0 bg-current" />
            <WaveHorizontalSVG className="-ml-[2px] h-full w-[20vw] -scale-x-100" />
          </>
        )}
      </motion.div>
    );
  },
);

TransitionLayer.displayName = 'TransitionLayer';

export const BlobTransitionOverlay: React.FC = () => {
  const { isActive, callback, direction, clearTransition } = useBlobTransition();
  const controlsBack = useAnimation();
  const controlsFront = useAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isActive && callback && mounted) {
      const runSequence = async () => {
        const conf = directionConfig[direction];
        const animateAxis = (val: string) =>
          conf.isVertical ? { y: val, x: 0, z: 0 } : { x: val, y: 0, z: 0 };

        controlsBack.set(animateAxis(conf.start));
        controlsFront.set(animateAxis(conf.start));

        // 1. НАКАТЫВАНИЕ ВОЛН
        controlsBack.start({
          ...animateAxis(conf.cover),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve },
        });

        await controlsFront.start({
          ...animateAxis(conf.cover),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY },
        });

        // 🔥 Даем браузеру микросекунду "продохнуть" перед блокировкой потока
        await new Promise((r) => setTimeout(r, 10));

        // 2. СМЕНА СТРАНИЦЫ (Тут React начинает тяжело монтировать новые компоненты)
        callback();

        // 3. ПАУЗА НА МОНТИРОВАНИЕ
        await new Promise((r) => setTimeout(r, 100));

        // 🔥 ХАК 3: МАГИЯ ДВОЙНОГО rAF.
        // Этот паттерн заставит движок JS дождаться, пока GPU мобильного телефона
        // ПОЛНОСТЬЮ отрисует (Paint) новую загруженную страницу на фоне.
        // Если этого не сделать, анимация ухода волн наложится на рендер страницы и будет 30 FPS.
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });

        // 4. УХОД ВОЛН (теперь браузер свободен и может выдать чистые 60/120 FPS)
        controlsFront.start({
          ...animateAxis(conf.end),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve },
        });

        await controlsBack.start({
          ...animateAxis(conf.end),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY },
        });

        // 5. ОЧИСТКА ВНЕ ЦИКЛА АНИМАЦИИ
        setTimeout(() => {
          controlsBack.set(animateAxis(conf.start));
          controlsFront.set(animateAxis(conf.start));
          clearTransition();
        }, 50);
      };

      runSequence();
    }
  }, [isActive, callback, direction, controlsBack, controlsFront, clearTransition, mounted]);

  if (!mounted) return null;

  const conf = directionConfig[direction];

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[999999]',
        isActive ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      style={{
        contain: 'strict',
        // Запрещаем мобильным браузерам скрывать слой или пересчитывать его
        WebkitBackfaceVisibility: 'hidden',
      }}
    >
      <TransitionLayer
        conf={conf}
        controls={controlsBack}
        zIndex="z-[999998]"
        colorClass="text-accent"
      />
      <TransitionLayer
        conf={conf}
        controls={controlsFront}
        zIndex="z-[999999]"
        colorClass="text-surface"
      />
    </div>,
    document.body,
  );
};
