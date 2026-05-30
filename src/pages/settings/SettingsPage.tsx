import { useState, useEffect } from 'react';
import { SpeakerHigh, PianoKeys, ArrowCounterClockwise } from '@phosphor-icons/react';
import localforage from 'localforage';

import { useProgressStore } from '@/app/store/useProgressStore';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { useTheme } from '@/app/providers/ThemeProvider';
import { TabBarCustomization } from '@/pages/settings/TabBarCustomization';

import { cn } from '@/app/utils/cn';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { VolumeSlider } from '@/shared/VolumeSlider';
import { toneEngine } from '@/shared/lib/toneEngine';

// Форматирование клавиш (убираем Key и Digit)
const formatKeyName = (code: string | null) => {
  if (!code) return '—';
  return code.replace('Key', '').replace('Digit', '');
};

// Генерация октавы, как в OnlyVisualPiano
const getSettingsOctaveKeys = (baseOctave: number) => {
  return [
    { baseNote: `C${baseOctave}`, hasBlack: true, blackBaseNote: `C#${baseOctave}` },
    { baseNote: `D${baseOctave}`, hasBlack: true, blackBaseNote: `D#${baseOctave}` },
    { baseNote: `E${baseOctave}`, hasBlack: false },
    { baseNote: `F${baseOctave}`, hasBlack: true, blackBaseNote: `F#${baseOctave}` },
    { baseNote: `G${baseOctave}`, hasBlack: true, blackBaseNote: `G#${baseOctave}` },
    { baseNote: `A${baseOctave}`, hasBlack: true, blackBaseNote: `A#${baseOctave}` },
    { baseNote: `B${baseOctave}`, hasBlack: false },
  ];
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // ✨ Достаем стейты прогресса скачивания и активные клавиши
  const { activeKeys, isPianoLoading, pianoLoadProgress } = useActiveKeysStore();

  const {
    mediaVolume,
    setMediaVolume,
    pianoVolume,
    setPianoVolume,
    pianoBindings,
    updatePianoBinding,
    resetPianoBindings,
    pianoSoundType,
    setPianoSoundType,
  } = useProgressStore();

  const [isCustomizingMobile, setIsCustomizingMobile] = useState(false);
  const [listeningNote, setListeningNote] = useState<string | null>(null);

  const [storageText, setStorageText] = useState('0 МБ');
  const [storagePercent, setStoragePercent] = useState(0);

  // --- 1. Оценка занимаемой памяти (Storage API) ---
  useEffect(() => {
    async function checkStorage() {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const { usage, quota } = await navigator.storage.estimate();
          if (usage !== undefined && quota !== undefined) {
            const mb = usage / (1024 * 1024);

            // Форматируем текст
            if (mb > 1024) {
              setStorageText(`${(mb / 1024).toFixed(1)} ГБ`);
            } else {
              setStorageText(`${mb > 0 && mb < 1 ? '<1' : Math.round(mb)} МБ`);
            }

            // Вычисляем процент. Если диск огромный, а аудио весит мало - процент будет 0.0001%
            let percent = quota > 0 ? (usage / quota) * 100 : 0;

            // Делаем минимум 2%, чтобы линию было видно визуально, если есть хоть какие-то данные
            if (usage > 0 && percent < 2) percent = 2;

            setStoragePercent(Math.min(percent, 100));
          }
        } catch (e) {
          console.error('Ошибка оценки памяти:', e);
        }
      }
    }

    // Проверяем при монтировании и при каждом возврате на вкладку (фокус)
    checkStorage();
    window.addEventListener('focus', checkStorage);
    return () => window.removeEventListener('focus', checkStorage);
  }, []);

  // --- 2. Логика переназначения клавиш с защитой системных кнопок ---
  useEffect(() => {
    if (!listeningNote) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(Media|Audio|Volume|Browser|Launch|F\d+)/.test(e.code)) return;

      const invalidKeys = [
        'Space',
        'Enter',
        'Tab',
        'Escape',
        'Backspace',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'CapsLock',
        'ShiftLeft',
        'ShiftRight',
        'ControlLeft',
        'ControlRight',
        'AltLeft',
        'AltRight',
        'MetaLeft',
        'MetaRight',
        'ContextMenu',
        'PrintScreen',
        'ScrollLock',
        'Pause',
        'Insert',
        'Delete',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ];

      if (invalidKeys.includes(e.code)) return;

      e.preventDefault();

      // Сбрасываем все звуки и визуальные нажатия при переназначении клавиши
      toneEngine.releaseAll();
      useActiveKeysStore.getState().clearKeys();

      updatePianoBinding(listeningNote, e.code);
      setListeningNote(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningNote, updatePianoBinding]);

  const handleClearAudio = async () => {
    try {
      await localforage.clear();
      useProgressStore.setState({ audioRecordIds: [] });
      setStorageText('0 МБ');
      setStoragePercent(0);
    } catch (e) {
      console.error('Ошибка очистки аудио:', e);
    }
  };

  const handleClearAll = async () => {
    try {
      await localforage.clear();
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      console.error('Ошибка полного сброса:', e);
    }
  };

  // --- Идентичный рендер пианино из OnlyVisualPiano ---
  const renderKeyboardLayout = (octave: number) => {
    const keys = getSettingsOctaveKeys(octave);

    return (
      <div className="flex gap-0.5 lg:gap-1">
        {keys.map((item) => {
          const isListeningWhite = listeningNote === item.baseNote;
          const isListeningBlack = item.hasBlack && listeningNote === item.blackBaseNote;

          // ✨ Проверяем, играет ли эта нота сейчас (нажата с клавиатуры)
          const isWhitePressed = activeKeys.has(item.baseNote);
          const isBlackPressed = item.hasBlack && activeKeys.has(item.blackBaseNote!);

          return (
            <div key={item.baseNote} className="relative flex shrink-0 select-none">
              {/* Белая клавиша */}
              <div
                onClick={() => setListeningNote(item.baseNote)}
                className={cn(
                  'relative flex cursor-pointer flex-col justify-end pb-3 transition-colors duration-100 ease-in-out',
                  'h-[140px] w-[32px] rounded-b-[6px] lg:h-[180px] lg:w-[46px]',
                  isListeningWhite
                    ? 'bg-primary'
                    : isWhitePressed
                      ? 'bg-piano-white-active'
                      : 'bg-piano-white hover:bg-piano-white-hover active:bg-piano-white-active',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none text-center text-xs font-semibold select-none lg:text-sm',
                    isListeningWhite ? 'text-white' : 'text-[#1a0b22]/30',
                  )}
                >
                  {isListeningWhite ? '?' : formatKeyName(pianoBindings[item.baseNote])}
                </span>
              </div>

              {/* Черная клавиша */}
              {item.hasBlack && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setListeningNote(item.blackBaseNote!);
                  }}
                  className={cn(
                    'absolute top-0 z-10 flex cursor-pointer flex-col justify-end pb-2 transition-colors duration-100 ease-in-out',
                    'h-[85px] w-[20px] rounded-b-[4px] lg:h-[110px] lg:w-[28px]',
                    '-right-[11px] lg:-right-[16px]',
                    isListeningBlack
                      ? 'bg-primary'
                      : isBlackPressed
                        ? 'bg-piano-black-active'
                        : 'bg-piano-black hover:bg-piano-black-hover active:bg-piano-black-active',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none text-center text-[9px] font-semibold select-none lg:text-[11px]',
                      isListeningBlack ? 'text-white' : 'text-text/40',
                    )}
                  >
                    {isListeningBlack ? '?' : formatKeyName(pianoBindings[item.blackBaseNote!])}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full p-6 pb-[50vh] text-text md:p-10 md:pb-[50vh]">
      {/* 1. Мобильная кастомизация */}
      <div className="mb-10 md:hidden">
        <h2 className="mb-1 text-2xl">Тап-бар</h2>
        <p className="mb-4 text-[14px] leading-tight text-white/40">
          Вы можете настроить приоритетность кнопок в тап баре. Вы должны увидеть все функции!
        </p>
        <Button
          variant="outline"
          size="sm"
          color="text"
          onClick={() => setIsCustomizingMobile(true)}
        >
          Кастомизировать тап-бар
        </Button>
      </div>

      {/* 2. Кастомизация Пианино */}
      <div className="mb-10 hidden overflow-hidden md:block">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-2xl">Клавиатура</h2>
          <span className="text-sm text-white/40">Нажмите на ноту и переназначьте клавишу</span>
          <button
            onClick={resetPianoBindings}
            title="Сбросить раскладку"
            className="cursor-pointer text-white/40 transition-colors outline-none hover:text-text active:scale-95"
          >
            <ArrowCounterClockwise size={24} />
          </button>
        </div>

        {listeningNote && (
          <div className="mb-4 animate-pulse text-sm text-primary">
            Нажмите любую доступную клавишу для ноты {listeningNote}...
          </div>
        )}

        <div className="flex items-start gap-1">
          {renderKeyboardLayout(4)} {/* Левая часть (Октава 4) */}
          {renderKeyboardLayout(5)} {/* Правая часть (Октава 5) */}
        </div>
      </div>

      {/* 3. Громкость */}
      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Громкость</h2>

        <div className="group mb-6 flex items-center gap-4">
          {/* Обычная иконка медиа */}
          <SpeakerHigh size={24} className="shrink-0 text-text/80" />
          <VolumeSlider
            value={mediaVolume}
            onChange={(e) => setMediaVolume(Number(e.target.value))}
          />
        </div>

        <div className="group flex items-center gap-4">
          {/* Стилизованная некликабельная иконка пианино под ControlButton */}
          <div className="flex shrink-0 items-center justify-center rounded-md bg-text p-1.5 text-surface opacity-70">
            <PianoKeys size={20} weight="fill" />
          </div>
          <VolumeSlider
            value={pianoVolume}
            onChange={(e) => setPianoVolume(Number(e.target.value))}
          />
        </div>
      </div>

      {/* ✨ 4. ЗВУЧАНИЕ ПИАНИНО */}
      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Звучание пианино</h2>
        <div className="flex flex-col gap-5">
          <label className="group flex cursor-pointer items-start gap-3 select-none">
            <input
              type="radio"
              name="soundType"
              checked={pianoSoundType === 'synth'}
              onChange={(e) => {
                setPianoSoundType('synth');
                toneEngine.releaseAll(); // ✨ Глушим звуки при переключении
                e.target.blur();
              }}
              onPointerUp={(e) => e.currentTarget.blur()}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-text"
            />
            <div className="flex flex-col">
              <span className="text-[16px] transition-colors group-hover:text-primary">
                Синтезатор
              </span>
              <span className="mt-0.5 text-[14px] leading-tight text-white/40">
                Электронный звук. Работает моментально и не тратит интернет.
              </span>
            </div>
          </label>

          <label className="group flex cursor-pointer items-start gap-3 select-none">
            <input
              type="radio"
              name="soundType"
              checked={pianoSoundType === 'acoustic'}
              onPointerUp={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                setPianoSoundType('acoustic');
                toneEngine.releaseAll(); // ✨ Глушим звуки при переключении
                toneEngine.loadAcousticSamples(); // Запускаем закачку
                e.target.blur();
              }}
              className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-text"
            />
            <div className="flex w-full flex-col">
              <span
                className={cn(
                  'text-[16px] transition-colors',
                  !isPianoLoading && 'group-hover:text-primary',
                )}
              >
                Акустика
              </span>
              <span className="mt-0.5 text-[14px] leading-tight text-white/40">
                Реалистичный звук рояля. Требует однократной загрузки (~2 МБ).
              </span>

              {/* UI ПРОГРЕСС-БАРА */}
              {isPianoLoading && (
                <div className="animate-fade-in mt-3 w-full rounded-xl bg-surface p-3">
                  <div className="mb-1.5 flex justify-between text-[11px] font-semibold tracking-wider text-primary uppercase">
                    <span>Скачивание аудио...</span>
                    <span>{Math.round(pianoLoadProgress)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-text/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
                      style={{ width: `${Math.max(2, pianoLoadProgress)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* 5. Тема */}
      <div className="mb-10">
        <h2 className="mb-4 text-2xl">Тема</h2>
        <div className="flex items-center gap-6">
          <label className="group flex cursor-pointer items-center gap-2 select-none">
            <input
              type="radio"
              name="theme"
              onPointerUp={(e) => e.currentTarget.blur()}
              checked={theme === 'dark'}
              onChange={(e) => {
                setTheme('dark');
                e.target.blur();
              }}
              className="h-4 w-4 cursor-pointer accent-text"
            />
            <span className="transition-colors group-hover:text-primary">Темная</span>
          </label>
          <label className="group flex cursor-pointer items-center gap-2 text-white/40 select-none">
            <input
              type="radio"
              onPointerUp={(e) => e.currentTarget.blur()}
              name="theme"
              checked={theme === 'light'}
              onChange={(e) => {
                setTheme('light');
                e.target.blur();
              }}
              className="h-4 w-4 cursor-pointer accent-text"
            />
            <span className="transition-colors group-hover:text-primary">Светлая</span>
          </label>
        </div>
      </div>

      {/* 6. Данные */}
      <div className="mb-10 max-w-lg">
        <h2 className="mb-6 text-2xl">Данные</h2>

        <div className="relative mb-6 h-48 w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="var(--color-primary)"
              strokeWidth="6"
              strokeDasharray="283"
              // Формула сдвига (чем больше процент, тем меньше offset)
              strokeDashoffset={283 - (283 * storagePercent) / 100}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold md:text-2xl">{storageText}</span>
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
          onConfirm={handleClearAudio}
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
                Вы действительно хотите удалить <span className="text-primary">все данные</span> с
                этого сайта?
              </>
            }
            description="Вы потеряете все свои записи и прогресс без возможности восстановления"
            confirmText="Очистить всё"
            onConfirm={handleClearAll}
          />
        </div>
      </div>

      {isCustomizingMobile && <TabBarCustomization onClose={() => setIsCustomizingMobile(false)} />}
    </div>
  );
}

// Модалка
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
    <>
      <Button
        variant="outline"
        size="sm"
        color={isSecondary ? 'primary' : 'text'}
        onClick={() => setOpen(true)}
        className={cn(
          isSecondary
            ? 'bg-primary/20 text-text hover:bg-primary'
            : 'border-surface bg-surface text-text/40 hover:bg-primary hover:text-text',
        )}
      >
        {triggerText}
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        layout="vertical"
        title={title}
        description={<span className="text-text/40">{description}</span>}
        className="max-w-2xl rounded-[32px] p-8 md:p-10"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              color="primary"
              onClick={() => setOpen(false)}
              className="w-full px-4 sm:flex-1"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="md"
              color="primary"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
              className="w-full px-4 sm:flex-1"
            >
              {confirmText}
            </Button>
          </>
        }
      />
    </>
  );
}
