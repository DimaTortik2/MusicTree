import { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { DotsThree } from '@phosphor-icons/react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
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
import { Tooltip } from '@/shared/Tooltip';
import { AmbientGlow } from '@/shared/AmbientGlow';
import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { AuthLoader } from '@/app/providers/AuthRoutes';
import { useAppPresence } from '@/app/hooks/useAppPresence';
import { SharedTreeBanner } from '@/shared/SharedTreeBanner';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useSharedTreeSync } from '@/shared/hooks/useSharedTreeSync';

const TAB_ROUTES: Record<string, string> = {
  tree: '/app/tree',
  lesson: '/app/current/lecture',
  homeworks: '/app/homeworks',
  chains: '/app/chains',
  vocal: '/app/mic',
  tests: '/app/tests',
  debug: '/app/debug',
  settings: '/app/settings',
  friends: '/app/friends',
};

const DESKTOP_NAV_ITEMS = [
  'tree',
  'lesson',
  'homeworks',
  'chains',
  'vocal',
  'tests',
  'friends',
  'debug',
  'settings',
];

// ✨ Элегантное затухание через темный фон
const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98, // Слегка уменьшено при появлении
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 1, 0.5, 1], // Мягкий ease-out
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98, // Слегка проваливается вглубь при исчезновении
    transition: {
      duration: 0.2,
      ease: [0.25, 0, 0.5, 1], // Ускоренный ease-in для быстрого исчезновения
    },
  },
};

export const AppLayout = () => {
  const { isSyncing } = useCloudSync();
  const { activeSharedFriend } = useAppModeStore();
  const [isPianoActive, setIsPianoActive] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useSharedTreeSync();

  const overflowRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const { activeTabs, inactiveTabs, uiSize } = useProgressStore();
  const location = useLocation();
  const outlet = useOutlet();

  useGlobalPiano();
  useAppPresence();

  // ✨ Слушаем ресайз окна для переключения типа анимации
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePianoClick = () => setIsPianoActive((prev) => !prev);

  useAppShortcuts({
    togglePiano: () => setIsPianoActive((prev) => !prev),
  });

  // Базовый ключ анимации (чтобы не анимировать внутри одной вкладки, например /app/homeworks/123)
  const transitionKey = useMemo(() => {
    const segments = location.pathname.split('/');
    return segments.slice(0, 3).join('/');
  }, [location.pathname]);

  // Вычисляем ID текущей вкладки по роуту
  const currentTabId = useMemo(() => {
    const entry = Object.entries(TAB_ROUTES).find(([_, route]) => transitionKey.startsWith(route));
    return entry ? entry[0] : null;
  }, [transitionKey]);

  // ✨ Логика вычисления направления (вперед = 1, назад = -1)
  const prevTabIdRef = useRef<string | null>(currentTabId);
  const directionRef = useRef(1);

  const desktopNavItems = useMemo(() => {
    if (activeSharedFriend) {
      const others = DESKTOP_NAV_ITEMS.filter((i) => i !== 'friends' && i !== 'chats');
      return ['friends', 'chats', ...others];
    }
    return DESKTOP_NAV_ITEMS;
  }, [activeSharedFriend]);

  if (currentTabId && currentTabId !== prevTabIdRef.current) {
    // В зависимости от платформы берем нужный порядок вкладок
    const tabOrder = isMobile ? [...activeTabs, ...inactiveTabs] : DESKTOP_NAV_ITEMS;

    const currIdx = tabOrder.indexOf(currentTabId);
    const prevIdx = prevTabIdRef.current ? tabOrder.indexOf(prevTabIdRef.current) : -1;

    if (currIdx !== -1 && prevIdx !== -1) {
      directionRef.current = currIdx > prevIdx ? 1 : -1;
    }
    prevTabIdRef.current = currentTabId;
  }

  useEffect(() => {
    const html = document.documentElement;
    if (uiSize === 'xs') html.style.fontSize = '12px';
    else if (uiSize === 'sm') html.style.fontSize = '14px';
    else if (uiSize === 'lg') html.style.fontSize = '18px';
    else html.style.fontSize = '16px';
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

  if (isSyncing) {
    return <AuthLoader />;
  }

  const renderTabIcon = (id: string, isMobileView: boolean) => {
    const info = TABS_INFO[id];
    if (!info) return null;
    const Icon = info.icon;

    const TAB_LABELS: Record<string, string> = {
      piano: 'Пианино',
      tree: 'Дерево',
      lesson: 'Текущая лекция',
      homeworks: 'Домашние задания',
      chains: 'Цепь распевки',
      vocal: 'Вокальный тренажер',
      tests: 'Тесты',
      friends: 'Друзья',
      debug: 'Дебаг',
      settings: 'Настройки',
      customize: 'Настроить вкладки',
    };

    const TAB_SHORTCUTS: Record<string, string> = {
      piano: 'openPiano',
      tree: 'navTree',
      lesson: 'navCurrentLecture',
      homeworks: 'navHomework',
      chains: 'navWarmupChain',
      vocal: 'navVocalTrainer',
      tests: 'navTests',
      settings: 'navSettings',
    };

    const label = (info as any).label || TAB_LABELS[id] || 'Вкладка';
    const shortcutAction = TAB_SHORTCUTS[id] as any;
    const tooltipPosition = isMobileView ? 'top' : 'right';

    if (id === 'piano') {
      return (
        <Tooltip
          key={id}
          content={label}
          shortcutAction={shortcutAction}
          position={tooltipPosition}
        >
          <ControlButton
            icon={<Icon size={isMobileView ? 22 : 20} weight="fill" />}
            isActive={isPianoActive}
            onClick={() => {
              handlePianoClick();
              if (isMobileView) setIsOverflowOpen(false);
            }}
            className={cn(isMobileView ? 'p-1.5' : 'rounded-lg p-1.5 hover:cursor-pointer')}
            innerClassName="p-1"
          />
        </Tooltip>
      );
    }

    if (id === 'customize') {
      return (
        <Tooltip key={id} content={label} position={tooltipPosition}>
          <button
            type="button"
            onClick={() => {
              setIsOverflowOpen(false);
              setIsCustomizing(true);
            }}
            className="flex cursor-pointer items-center justify-center p-1.5 text-text/40 transition-colors duration-150 outline-none hover:text-text"
          >
            <Icon size={24} />
          </button>
        </Tooltip>
      );
    }

    const route = TAB_ROUTES[id] || '/app';
    const isChats = id === 'chats';
    const isChatsDisabled = isChats && !activeSharedFriend;

    return (
      <Tooltip key={id} content={label} shortcutAction={shortcutAction} position={tooltipPosition}>
        <NavLink
          to={route}
          onClick={(e) => {
            if (isChatsDisabled)
              e.preventDefault(); // Запрещаем переход
            else setIsOverflowOpen(false);
          }}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-center transition-colors duration-150 outline-none',
              isMobileView ? 'p-1.5' : 'rounded-lg p-2',
              isActive && !isChatsDisabled ? 'text-text' : 'text-text/40',
              !isChatsDisabled && isMobileView && 'hover:text-text',
              !isChatsDisabled &&
                !isMobileView &&
                !isActive &&
                'hover:bg-surface/40 hover:text-text',
              isChatsDisabled && 'pointer-events-none cursor-not-allowed opacity-30', // Делаем серым и некликабельным
            )
          }
        >
          <Icon size={isMobileView ? 24 : 22} />
        </NavLink>
      </Tooltip>
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
    <div className="relative flex h-screen w-full overflow-hidden bg-background font-sans text-text antialiased selection:bg-primary/20">
      {/* 1. Десктопный Сайдбар (z-20) */}
      <aside className="z-20 hidden h-full w-16 flex-col items-center justify-between border-r-[3px] border-text/18 bg-background py-4 select-none md:flex">
        <nav className="flex w-full flex-col items-center gap-5">
          {desktopNavItems.map((id) => renderTabIcon(id, false))}
        </nav>
        <div className="flex w-full flex-col items-center">{renderTabIcon('piano', false)}</div>
      </aside>

      <AmbientGlow />
      <RouteWallpaper />

      {/* 2. Основная рабочая область */}
      <main className="relative z-10 flex-1 overflow-hidden bg-transparent transition-all duration-300">
        {/* Обертка теперь relative для абсолютного позиционирования страниц */}
        <div className="relative h-full w-full">
          <SharedTreeBanner />
          <AudioUnlockOverlay />

          {/* ✨ mode="wait" заставляет старую страницу исчезнуть до появления новой */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={transitionKey}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageTransitionVariants}
              // ✨ Скролл-контейнером теперь является сама анимированная страница
              className="absolute inset-0 overflow-x-hidden overflow-y-auto"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. ОБЩИЙ КОНТЕЙНЕР (z-[101]) */}
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

            <div className="pointer-events-auto relative z-10 w-full rounded-[14px] border-[3px] border-text/10 bg-surface px-6 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <div className="flex w-full items-center">
                {activeTabs.map((id) => (
                  <div key={`bottom-${id}`} className="flex flex-1 justify-center">
                    {renderTabIcon(id, true)}
                  </div>
                ))}

                <div className="flex flex-1 justify-center">
                  <Tooltip content="Дополнительно" position="top">
                    <button
                      ref={toggleBtnRef}
                      onClick={() => setIsOverflowOpen((prev) => !prev)}
                      className={`flex items-center justify-center p-1.5 transition-colors duration-150 outline-none ${
                        isOverflowOpen ? 'text-text' : 'text-text/40 hover:text-text'
                      }`}
                    >
                      <DotsThree size={28} weight="bold" />
                    </button>
                  </Tooltip>
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
