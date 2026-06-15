import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  type Variants,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import { cn } from '@/app/utils/cn';
import { ChainsWallpaper } from '@/wallpapers/ChainsWallpaper';
import { HomeworksWallpaper } from '@/wallpapers/HomeworksWallpaper';
import { LessonWallpaper } from '@/wallpapers/LessonWallpaper';
import { TestsWallpaper } from '@/wallpapers/TestsWallpaper';
import { SettingsWallpaper } from '@/wallpapers/SettingsWallpaper';
import { VocalWallpaper } from '@/wallpapers/VocalWallpaper';
import { TreeWallpaper } from '@/wallpapers/TreeWallpaper';
import { useProgressStore } from '@/app/store/useProgressStore';

const wallpaperVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: [0.25, 0, 0.5, 1] },
  },
};

export const RouteWallpaper = () => {
  const { pathname } = useLocation();
  const { wallpaperMouseTracking } = useProgressStore();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const translateX = useTransform(mouseX, [-1, 1], [20, -20]);
  const translateY = useTransform(mouseY, [-1, 1], [20, -20]);

  const springConfig = { damping: 30, stiffness: 50, mass: 0.5 };
  const springX = useSpring(translateX, springConfig);
  const springY = useSpring(translateY, springConfig);

  useEffect(() => {
    const hasMouse = window.matchMedia('(pointer: fine)').matches;

    // ✨ Теперь при изменении wallpaperMouseTracking эффект перезапустится корректно
    if (!hasMouse || !wallpaperMouseTracking) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY, wallpaperMouseTracking]); // <-- Добавили в зависимости!

  useEffect(() => {
    if (!wallpaperMouseTracking) {
      mouseX.set(0);
      mouseY.set(0);
    }
  }, [wallpaperMouseTracking, mouseX, mouseY]);

  const wallpaperData = useMemo(() => {
    if (pathname.includes('/app/tree')) return { key: 'tree', Component: TreeWallpaper };
    if (pathname.includes('/app/chains')) return { key: 'chains', Component: ChainsWallpaper };
    if (pathname.includes('/app/homeworks'))
      return { key: 'homeworks', Component: HomeworksWallpaper };
    if (pathname.includes('/app/current/lecture'))
      return { key: 'lesson', Component: LessonWallpaper };
    if (pathname.includes('/app/tests')) return { key: 'tests', Component: TestsWallpaper };
    if (pathname.includes('/app/settings'))
      return { key: 'settings', Component: SettingsWallpaper };
    if (pathname.includes('/app/mic')) return { key: 'vocal', Component: VocalWallpaper };
    if (pathname.includes('/app/friends')) return { key: 'friends', Component: VocalWallpaper };
    return null;
  }, [pathname]);

  return (
    <AnimatePresence mode="wait">
      {wallpaperData && (
        <motion.div
          key={wallpaperData.key}
          variants={wallpaperVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            'pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden',
          )}
        >
          <motion.div style={{ x: springX, y: springY }} className="absolute h-[105%] w-[105%]">
            <wallpaperData.Component className="h-full w-full object-cover text-text opacity-2" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
