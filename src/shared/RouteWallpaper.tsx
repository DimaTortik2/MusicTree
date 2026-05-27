import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/app/utils/cn';
import { ChainsWallpaper } from '@/wallpapers/ChainsWallpaper';
import { HomeworksWallpaper } from '@/wallpapers/HomeworksWallpaper';
import { LessonWallpaper } from '@/wallpapers/LessonWallpaper';
import { TestsWallpaper } from '@/wallpapers/TestsWallpaper';
import { SettingsWallpaper } from '@/wallpapers/SettingsWallpaper';
import { VocalWallpaper } from '@/wallpapers/VocalWallpaper';
import { TreeWallpaper } from '@/wallpapers/TreeWallpaper';

export const RouteWallpaper = () => {
  const { pathname } = useLocation();

  const WallpaperIcon = useMemo(() => {
    if (pathname.includes('/app/tree')) return TreeWallpaper;
    if (pathname.includes('/app/chains')) return ChainsWallpaper;
    if (pathname.includes('/app/homeworks')) return HomeworksWallpaper;
    if (pathname.includes('/app/current/lecture')) return LessonWallpaper;
    if (pathname.includes('/app/tests')) return TestsWallpaper;
    if (pathname.includes('/app/settings')) return SettingsWallpaper;
    if (pathname.includes('/app/vocal')) return VocalWallpaper;
  }, [pathname]);

  if (!WallpaperIcon) return null;

  return (
    <div
      key={pathname}
      className={cn(
        // Обои лежат на z-0, прямо над основным фоном приложения
        'pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden',
        'animate-in fade-in duration-700 ease-in-out',
      )}
    >
      {/* 
        text-text автоматически подхватит цвет из темы (светлой или темной).
        opacity-[0.02] — ровно 2% прозрачности. Если покажется слишком блекло, 
        можешь поставить opacity-[0.03] или opacity-[0.04] для тонкой настройки.
      */}
      <WallpaperIcon className="h-full w-full object-cover text-text opacity-2" />
    </div>
  );
};
