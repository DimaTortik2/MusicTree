import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/app/utils/cn';
import {
  Play,
  Pause,
  Power,
  Trash,
  PencilSimple,
  DownloadSimple,
  DotsThreeVertical,
  Record as RecordIcon,
  MicrophoneSlash,
} from '@phosphor-icons/react';
import { useVocalTuner } from '@/features/vocalTuner/hooks/useVocalTuner';
import {
  MiniWaveform,
  MobileSidebarPortal,
  PlayerWidget,
  SidebarIcon,
  TunerVisualizer,
} from '@/features/vocalTuner/ui/TunerComponents';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import type { Recording } from '@/features/vocalTuner/types';
import { toast } from '@/app/utils/toast';

export function VocalTunerPage() {
  const {
    phase,
    recordings,
    playingId,
    isPlaying,
    micError,
    pitchDataRef,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    currentTime,
    duration,
    startMic,
    startRec,
    stopRec,
    togglePlay,
    handleThreeDotsClick,
    deleteRec,
    downloadRec,
    handleSeek,
    handleSeekStart,
    handleSeekEnd,
    renameRec,
  } = useVocalTuner();

    const [recToDelete, setRecToDelete] = useState<Recording | null>(null);
    const [recToRename, setRecToRename] = useState<Recording | null>(null);
    const [newName, setNewName] = useState('');

  const isRecording = phase === 'recording';
  const activeRecording = recordings.find((r) => r.id === playingId);

  // --- АВТОСТАРТ МИКРОФОНА ПРИ ЗАХОДЕ НА СТРАНИЦУ ---
  useEffect(() => {
    if (phase === 'idle') {
      startMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ОБРАБОТКА ОШИБОК ДОСТУПА (ТЗ) ---
  if (micError) {
    let title = '';
    let desc = '';
    if (micError === 'denied') {
      title = 'Вы заблокировали доступ';
      desc =
        'Чтобы продолжить, нажмите на значок замочка в адресной строке браузера, переключите тумблер микрофона в положение ВКЛ и обновите страницу';
    } else if (micError === 'not_found') {
      title = 'Микрофон не обнаружен';
      desc = 'Пожалуйста, подключите записывающее устройство';
    } else if (micError === 'busy') {
      title = 'Микрофон занят другим приложением';
      desc = 'Пожалуйста, закройте программы, использующие аудио, и попробуйте снова';
    }

    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <Modal
          inline
          layout="horizontal"
          title={title}
          description={desc}
          icon={<MicrophoneSlash size={32} weight="fill" />}
          iconContainerClassName="bg-primary/20 text-primary" // Розовый фон с розовой иконкой
        >
          <Button
            variant="solid"
            color="primary"
            onClick={() => window.location.reload()}
            className="mt-4 sm:mt-0"
          >
            Обновить страницу
          </Button>
        </Modal>
      </div>
    );
  }

  const sidebarContent = (
    <div className="custom-scroll flex-1 space-y-3 overflow-y-auto px-4 py-6">
      {recordings.map((rec) => {
        const isActive = playingId === rec.id;
        const isCurrentlyPlaying = isActive && isPlaying;

        return (
          <div key={rec.id} className="flex flex-col gap-1">
            <div
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-2xl border-3 p-3 transition-all duration-200',
                isActive
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary bg-transparent text-white hover:bg-primary/10',
              )}
              onClick={() => togglePlay(rec)}
            >
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center p-1 transition-colors hover:text-primary',
                  isActive && 'hover:text-surface',
                )}
              >
                {isCurrentlyPlaying ? (
                  <Pause weight="fill" size={20} />
                ) : (
                  <Play weight="fill" size={20} />
                )}
              </div>

              <MiniWaveform active={isActive} />

              <button
                className={cn(
                  'shrink-0 cursor-pointer p-1 opacity-80 transition-colors hover:text-primary hover:opacity-100',
                  isActive && 'hover:text-surface',
                )}
                onClick={(e) => handleThreeDotsClick(e, rec)}
              >
                <DotsThreeVertical weight="bold" size={24} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isActive && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mx-1 mt-1 flex items-center justify-between rounded-xl bg-primary px-4 py-2 text-white/90">
                    <button
                      className={cn(
                        'cursor-pointer p-1 transition-colors hover:text-white',
                        isActive && 'hover:text-surface',
                      )}
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecToDelete(rec); // Открываем модалку удаления
                      }}
                    >
                      <Trash size={18} weight="bold" />
                    </button>
                    <div className="flex gap-4">
                      <button
                        className={cn(
                          'cursor-pointer p-1 transition-colors hover:text-white',
                          isActive && 'hover:text-surface',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecToRename(rec); // Открываем модалку переименования
                          setNewName(rec.name); // Подставляем текущее имя
                        }}
                      >
                        <PencilSimple size={18} weight="bold" />
                      </button>
                      <button
                        className={cn(
                          'cursor-pointer p-1 transition-colors hover:text-white',
                          isActive && 'hover:text-surface',
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadRec(rec);
                        }}
                      >
                        <DownloadSimple size={18} weight="bold" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-text">
      {/* --- ДЕСКТОПНЫЙ САЙДБАР --- */}
      <aside className="relative z-10 hidden w-[320px] flex-col border-r-3 border-white/10 bg-background md:flex">
        {sidebarContent}
      </aside>

      {/* --- МОБИЛЬНЫЙ САЙДБАР --- */}
      <MobileSidebarPortal
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      >
        {sidebarContent}
        <AnimatePresence>
          {activeRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden border-t border-white/10 bg-background p-4 pb-8 backdrop-blur-md"
            >
              <PlayerWidget
                recording={activeRecording}
                isPlaying={isPlaying}
                onTogglePlay={() => togglePlay(activeRecording)}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                onSeekStart={handleSeekStart}
                onSeekEnd={handleSeekEnd}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </MobileSidebarPortal>

      {/* --- ГЛАВНАЯ ОБЛАСТЬ --- */}
      <main className="relative flex flex-1 flex-col">
        <div className="absolute top-6 left-5 z-10 md:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="-m-2 p-2 text-white opacity-70 transition-opacity hover:opacity-100"
          >
            <SidebarIcon />
          </button>
        </div>

        {/* --- ДЕСКТОПНЫЙ ПЛЕЕР --- */}
        <AnimatePresence>
          {activeRecording && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute top-12 left-1/2 z-[1000] hidden w-full max-w-[600px] md:block"
            >
              <PlayerWidget
                recording={activeRecording}
                isPlaying={isPlaying}
                onTogglePlay={() => togglePlay(activeRecording)}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                onSeekStart={handleSeekStart}
                onSeekEnd={handleSeekEnd}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- ЦЕНТРАЛЬНЫЙ ТЮНЕР И КНОПКА ЗАПИСИ --- */}
        <div className="flex flex-1 items-center justify-center">
          <TunerVisualizer
            pitchDataRef={pitchDataRef} // <-- Теперь передаем Ref напрямую!
            actions={
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRec(); // Если пишем — останавливаем
                  } else {
                    // Страховка: если микрофон почему-то отвалился (idle), стартуем его перед записью
                    if (phase === 'idle') {
                      startMic().then(() => startRec());
                    } else {
                      startRec();
                    }
                  }
                }}
                className={cn(
                  'flex items-center justify-center bg-primary text-white transition-all duration-300 hover:scale-105 active:scale-95',
                  'h-[64px] w-[64px] rounded-[24px] md:h-[72px] md:w-[72px] md:rounded-[28px]',
                  isRecording && 'animate-pulse bg-primary/90',
                )}
              >
                {isRecording ? (
                  <Power size={32} weight="bold" />
                ) : (
                  <RecordIcon size={36} weight="fill" />
                )}
              </button>
            }
          />
        </div>
      </main>
      {/* --- МОДАЛКА ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ --- */}
      <Modal
        isOpen={!!recToDelete}
        onClose={() => setRecToDelete(null)}
        layout="vertical"
        // Добавлен модификатор "!" перед p-2, чтобы гарантированно сбросить внутренние отступы родителя
        className="max-w-[700px] rounded-3xl bg-surface p-8"
      >
        <div className="flex flex-col gap-6 text-left">
          {/* Маленький подзаголовок сверху */}
          <span className="font-normal tracking-wide text-text/40">
            Вы действительно хотите удалить эту запись?
          </span>

          {/* Строка с контурной розовой иконкой мусорки и названием файла */}
          <div className="mt-1.5 flex items-center gap-4">
            <Trash size={32} weight="bold" className="shrink-0 text-primary" />
            <span className="truncate text-2xl font-medium text-text md:text-[26px]">
              {recToDelete?.name}
            </span>
          </div>

          {/* Кнопки действий */}
          <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="primary"
              onClick={() => setRecToDelete(null)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="primary"
              onClick={() => {
                if (recToDelete) {
                  deleteRec(recToDelete.id);
                  setRecToDelete(null);
                  toast.success('Запись удалена');
                }
              }}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- МОДАЛКА ПЕРЕИМЕНОВАНИЯ --- */}
      <Modal
        isOpen={!!recToRename}
        onClose={() => setRecToRename(null)}
        layout="vertical"
        // Убран "border border-white/5", заменены "p-8 md:p-10" на "!p-2" для соответствия первой модалке
        className="max-w-lg rounded-[32px] bg-surface p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          {/* Маленький подзаголовок сверху */}
          <span className="text-sm font-normal tracking-wide text-text/40">
            Введите новое название для аудиофайла
          </span>

          {/* Прозрачный инпут с фиолетовым нижним подчеркиванием */}
          <div className="mt-2 w-full">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && recToRename && newName.trim()) {
                  renameRec(recToRename.id, newName);
                  setRecToRename(null);
                }
              }}
              placeholder="Имя записи..."
              autoFocus
              className="w-full border-b-2 border-accent bg-transparent pb-2.5 text-2xl font-medium text-text transition-colors outline-none focus:border-accent"
            />
          </div>

          {/* Кнопки действий */}
          <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="accent"
              onClick={() => setRecToRename(null)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="accent"
              onClick={() => {
                if (recToRename && newName.trim()) {
                  renameRec(recToRename.id, newName);
                  setRecToRename(null);
                }
              }}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Применить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
