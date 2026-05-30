import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { DotsThree } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProgressStore } from '@/app/store/useProgressStore';
import { TABS_INFO } from '@/shared/config/tabsConfig';
import { TabBarCustomization } from '@/pages/settings/TabBarCustomization';
import { cn } from '@/app/utils/cn';
import { RouteWallpaper } from '@/shared/RouteWallpaper';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { VisualPiano } from '@/shared/piano/VisualPiano';
import { AudioUnlockOverlay } from '@/app/providers/AudioUnlockOverlay';
import { useGlobalPiano } from '@/app/hooks/useGlobalPiano';
import { useAppShortcuts } from '@/app/hooks/useAppShortcuts';

const TAB_ROUTES: Record<string, string> = {
  tree: '/app/tree',
  lesson: '/app/current/lecture',
  homeworks: '/app/homeworks',
  chains: '/app/chains',
  vocal: '/app/mic',
  tests: '/app/tests',
  exam: '/app/exam',
  debug: '/app/debug',
  settings: '/app/settings',
};

const DESKTOP_NAV_ITEMS = [
  'tree',
  'lesson',
  'homeworks',
  'chains',
  'vocal',
  'tests',
  'exam',
  'debug',
  'settings',
];

export const AppLayout = () => {
  const [isPianoActive, setIsPianoActive] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const overflowRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const { activeTabs, inactiveTabs, uiSize } = useProgressStore();
  useGlobalPiano();
  const handlePianoClick = () => setIsPianoActive((prev) => !prev);

  useAppShortcuts({
    togglePiano: () => setIsPianoActive((prev) => !prev),
  });

   useEffect(() => {
     const html = document.documentElement;
     if (uiSize === 'xs')
       html.style.fontSize = '12px'; // ~75% от стандарта (очень мелко)
     else if (uiSize === 'sm')
       html.style.fontSize = '14px'; // ~87.5% от стандарта
     else if (uiSize === 'lg')
       html.style.fontSize = '18px'; // ~112.5% от стандарта
     else html.style.fontSize = '16px'; // 100% (стандарт)
   }, [uiSize]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        overflowRef.current &&
        !overflowRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        setIsOverflowOpen(false);
      }
    };
    if (isOverflowOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOverflowOpen]);

  const renderTabIcon = (id: string, isMobile: boolean) => {
    const info = TABS_INFO[id];
    if (!info) return null;
    const Icon = info.icon;

    if (id === 'piano') {
      return (
        <ControlButton
          key={id}
          icon={<Icon size={isMobile ? 22 : 20} weight="fill" />}
          isActive={isPianoActive}
          onClick={() => {
            handlePianoClick();
            if (isMobile) setIsOverflowOpen(false);
          }}
          className={cn(isMobile ? 'p-1.5' : 'rounded-lg p-1.5 hover:cursor-pointer')}
          innerClassName="p-1"
        />
      );
    }

    if (id === 'customize') {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            setIsOverflowOpen(false);
            setIsCustomizing(true);
          }}
          className="flex cursor-pointer items-center justify-center p-1.5 text-text/40 transition-colors duration-150 outline-none hover:text-text"
        >
          <Icon size={24} />
        </button>
      );
    }

    const route = TAB_ROUTES[id] || '/app';

    return (
      <NavLink
        key={id}
        to={route}
        onClick={() => setIsOverflowOpen(false)}
        className={({ isActive }) =>
          `flex items-center justify-center transition-colors duration-150 ${
            isMobile ? 'p-1.5' : 'rounded-lg p-2'
          } ${
            isActive
              ? 'text-text'
              : isMobile
                ? 'text-text/40 hover:text-text'
                : 'text-text/40 hover:bg-surface/40 hover:text-text'
          }`
        }
      >
        <Icon size={isMobile ? 24 : 22} />
      </NavLink>
    );
  };

  const bottomSlotsCount = activeTabs.length + 1;
  const getGridColsClass = (count: number) => {
    switch (count) {
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-4';
      case 5:
        return 'grid-cols-5';
      case 6:
        return 'grid-cols-6';
      default:
        return 'grid-cols-5';
    }
  };
  const gridColsClass = getGridColsClass(bottomSlotsCount);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background font-sans text-text antialiased">
      {/* 1. Десктопный Сайдбар (z-20) */}
      <aside className="z-20 hidden h-full w-16 flex-col items-center justify-between border-r-[3px] border-text/18 bg-background py-4 select-none md:flex">
        <nav className="flex w-full flex-col items-center gap-5">
          {DESKTOP_NAV_ITEMS.map((id) => renderTabIcon(id, false))}
        </nav>
        <div className="flex w-full flex-col items-center">{renderTabIcon('piano', false)}</div>
      </aside>

      <RouteWallpaper />

      {/* 2. Основная рабочая область */}
      <main className="relative z-10 flex-1 overflow-y-auto bg-transparent transition-all duration-300">
        <div className="h-full w-full">
          <AudioUnlockOverlay />
          <Outlet />
        </div>
      </main>

      {/* 3. ОБЩИЙ КОНТЕЙНЕР (z-[101])
          Вернули md:left-16, чтобы на ПК контейнер прилипал строго справа от сайдбара */}
      <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-[101] flex flex-col justify-end md:left-16">
        {/* --- Мобильный Таббар --- */}
        <motion.div
          layout
          className="pointer-events-none z-10 flex w-full flex-col items-center px-4 md:hidden"
          style={{
            paddingBottom: isPianoActive ? '16px' : 'calc(env(safe-area-inset-bottom) + 16px)',
          }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        >
          <div className="relative w-full max-w-[500px]">
            {/* Меню троеточия (Выезжает снизу-вверх из-под таббара) */}
            <AnimatePresence>
              {isOverflowOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  ref={overflowRef}
                  className="pointer-events-auto absolute right-0 bottom-[calc(100%+8px)] left-0 z-0 rounded-[14px] border-[3px] border-text/10 bg-surface px-6 py-4 shadow-xl backdrop-blur-md"
                >
                  <div className={`grid w-full justify-items-center gap-y-5 ${gridColsClass}`}>
                    {inactiveTabs.map((id) => renderTabIcon(id, true))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Главная плавающая панель */}
            <div className="pointer-events-auto relative z-10 w-full rounded-[14px] border-[3px] border-text/10 bg-surface px-6 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <div className="flex w-full items-center">
                {activeTabs.map((id) => (
                  <div key={`bottom-${id}`} className="flex flex-1 justify-center">
                    {renderTabIcon(id, true)}
                  </div>
                ))}

                <div className="flex flex-1 justify-center">
                  <button
                    ref={toggleBtnRef}
                    onClick={() => setIsOverflowOpen((prev) => !prev)}
                    className={`flex items-center justify-center p-1.5 transition-colors duration-150 outline-none ${
                      isOverflowOpen ? 'text-text' : 'text-text/40 hover:text-text'
                    }`}
                  >
                    <DotsThree size={28} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Визуальное Пианино --- */}
        <AnimatePresence>
          {isPianoActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="pointer-events-auto w-full shrink-0 overflow-hidden"
            >
              {/* Подложка под пианино: bg-surface, бордер 3px сверху opacity 18%, тянется на весь Outlet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="w-full border-t-[3px] border-text/18 bg-background pt-2 pb-[max(env(safe-area-inset-bottom),8px)] md:py-0"
              >
                <VisualPiano />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Оверлей кастомизации на мобильном */}
      {isCustomizing && (
        <div className="fixed inset-0 z-[100] animate-[slideIn_0.2s_ease-out]">
          <TabBarCustomization onClose={() => setIsCustomizing(false)} />
        </div>
      )}
    </div>
  );
};
