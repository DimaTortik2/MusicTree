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
    className={cn('block fill-current', className)}
  >
    <path d="M 0 100 L 0 52 C 135 46, 210 78, 380 82 C 540 86, 615 32, 790 38 C 910 42, 955 58, 1000 54 L 1000 100 Z" />
  </svg>
);

const WaveHorizontalSVG = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 1000"
    preserveAspectRatio="none"
    className={cn('block fill-current', className)}
  >
    <path d="M 100 0 L 52 0 C 46 135, 78 210, 82 380 C 86 540, 32 615, 38 790 C 42 910, 58 955, 54 1000 L 100 1000 Z" />
  </svg>
);

const directionConfig: Record<
  TransitionDirection,
  { start: string; cover: string; end: string; isVertical: boolean }
> = {
  up: { isVertical: true, start: '100vh', cover: '-20vh', end: '-150vh' },
  down: { isVertical: true, start: '-150vh', cover: '-20vh', end: '100vh' },
  left: { isVertical: false, start: '100vw', cover: '-20vw', end: '-150vw' },
  right: { isVertical: false, start: '-150vw', cover: '-20vw', end: '100vw' },
};

const TransitionLayer = ({
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
  const initialAxis = conf.isVertical ? { y: conf.start, x: 0 } : { x: conf.start, y: 0 };

  return (
    <motion.div
      className={cn(
        'fixed flex',
        zIndex,
        colorClass,
        conf.isVertical
          ? 'inset-x-0 top-0 h-[145vh] w-full flex-col'
          : 'inset-y-0 left-0 h-full w-[145vw] flex-row',
      )}
      initial={initialAxis}
      animate={controls}
    >
      {conf.isVertical ? (
        <>
          <WaveVerticalSVG className="h-[20vh] w-full" />
          <div className="-mt-[2px] h-[105vh] w-full bg-current" />
          <WaveVerticalSVG className="-mt-[2px] h-[20vh] w-full -scale-y-100" />
        </>
      ) : (
        <>
          <WaveHorizontalSVG className="h-full w-[20vw]" />
          <div className="-ml-[2px] h-full w-[105vw] bg-current" />
          <WaveHorizontalSVG className="-ml-[2px] h-full w-[20vw] -scale-x-100" />
        </>
      )}
    </motion.div>
  );
};

export const BlobTransitionOverlay: React.FC = () => {
  const { isActive, callback, direction, clearTransition } = useBlobTransition();

  // Создаем ТРИ контроллера
  const controlsBack = useAnimation();
  const controlsMid = useAnimation();
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
          conf.isVertical ? { y: val, x: 0 } : { x: val, y: 0 };

        // 0. Сброс позиций
        controlsBack.set(animateAxis(conf.start));
        controlsMid.set(animateAxis(conf.start));
        controlsFront.set(animateAxis(conf.start));

        // 1. НАКАТЫВАНИЕ ВОЛН (Back -> Mid -> Front)
        controlsBack.start({
          ...animateAxis(conf.cover),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve }, // delay: 0
        });

        controlsMid.start({
          ...animateAxis(conf.cover),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY },
        });

        // Ждем завершения самого долгого (последнего) слоя
        await controlsFront.start({
          ...animateAxis(conf.cover),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY * 2 },
        });

        // 2. Смена страницы
        callback();

        // 3. Микропауза
        await new Promise((r) => setTimeout(r, 100));

        // 4. УХОД ВОЛН (Front -> Mid -> Back)
        // Теперь передний уходит первым, оголяя остальные
        controlsFront.start({
          ...animateAxis(conf.end),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve }, // delay: 0
        });

        controlsMid.start({
          ...animateAxis(conf.end),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY },
        });

        // Снова ждем завершения самого долгого слоя
        await controlsBack.start({
          ...animateAxis(conf.end),
          transition: { duration: TRANSITION_DURATION, ease: easeCurve, delay: LAYER_DELAY * 2 },
        });

        // 5. Очистка
        controlsBack.set(animateAxis(conf.start));
        controlsMid.set(animateAxis(conf.start));
        controlsFront.set(animateAxis(conf.start));
        clearTransition();
      };

      runSequence();
    }
  }, [
    isActive,
    callback,
    direction,
    controlsBack,
    controlsMid,
    controlsFront,
    clearTransition,
    mounted,
  ]);

  if (!mounted) return null;

  const conf = directionConfig[direction];

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[999999]',
        isActive ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* 1. САМЫЙ ЗАДНИЙ СЛОЙ (уходит последним) */}
      <TransitionLayer
        conf={conf}
        controls={controlsBack}
        zIndex="z-[999997]"
        colorClass="text-primary" // <- Поменяйте на свой первый цвет шлейфа (например text-accent)
      />

      {/* 2. СРЕДНИЙ СЛОЙ */}
      <TransitionLayer
        conf={conf}
        controls={controlsMid}
        zIndex="z-[999998]"
        colorClass="text-accent"
      />

      {/* 3. ПЕРЕДНИЙ СЛОЙ (накрывает все, уходит первым) */}
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
