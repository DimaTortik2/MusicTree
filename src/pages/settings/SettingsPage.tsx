import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { SpeakerHigh, PianoKeys, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { TabBarCustomization } from '@/pages/settings/TabBarCustomization';

export default function SettingsPage() {
  const [isCustomizingMobile, setIsCustomizingMobile] = useState(false);
  const { theme, mediaVolume, pianoVolume } = useProgressStore();

  const handleMockAction = (msg: string) => console.log(`[Mock Action]: ${msg}`);

  return (
    <div className="relative min-h-screen w-full bg-background p-4 pb-24 text-text md:p-10 md:pb-10">
      {/* 1. Мобильная кастомизация (Видно только на <768px) */}
      <div className="mb-10 md:hidden">
        <h2 className="mb-1 text-2xl">Тап-бар</h2>
        <p className="mb-4 text-[14px] leading-tight text-white/40">
          Вы можете настроить приоритетность кнопок в тап баре. Вы должны увидеть все функции!
        </p>
        <button
          onClick={() => setIsCustomizingMobile(true)}
          className="rounded-xl border border-text px-6 py-3 text-sm transition-colors active:bg-surface"
        >
          Кастомизировать тап-бар
        </button>
      </div>

      {/* 2. Кастомизация Пианино (Видно только на >=768px) */}
      <div className="mb-10 hidden md:block">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-2xl">Клавиатура</h2>
          <span className="text-sm text-white/40">Нажмите на ноту и переназначьте клавишу</span>
          <button
            onClick={() => handleMockAction('Сброс хоткеев')}
            className="text-white/40 transition-colors hover:text-text"
          >
            <ArrowCounterClockwise size={24} />
          </button>
        </div>
        {/* Заглушка клавиатуры (Визуал по макету) */}
        <div className="flex items-start gap-1">
          {/* Фейковая левая часть пианино */}
          <div className="flex gap-1 rounded bg-surface p-1">
            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U'].map((key, i) => (
              <div
                key={i}
                className="relative flex h-32 w-10 items-end justify-center rounded-sm bg-text pb-2 font-medium text-background"
              >
                {key}
                {/* Черные клавиши (просто для визуала) */}
                {[0, 1, 3, 4, 5].includes(i) && (
                  <div className="absolute top-0 right-[-14px] z-10 flex h-20 w-6 items-end justify-center rounded-sm border border-surface bg-background pb-2 text-sm text-white/40">
                    {i + 2}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Фейковая правая часть пианино */}
          <div className="ml-2 flex gap-1 rounded bg-surface p-1">
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((key, i) => (
              <div
                key={i}
                className="relative flex h-32 w-10 items-end justify-center rounded-sm bg-text pb-2 font-medium text-background"
              >
                {key}
                {[0, 1, 3, 4, 5].includes(i) && (
                  <div className="absolute top-0 right-[-14px] z-10 flex h-20 w-6 items-end justify-center rounded-sm border border-surface bg-background pb-2 text-sm text-white/40">
                    {['S', 'D', 'G', 'H', 'J'][i > 2 ? i - 1 : i]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Громкость */}
      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Громкость</h2>
        <div className="mb-4 flex items-center gap-4 text-text/80">
          <SpeakerHigh size={24} className="shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={mediaVolume}
            onChange={() => {}}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface accent-text"
          />
        </div>
        <div className="flex items-center gap-4 text-text/80">
          <PianoKeys size={24} className="shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={pianoVolume}
            onChange={() => {}}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-surface accent-text"
          />
        </div>
      </div>

      {/* 4. Тема */}
      <div className="mb-10">
        <h2 className="mb-4 text-2xl">Тема</h2>
        <div className="flex items-center gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="theme"
              checked={theme === 'dark'}
              onChange={() => {}}
              className="h-4 w-4 accent-text"
            />
            <span>Темная</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-white/40">
            <input
              type="radio"
              name="theme"
              checked={theme === 'light'}
              onChange={() => {}}
              className="h-4 w-4 accent-text"
              disabled
            />
            <span>Светлая</span>
          </label>
        </div>
      </div>

      {/* 5. Данные */}
      <div className="mb-10 max-w-lg">
        <h2 className="mb-6 text-2xl">Данные</h2>

        {/* Круговая диаграмма (SVG Mock) */}
        <div className="relative mb-6 h-48 w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            {/* Оставшееся место */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/20"
            />
            {/* Занятое место */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="var(--primary)"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset="100"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">560 МБ</span>
          </div>
        </div>

        <p className="mb-1 text-[16px]">Диаграмма объема памяти, занятого под ваши аудиофайлы</p>
        <p className="mb-4 text-[14px] leading-tight text-white/40">
          Нажав на кнопку ниже, вы удалите только свои аудиозаписи. На остальных данных это никак не
          отразится. Вы не потеряете свой прогресс
        </p>

        <DeleteDialog
          triggerText="Удалить все ваши аудиофайлы"
          title="Вы действительно хотите удалить все аудиозаписи с этого сайта?"
          description="Вы потеряете все свои записи без возможности восстановления, но прогресс останется нетронутым"
          confirmText="Очистить аудиофайлы"
          onConfirm={() => handleMockAction('Очистка аудио IndexedDB')}
          isSecondary
        />

        <div className="mt-8">
          <p className="mb-1 text-[16px]">
            Также вы можете удалить <span className="text-primary">все свои данные</span> с сайта
            (прогресс, тесты и аудиофайлы)
          </p>
          <p className="mb-4 text-[14px] leading-tight text-white/40">
            Будьте внимательны! Данные будут подлежать удалению без возможности восстановления
          </p>

          <DeleteDialog
            triggerText="Удалить все свои данные"
            title={
              <>
                Вы действительно хотите удалить{' '}
                <span className="text-primary">все свои данные</span> с этого сайта?
              </>
            }
            description="Вы потеряете все свои записи и прогресс без возможности восстановления"
            confirmText="Очистить всё"
            onConfirm={() => handleMockAction('Полный сброс LocalStorage и IndexedDB')}
          />
        </div>
      </div>

      {/* Рендер мобильного оверлея настроек тап-бара */}
      {isCustomizingMobile && <TabBarCustomization onClose={() => setIsCustomizingMobile(false)} />}
    </div>
  );
}

// Компонент переиспользуемой модалки удаления на Radix UI
function DeleteDialog({
  triggerText,
  title,
  description,
  confirmText,
  onConfirm,
  isSecondary,
}: {
  triggerText: string;
  title: React.ReactNode;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  isSecondary?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={`rounded-xl border px-6 py-3 text-sm transition-colors ${
            isSecondary
              ? 'border-primary bg-primary/20 text-text hover:bg-primary/30'
              : 'border-surface bg-surface text-white/40 hover:text-text'
          }`}
        >
          {triggerText}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[200] w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-surface p-6 shadow-xl outline-none">
          <Dialog.Title className="mb-2 text-xl font-medium text-text">{title}</Dialog.Title>
          <Dialog.Description className="mb-6 text-sm leading-tight text-white/40">
            {description}
          </Dialog.Description>

          <div className="flex gap-4">
            <Dialog.Close asChild>
              <button className="flex-1 rounded-xl border border-text py-3 text-text transition-colors hover:bg-background">
                Отмена
              </button>
            </Dialog.Close>
            <button
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className="flex-1 rounded-xl bg-primary py-3 text-text transition-opacity hover:opacity-90"
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
