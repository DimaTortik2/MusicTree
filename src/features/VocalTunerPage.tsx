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
  Cloud,
  HardDrives,
} from '@phosphor-icons/react';
import { useVocalTuner, useVocalGlobalStore } from '@/features/vocalTuner/hooks/useVocalTuner';
import {
  MiniWaveform,
  PlayerWidget,
  TunerVisualizer,
} from '@/features/vocalTuner/ui/TunerComponents';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import type { Recording } from '@/features/vocalTuner/types';
import { toast } from '@/app/utils/toast';
import { Tooltip } from '@/shared/Tooltip';
import { MobileSidebarPortal } from '@/shared/MobileSidebarPortal';
import { SidebarIcon } from '@/shared/icons/sidebarIcon';
import { ViewToggle } from '@/shared/buttons/ViewToggle';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useFriendAudio } from '@/features/vocalTuner/hooks/useFriendAudio';

const RecordingSkeleton = () => (
  <div className="flex items-center justify-between rounded-2xl border-3 border-text/5 bg-transparent p-3 [.light_&]:border-line/60 [.light_&]:bg-surface/40">
    <div className="flex shrink-0 items-center justify-center p-1 text-text/10 [.light_&]:text-text/20">
      <Play weight="fill" size={20} />
    </div>
    <div className="flex h-6 flex-1 items-end gap-[3px] px-3">
      {[30, 60, 40, 90, 60, 40, 70, 50, 80, 40].map((h, idx) => (
        <motion.div
          key={idx}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-1.5 rounded-full bg-gradient-to-r from-text/5 via-text/15 to-text/5 bg-[length:400%_100%] [.light_&]:from-text/5 [.light_&]:via-text/15 [.light_&]:to-text/5"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
    <div className="shrink-0 p-1 text-text/10 [.light_&]:text-text/20">
      <DotsThreeVertical weight="bold" size={24} />
    </div>
  </div>
);

export function VocalTunerPage() {
  const {
    phase,
    recordings: myRecordings,
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
    isSaving,
    deletingIds,
  } = useVocalTuner();

  const isCloudMode = useVocalGlobalStore((s) => s.isCloudMode);
  const myHasLoaded = useVocalGlobalStore((s) => s.hasLoaded);

  const activeSharedFriend = useAppModeStore((s) => s.activeSharedFriend);
  const [viewTarget, setViewTarget] = useState<'me' | 'friend'>('me');
  const { recordings: friendRecordings, isLoading: isFriendLoading } = useFriendAudio(
    activeSharedFriend?.id
  );

  const recordings = viewTarget === 'friend' ? friendRecordings : myRecordings;
  const hasLoaded = viewTarget === 'me' ? myHasLoaded : !isFriendLoading;

  const [recToDelete, setRecToDelete] = useState<Recording | null>(null);
  const [recToRename, setRecToRename] = useState<Recording | null>(null);
  const [newName, setNewName] = useState('');
  const [isModeInfoOpen, setIsModeInfoOpen] = useState(false);

  const isRecording = phase === 'recording';
  const activeRecording = recordings.find((r) => r.id === playingId);

  useEffect(() => {
    if (phase === 'idle') {
      startMic();
    }
  }, []);

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
          iconContainerClassName="bg-primary/20 text-primary"
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
    // ВАЖНО: Добавлен min-h-0 для фикса бага с флексбоксами!
    <div className="flex min-h-0 w-full flex-1 flex-col p-4 pb-0 md:h-full md:w-80 md:flex-none md:border-r md:border-line">
      <div className="mb-5 flex h-auto shrink-0 items-center justify-between pl-1">
        {activeSharedFriend ? (
          /* made by gemini with antigravity */
          <ViewToggle
            viewTarget={viewTarget}
            onChange={setViewTarget}
            color="primary"
            className="flex-1 mr-3"
          />
        ) : (
          <div />
        )}
        {hasLoaded && (
          <button
            onClick={() => setIsModeInfoOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-text transition-colors"
          >
            {isCloudMode ? (
              <Cloud
                size={16}
                weight="fill"
                className="text-text/40 transition-colors hover:text-primary"
              />
            ) : (
              <HardDrives
                size={16}
                weight="fill"
                className="text-text/40 transition-colors hover:text-primary"
              />
            )}
          </button>
        )}
      </div>

      <div className="custom-scroll flex-1 overflow-y-auto pr-2 pb-24">
        <AnimatePresence mode="wait">
          {!hasLoaded ? (
            <motion.div
              key="loading-skeletons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex flex-col gap-3"
            >
              {[1, 2, 3, 4].map((i) => (
                <RecordingSkeleton key={`load-${i}`} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="recordings-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3"
            >
              {recordings.length === 0 && !(isSaving && isCloudMode) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-10 text-center text-sm text-text/40"
                >
                  Записей пока нет
                </motion.div>
              )}

              <AnimatePresence mode="popLayout" initial={false}>
                {isSaving && isCloudMode && (
                  <motion.div
                    key="saving-skeleton"
                    layout="position"
                    initial={{ opacity: 0, y: -15, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96, y: -15 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  >
                    <RecordingSkeleton />
                  </motion.div>
                )}

                {recordings.map((rec) => {
                  const isActive = playingId === rec.id;
                  const isCurrentlyPlaying = isActive && isPlaying;
                  const showDeletingSkeleton = deletingIds.includes(rec.id) && isCloudMode;

                  return (
                    <motion.div
                      key={rec.id}
                      layout="position"
                      initial={{ opacity: 0, y: 15, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, y: -15, transition: { duration: 0.15 } }}
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {showDeletingSkeleton ? (
                          <motion.div
                            key="skeleton"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 0.5, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, filter: 'blur(4px)' }}
                            transition={{ duration: 0.2 }}
                            className="pointer-events-none grayscale"
                          >
                            <RecordingSkeleton />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, filter: 'blur(4px)' }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-1"
                          >
                            <div
                              className={cn(
                                'group flex cursor-pointer items-center justify-between rounded-2xl border-3 p-3 transition-all duration-300',
                                isActive
                                  ? 'border-primary bg-primary text-white shadow-md'
                                  : 'border-primary bg-transparent text-text hover:bg-primary/10 [.light_&]:border-line [.light_&]:bg-surface [.light_&]:hover:border-primary/40 [.light_&]:hover:bg-primary/5',
                              )}
                              onClick={() => togglePlay(rec)}
                            >
                              <div
                                className={cn(
                                  'flex shrink-0 items-center justify-center p-1 transition-colors',
                                  isActive
                                    ? 'text-white hover:text-white/70'
                                    : 'text-text group-hover:text-primary',
                                )}
                              >
                                {isCurrentlyPlaying ? (
                                  <Pause weight="fill" size={20} />
                                ) : (
                                  <Play weight="fill" size={20} />
                                )}
                              </div>

                              <MiniWaveform active={isActive} />

                              {viewTarget === 'me' && (
                                <button
                                  className={cn(
                                    'shrink-0 cursor-pointer p-1 transition-colors outline-none',
                                    isActive
                                      ? 'text-white hover:opacity-70'
                                      : 'text-text group-hover:text-primary',
                                  )}
                                  onClick={(e) => handleThreeDotsClick(e, rec)}
                                >
                                  <DotsThreeVertical weight="bold" size={24} />
                                </button>
                              )}
                            </div>

                            <AnimatePresence initial={false}>
                              {isActive && viewTarget === 'me' && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mx-1 mt-1 flex items-center justify-between rounded-xl bg-primary px-4 py-2 text-white">
                                    <button
                                      className="cursor-pointer p-1 transition-opacity hover:opacity-70"
                                      title="Удалить"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRecToDelete(rec);
                                      }}
                                    >
                                      <Trash size={18} weight="bold" />
                                    </button>
                                    <div className="flex gap-4">
                                      <button
                                        className="cursor-pointer p-1 transition-opacity hover:opacity-70"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRecToRename(rec);
                                          setNewName(rec.name);
                                        }}
                                      >
                                        <PencilSimple size={18} weight="bold" />
                                      </button>
                                      <button
                                        className="cursor-pointer p-1 transition-opacity hover:opacity-70"
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
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-text">
      <aside className="hidden h-full shrink-0 flex-col md:flex">{sidebarContent}</aside>

      <MobileSidebarPortal
        isOpen={isMobileSidebarOpen}
        onClose={() => {
          setIsMobileSidebarOpen(false);
          toast.dismiss();
        }}
      >
        {sidebarContent}
        <AnimatePresence>
          {activeRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: 20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden border-t border-line bg-background p-4 pb-8 backdrop-blur-md"
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

      <main className="relative flex flex-1 flex-col">
        <div className="absolute top-6 left-5 z-10 md:hidden">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(true);
              toast.dismiss();
            }}
            className="-m-2 p-2 text-text/60 transition-colors hover:text-text"
          >
            <SidebarIcon />
          </button>
        </div>

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

        <div className="flex flex-1 items-center justify-center">
          <TunerVisualizer
            pitchDataRef={pitchDataRef}
            actions={
              <button
                disabled={viewTarget === 'friend'}
                onClick={() => {
                  if (viewTarget === 'friend') return;
                  if (isRecording) {
                    stopRec();
                  } else {
                    if (phase === 'idle') {
                      startMic().then(() => startRec());
                    } else {
                      startRec();
                    }
                  }
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-center bg-primary text-white transition-all duration-300 hover:scale-105 active:scale-95',
                  'h-[64px] w-[64px] rounded-[24px] md:h-[72px] md:w-[72px] md:rounded-[28px]',
                  isRecording && 'animate-pulse bg-text text-primary',
                  viewTarget === 'friend' && 'opacity-30 cursor-not-allowed pointer-events-none bg-text/10 text-text/30'
                )}
              >
                {isRecording ? (
                  <Tooltip content="Стоп" position="right">
                    <Power size={32} weight="bold" />
                  </Tooltip>
                ) : (
                  <Tooltip content="Запись" position="right">
                    <RecordIcon size={36} weight="fill" />
                  </Tooltip>
                )}
              </button>
            }
          />
        </div>
      </main>

      <Modal
        isOpen={isModeInfoOpen}
        onClose={() => setIsModeInfoOpen(false)}
        layout="horizontal"
        title={isCloudMode ? 'Облачный режим' : 'Локальный режим'}
        description={
          isCloudMode
            ? 'Ваши аудиозаписи автоматически синхронизируются с облаком. Они надежно защищены и доступны с любого устройства при входе в аккаунт.'
            : 'Ваши аудиозаписи сохраняются только на этом устройстве в этом браузере. Если вы очистите кэш браузера или поменяете устройство, они не перенесутся.'
        }
        icon={
          isCloudMode ? <Cloud size={32} weight="fill" /> : <HardDrives size={32} weight="fill" />
        }
        iconContainerClassName={'bg-primary text-white'}
        actions={
          <Button
            variant="solid"
            color="primary"
            onClick={() => setIsModeInfoOpen(false)}
            className="w-full"
          >
            Понятно
          </Button>
        }
      />

      <Modal
        isOpen={!!recToDelete}
        onClose={() => setRecToDelete(null)}
        layout="vertical"
        className="max-w-[700px] rounded-3xl bg-surface !p-8"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="font-normal tracking-wide text-text/40">
            Вы действительно хотите удалить эту запись?
          </span>

          <div className="mt-1.5 flex items-center gap-4">
            <Trash size={32} weight="bold" className="shrink-0 text-primary" />
            <span className="truncate text-2xl font-medium text-text md:text-[26px]">
              {recToDelete?.name}
            </span>
          </div>

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
                  deleteRec(recToDelete);
                  setRecToDelete(null);
                }
              }}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!recToRename}
        onClose={() => setRecToRename(null)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="text-sm font-normal tracking-wide text-text/40">
            Введите новое название для аудиофайла
          </span>

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
