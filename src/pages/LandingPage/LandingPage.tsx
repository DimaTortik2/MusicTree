import { Logo } from '@/pages/LandingPage/Logo';
import { Microphone } from '@/pages/LandingPage/Microphone';
import { PinkWave } from '@/pages/LandingPage/PinkWave';
import { Button } from '@/shared/Button';
import { NavLink } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background font-sans text-text">
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
          <p className="mb-2 text-center text-sm font-light sm:mb-4 sm:text-left sm:text-3xl">
            Добро пожаловать на
          </p>
          <Logo className="mb-8 h-auto w-[85%] max-w-[320px] drop-shadow-sm sm:mb-12 sm:w-full sm:max-w-120" />
          {/* Mobile MIC */}
          <div className="relative mb-10 flex max-w-[20rem] self-end sm:hidden">
            <Microphone className="h-auto w-[120%] rotate-[-20deg]" />
          </div>
          {/* Кнопка, на которую будет навешано дофига всякого */}
          <NavLink to={'/app'}>
            <Button className="bg-accent hover:bg-primary">Начать</Button>
          </NavLink>
        </div>
      </main>
    </div>
  );
}
