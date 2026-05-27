import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { DotsThree } from '@phosphor-icons/react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { TABS_INFO } from '@/shared/config/tabsConfig';
import { TabBarCustomization } from '@/pages/settings/TabBarCustomization';
import { cn } from '@/app/utils/cn';

// Роуты для каждой из вкладок
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

// Десктопная панель всегда показывает вкладки в стандартном порядке
// (Игнорирует мобильный стор, не содержит вкладку 'customize' по ТЗ)
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

  // Состояния для мобильной навигации
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const overflowRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null); // Ref для кнопки троеточия

  // Берем стейт напрямую (без искусственного обрезания)
  const { activeTabs, inactiveTabs } = useProgressStore();

  const handlePianoClick = () => setIsPianoActive((prev) => !prev);

  // Правильное закрытие меню "Троеточия"
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Если клик не по самой панели И не по кнопке её вызова - закрываем
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

    // Специфика пианино (модалка/всплывашка снизу, а не роут)
    if (id === 'piano') {
      return (
        <button
          key={id}
          type="button"
          onClick={() => {
            handlePianoClick();
            if (isMobile) setIsOverflowOpen(false);
          }}
          className={cn(
            'flex cursor-pointer items-center justify-center transition-all duration-150 outline-none',
            isMobile ? 'p-1.5' : 'rounded-lg p-1.5 hover:cursor-pointer',
            isPianoActive ? 'opacity-100' : 'opacity-40 hover:opacity-100',
          )}
        >
          {/* Единый визуал пианино с подложкой для всех платформ */}
          <div className="rounded-md bg-text p-1 text-surface">
            <Icon size={isMobile ? 22 : 20} weight="fill" />
          </div>
        </button>
      );
    }

    // Специфика кастомизации (это элемент массива inactiveTabs по дефолту)
    // Он не является ссылкой, а открывает мобильный оверлей настроек
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

    // Обычные роуты-вкладки
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

  // --- Динамический расчет колонок верхней панели (для идеального совпадения с нижней) ---
  const bottomSlotsCount = activeTabs.length + 1; // +1 для кнопки троеточия
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
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-text antialiased">
      {/* 1. Десктопный Сайдбар (Игнорирует мобильную кастомизацию) */}
      <aside className="z-10 hidden h-full w-16 flex-col items-center justify-between border-r-[3px] border-text/18 bg-background py-4 select-none md:flex">
        <nav className="flex w-full flex-col items-center gap-5">
          {DESKTOP_NAV_ITEMS.map((id) => renderTabIcon(id, false))}
        </nav>
        <div className="flex w-full flex-col items-center">{renderTabIcon('piano', false)}</div>
      </aside>

      {/* 2. Основная рабочая область */}
      <main className="flex-1 overflow-y-auto bg-background transition-all duration-300">
        <div className="h-full w-full">
          <Outlet />
        </div>
      </main>

      {/* 3. Мобильный Tab Bar */}
      <div
        className="pointer-events-none fixed right-0 bottom-0 left-0 z-50 flex flex-col items-center px-4 md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        {/* Оверлей меню Троеточия (Рендерит строго inactiveTabs) */}
        {isOverflowOpen && (
          <div
            ref={overflowRef}
            className="animate-in slide-in-from-bottom-2 fade-in pointer-events-auto mb-2 w-full max-w-[500px] rounded-[14px] border-[3px] border-text/10 bg-surface px-6 py-4 shadow-xl backdrop-blur-md duration-200"
          >
            {/* Иконки выстраиваются в сетку, колонки которой 1-в-1 повторяют нижнюю панель */}
            <div className={`grid w-full justify-items-center gap-y-5 ${gridColsClass}`}>
              {inactiveTabs.map((id) => renderTabIcon(id, true))}
            </div>
          </div>
        )}

        {/* Главная плавающая панель (Рендерит строго activeTabs) */}
        <div className="pointer-events-auto w-full max-w-[500px] rounded-[14px] border-[3px] border-text/10 bg-surface px-6 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <div className="flex w-full items-center">
            {activeTabs.map((id) => (
              <div key={`bottom-${id}`} className="flex flex-1 justify-center">
                {renderTabIcon(id, true)}
              </div>
            ))}

            {/* Кнопка Троеточия (Последний слот) */}
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

      {/* 4. Оверлей кастомизации на мобильном */}
      {isCustomizing && (
        <div className="fixed inset-0 z-[100] animate-[slideIn_0.2s_ease-out]">
          <TabBarCustomization onClose={() => setIsCustomizing(false)} />
        </div>
      )}
    </div>
  );
};
