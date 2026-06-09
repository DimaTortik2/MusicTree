import { useState, useEffect } from 'react';
import { SpeakerHigh, PianoKeys, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useActiveKeysStore } from '@/app/store/useActiveKeysStore';
import { useTheme } from '@/app/providers/ThemeProvider';
import { TabBarCustomization } from '@/pages/settings/TabBarCustomization';
import { cn } from '@/app/utils/cn';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { VolumeSlider } from '@/shared/VolumeSlider';
import { toneEngine } from '@/shared/lib/toneEngine';
import { useNavigate } from 'react-router-dom';
import { Radio } from '@/shared/buttons/Radio';
import { toast } from '@/app/utils/toast';
import { UserProfileMenu } from '@/shared/UserProfileMenu';
import { useAuthStore } from '@/app/store/authStore';
import { supabase } from '@/shared/lib/supabase';

// Форматирование клавиш
const formatKeyName = (code: string | null) => {
  if (!code) return '—';
  let text = code.replace('Key', '').replace('Digit', '');

  const symbolMap: Record<string, string> = {
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backslash: '\\',
    Slash: '/',
    Comma: ',',
    Period: '.',
    Backquote: '`',
  };

  Object.keys(symbolMap).forEach((key) => {
    if (text.includes(key)) {
      text = text.replace(key, symbolMap[key]);
    }
  });

  return text;
};

// Генерация октавы
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
    uiSize,
    setUiSize,
    enableAmbientGlow,
    setEnableAmbientGlow,
    wallpaperMouseTracking,
    setWallpaperMouseTracking,
  } = useProgressStore();

  const [isCustomizingMobile, setIsCustomizingMobile] = useState(false);
  const [listeningNote, setListeningNote] = useState<string | null>(null);
  const [storageText, setStorageText] = useState('0 МБ');
  const [storagePercent, setStoragePercent] = useState(0);
  const navigate = useNavigate();

  // --- Оценка занимаемой памяти в облаке Supabase ---
  useEffect(() => {
    async function checkCloudStorage() {
      const user = useAuthStore.getState().user;
      if (!user) return;

      try {
        // Получаем список всех файлов в папке юзера
        const { data, error } = await supabase.storage.from('audio_records').list(user.id);

        if (data && !error) {
          // Суммируем вес всех файлов
          const totalBytes = data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
          const mb = totalBytes / (1024 * 1024);

          if (mb > 1024) {
            setStorageText(`${(mb / 1024).toFixed(1)} ГБ`);
          } else {
            setStorageText(`${mb > 0 && mb < 1 ? '<1' : Math.round(mb)} МБ`);
          }

          // Считаем процент от бесплатного 1 ГБ (1024 МБ) в Supabase
          let percent = (mb / 1024) * 100;
          if (mb > 0 && percent < 2) percent = 2; // минимальная дуга
          setStoragePercent(Math.min(percent, 100));
        }
      } catch (e) {
        console.error('Ошибка получения данных о хранилище:', e);
      }
    }

    checkCloudStorage();
  }, []);

  // Логика переназначения клавиш с защитой системных кнопок
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

      toneEngine.releaseAll();
      useActiveKeysStore.getState().clearKeys();

      updatePianoBinding(listeningNote, e.code);
      setListeningNote(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningNote, updatePianoBinding]);

  // --- Очистка аудио из облака ---
  const handleClearAudio = async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      // 1. Узнаем, какие файлы есть в папке
      const { data: files } = await supabase.storage.from('audio_records').list(user.id);

      // 2. Удаляем файлы с жесткого диска облака
      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from('audio_records').remove(filePaths);
      }

      // 3. Удаляем записи о файлах из базы данных
      await supabase.from('audio_tracks').delete().eq('user_id', user.id);

      // 4. Обновляем UI
      setStorageText('0 МБ');
      setStoragePercent(0);
      toast.success('Аудиофайлы удалены');
    } catch (e) {
      console.error('Ошибка очистки аудио:', e);
      toast.error('Произошла ошибка при удалении');
    }
  };

  // --- Полный сброс (Аудио + Прогресс) ---
  const handleClearAll = async () => {
    try {
      const user = useAuthStore.getState().user;
      if (user) {
        // 1. Чистим файлы
        const { data: files } = await supabase.storage.from('audio_records').list(user.id);
        if (files && files.length > 0) {
          const filePaths = files.map((f) => `${user.id}/${f.name}`);
          await supabase.storage.from('audio_records').remove(filePaths);
        }
        await supabase.from('audio_tracks').delete().eq('user_id', user.id);

        // 2. Сбрасываем прогресс в БД до пустого объекта
        await supabase
          .from('profiles')
          .update({
            progress_state: {},
            shortcut_state: {},
          })
          .eq('id', user.id);
      }

      // 3. Чистим локальные данные и перезагружаем приложение
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      console.error('Ошибка полного сброса:', e);
      toast.error('Произошла ошибка при удалении данных');
    }
  };

  const renderKeyboardLayout = (octave: number) => {
    const keys = getSettingsOctaveKeys(octave);

    return (
      <div className="flex gap-0.5 lg:gap-1">
        {keys.map((item) => {
          const isListeningWhite = listeningNote === item.baseNote;
          const isListeningBlack = item.hasBlack && listeningNote === item.blackBaseNote;
          const isWhitePressed = activeKeys.has(item.baseNote);
          const isBlackPressed = item.hasBlack && activeKeys.has(item.blackBaseNote!);

          return (
            <div
              key={item.baseNote}
              className="relative flex shrink-0 select-none [.light_&]:rounded-[28px] [.light_&]:bg-surface [.light_&]:shadow-[0_24px_64px_rgba(29,21,32,0.06)]"
            >
              {/* Белая клавиша */}
              <div
                onClick={() => setListeningNote(isListeningWhite ? null : item.baseNote)}
                className={cn(
                  'relative flex h-[140px] w-[32px] cursor-pointer flex-col justify-end rounded-b-[6px] pb-3 transition-colors duration-100 ease-in-out lg:h-[180px] lg:w-[46px]',
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
                    setListeningNote(isListeningBlack ? null : item.blackBaseNote!);
                  }}
                  className={cn(
                    'absolute top-0 -right-[11px] z-10 flex h-[85px] w-[20px] cursor-pointer flex-col justify-end rounded-b-[4px] pb-2 transition-colors duration-100 ease-in-out lg:-right-[16px] lg:h-[110px] lg:w-[28px]',
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
                      isListeningBlack ? 'text-white' : 'text-white/40',
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
      <UserProfileMenu />

      <div className="mb-10 md:hidden">
        <h2 className="mb-1 text-2xl">Тап-бар</h2>
        <p className="mb-4 text-[14px] leading-tight text-text/40">
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

      <div className="mb-10 hidden overflow-hidden md:block">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="text-2xl">Клавиатура</h2>
          <span className="text-sm text-text/40">Нажмите на ноту и переназначьте клавишу</span>
          <button
            onClick={resetPianoBindings}
            title="Сбросить раскладку"
            className="cursor-pointer text-text/40 transition-colors outline-none hover:text-text active:scale-95"
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
          {renderKeyboardLayout(4)}
          {renderKeyboardLayout(5)}
        </div>
      </div>

      <div className="mb-10 hidden md:block">
        <h2 className="mb-1 text-2xl">Горячие клавиши</h2>
        <p className="mb-4 max-w-sm text-[14px] leading-tight text-text/40">
          Настройте глобальные комбинации клавиш для быстрого доступа к функциям сайта из любого
          раздела.
        </p>
        <Button variant="outline" size="sm" color="text" onClick={() => navigate('/app/shortcuts')}>
          Настроить клавиши
        </Button>
      </div>

      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Громкость</h2>
        <div className="group mb-6 flex items-center gap-4">
          <SpeakerHigh size={24} className="shrink-0 text-text/80" />
          <VolumeSlider
            value={mediaVolume}
            onChange={(e) => setMediaVolume(Number(e.target.value))}
          />
        </div>
        <div className="group flex items-center gap-4">
          <div className="flex shrink-0 items-center justify-center rounded-md bg-text p-1.5 text-surface opacity-70">
            <PianoKeys size={20} weight="fill" />
          </div>
          <VolumeSlider
            value={pianoVolume}
            onChange={(e) => setPianoVolume(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Звучание пианино</h2>
        <div className="flex flex-col gap-5">
          <Radio
            name="soundType"
            checked={pianoSoundType === 'synth'}
            onChange={(e) => {
              setPianoSoundType('synth');
              toneEngine.releaseAll();
              e.target.blur();
            }}
            label="Синтезатор"
            description="Электронный звук. Работает моментально и не тратит интернет."
          />
          <Radio
            name="soundType"
            checked={pianoSoundType === 'acoustic'}
            onChange={(e) => {
              setPianoSoundType('acoustic');
              toneEngine.releaseAll();
              toneEngine.loadAcousticSamples();
              e.target.blur();
            }}
            label="Акустика"
            description="Реалистичный звук рояля. Требует однократной загрузки (~2 МБ)."
          />
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
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl">Тема</h2>
        <div className="flex items-center gap-6">
          <Radio
            name="theme"
            checked={theme === 'dark'}
            onChange={(e) => {
              setTheme('dark');
              e.target.blur();
            }}
            label="Темная"
          />
          <Radio
            name="theme"
            checked={theme === 'light'}
            onChange={(e) => {
              setTheme('light');
              e.target.blur();
            }}
            label="Светлая"
          />
        </div>
      </div>

      <div className="mb-10 max-w-sm">
        <h2 className="mb-4 text-2xl">Свечение фона</h2>
        <div className="flex items-center gap-6">
          <Radio
            name="ambientGlow"
            checked={enableAmbientGlow === true}
            onChange={(e) => {
              setEnableAmbientGlow(true);
              e.target.blur();
            }}
            label="Включено"
          />
          <Radio
            name="ambientGlow"
            checked={enableAmbientGlow === false}
            onChange={(e) => {
              setEnableAmbientGlow(false);
              e.target.blur();
            }}
            label="Выключено"
          />
        </div>
        <div className="mt-8 hidden flex-col gap-4 md:flex">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl text-text">Параллакс обоев</h3>
            <p className="text-[14px] leading-tight text-text/40">
              Паттерн на фоне будет плавно смещаться вслед за курсором мыши.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Radio
              name="wallpaperTracking"
              checked={wallpaperMouseTracking === true}
              onChange={(e) => {
                setWallpaperMouseTracking(true);
                e.target.blur();
              }}
              label="Включен"
            />
            <Radio
              name="wallpaperTracking"
              checked={wallpaperMouseTracking === false}
              onChange={(e) => {
                setWallpaperMouseTracking(false);
                e.target.blur();
              }}
              label="Выключен"
            />
          </div>
        </div>
      </div>

      <div className="mb-10 max-w-md">
        <h2 className="mb-4 text-2xl">Масштаб интерфейса</h2>
        <div className="flex w-full rounded-[14px] bg-surface p-1.5 shadow-inner">
          {(['xs', 'sm', 'md', 'lg'] as const).map((size) => {
            const labels = { xs: 'Мини', sm: 'Мелкий', md: 'Стандарт', lg: 'Крупный' };
            const isActive = uiSize === size;
            return (
              <button
                key={size}
                onClick={() => setUiSize(size)}
                className={cn(
                  'flex-1 cursor-pointer rounded-[10px] px-1 py-2 text-[12px] font-medium transition-all duration-200 outline-none sm:text-[14px]',
                  isActive
                    ? 'bg-text text-surface shadow-sm'
                    : 'text-text/40 hover:bg-text/5 hover:text-text',
                )}
              >
                {labels[size]}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[14px] leading-tight text-text/40">
          Изменяет размер шрифтов и отступов. Выберите «Мини» или «Мелкий», если элементы не
          помещаются на экране телефона.
        </p>
      </div>

      <div className="mb-10 max-w-lg">
        <h2 className="mb-6 text-2xl">Данные облака (Supabase)</h2>

        <div className="relative mb-6 h-48 w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="6"
              className="text-text/20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="var(--color-primary)"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * storagePercent) / 100}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold md:text-2xl">{storageText}</span>
          </div>
        </div>

        <p className="mb-1 text-[16px]">Лимит хранилища (1 ГБ)</p>
        <p className="mb-4 text-[14px] leading-tight text-text/40">
          Нажав на кнопку ниже, вы удалите свои аудиозаписи из базы данных. Прогресс уроков
          останется нетронутым.
        </p>

        <DeleteDialog
          triggerText="Удалить все аудиофайлы"
          title="Удалить все аудиозаписи?"
          description="Они будут стерты из облака без возможности восстановления."
          confirmText="Очистить аудиофайлы"
          onConfirm={handleClearAudio}
          isSecondary
        />

        <div className="mt-8">
          <p className="mb-1 text-[16px]">
            Также вы можете удалить <span className="text-primary">все свои данные</span> с серверов
            (прогресс, тесты и аудиофайлы)
          </p>
          <p className="mb-4 text-[14px] leading-tight text-text/40">
            Данные будут подлежать удалению без возможности восстановления
          </p>
          <DeleteDialog
            triggerText="Удалить все свои данные"
            title={
              <>
                Удалить <span className="text-primary">абсолютно всё</span>?
              </>
            }
            description="Вы потеряете все свои записи и прогресс."
            confirmText="Очистить всё"
            onConfirm={handleClearAll}
          />
        </div>
      </div>

      {isCustomizingMobile && <TabBarCustomization onClose={() => setIsCustomizingMobile(false)} />}
    </div>
  );
}

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
