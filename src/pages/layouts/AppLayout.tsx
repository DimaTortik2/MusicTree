import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  GitFork,
  TextAlignCenter,
  Highlighter,
  Link,
  Microphone,
  GraduationCap,
  Exam,
  Wrench,
  Gear,
  PianoKeys,
} from '@phosphor-icons/react';

const NAV_ITEMS = [
  { to: '/app/tree', Icon: GitFork },
  { to: '/app/current/lecture', Icon: TextAlignCenter },
  { to: '/app/homeworks', Icon: Highlighter },
  { to: '/app/chains', Icon: Link },
  { to: '/app/mic', Icon: Microphone },
  { to: '/app/tests', Icon: GraduationCap },
  { to: '/app/exam', Icon: Exam },
  { to: '/app/debug', Icon: Wrench },
  { to: '/app/settings', Icon: Gear },
];

export const AppLayout = () => {
  const [isPianoActive, setIsPianoActive] = useState(false);

  const handlePianoClick = () => {
    setIsPianoActive((prev) => !prev);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-text antialiased">
      {/* Узкая боковая панель */}
      <aside className="flex h-full w-16 flex-col items-center justify-between border-r-[3px] border-text/18 bg-background py-4 select-none">
        {/* Верхняя группа иконок навигации */}
        <nav className="flex w-full flex-col items-center gap-5">
          {NAV_ITEMS.map(({ to, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-lg p-2 transition-colors duration-150 ${
                  isActive ? 'text-text' : 'text-text/40 hover:bg-surface/40 hover:text-text'
                }`
              }
            >
              <Icon size={22} />
            </NavLink>
          ))}
        </nav>

        {/* Кнопка пианино */}
        <div className="flex w-full flex-col items-center">
          <button
            type="button"
            onClick={handlePianoClick}
            className={`rounded-lg p-1.5 transition-colors duration-150 outline-none ${
              isPianoActive
                ? 'text-text'
                : 'text-text/40 hover:cursor-pointer hover:border-text hover:text-text'
            }`}
          >
            <PianoKeys size={20} />
          </button>
        </div>
      </aside>

      {/* Основная рабочая область */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="h-full w-full p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
