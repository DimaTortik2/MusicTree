import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { useSearchParams } from 'react-router-dom';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { supabase } from '@/shared/lib/supabase';
import {
  UserMinus,
  UserPlus,
  MagnifyingGlass,
  QrCode,
  Check,
  X,
  Scan,
  ShareNetwork,
  List as SidebarSimple,
  CameraSlash, // Иконка для экрана ошибки камеры
} from '@phosphor-icons/react';
import { useAuthStore } from '@/app/store/authStore';
import { Avatar } from '@/shared/Avatar';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { useFriends, type FriendProfile } from '@/features/friends/hooks/useFriends';
import { MobileSidebarPortal } from '@/shared/MobileSidebarPortal';
import { toast } from '@/app/utils/toast';

export function FriendsPage() {
  const { profile } = useAuthStore();
  const {
    friends,
    notifications,
    searchResults,
    searchUsers,
    sendRequest,
    acceptRequest,
    removeFriend,
    dismissNotification,
  } = useFriends();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<FriendProfile | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Стейты для камеры
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isProcessingScan = useRef(false);

  // Debounce для ручного поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Обработка перехода по ссылке
  useEffect(() => {
    const addUsername = searchParams.get('add');
    if (addUsername && profile) {
      handleAddByUsername(addUsername);
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, profile]);

  const displayList = searchQuery.trim() ? searchResults : friends;
  const isSearchMode = !!searchQuery.trim();

  const handleAddByUsername = async (targetUsername: string) => {
    if (targetUsername === profile?.username) {
      toast.error('Вы не можете добавить самого себя');
      return;
    }

    const { data } = await supabase.rpc('search_users_secure', {
      search_query: targetUsername,
    });

    if (data && data.length > 0) {
      const targetUser = data.find((u: any) => u.username === targetUsername);

      if (targetUser) {
        if (friends.some((f) => f.id === targetUser.id)) {
          toast.info('Пользователь уже у вас в друзьях');
        } else {
          await sendRequest(targetUser.id);
        }
      } else {
        toast.error('Пользователь не найден');
      }
    } else {
      toast.error('Пользователь не найден');
    }
  };

  const handleShareQR = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Добавь меня в друзья в Music Tree!',
          url: `${window.location.origin}/app/friends?add=${profile?.username}`,
        })
        .catch(console.error);
    }
  };

  // Плавное закрытие сканера с очисткой ошибки
  const closeScanner = () => {
    setIsScannerOpen(false);
    setTimeout(() => setCameraError(null), 300);
  };

  // Обработка ошибок доступа к камере
  const handleCameraError = (error: unknown) => {
    console.error('Ошибка сканера:', error);
    const err = error as Error;

    if (err?.name === 'NotAllowedError') {
      setCameraError('Доступ к камере запрещен. Разрешите его в настройках вашего браузера.');
    } else if (err?.name === 'NotFoundError') {
      setCameraError('Камера не найдена на вашем устройстве.');
    } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      setCameraError('Камера в данный момент используется другим приложением.');
    } else {
      setCameraError(
        'Мессенджер или браузер блокирует камеру. Откройте ссылку в стандартном браузере (Safari / Chrome).',
      );
    }
  };

  const sidebarContent = (
    <div className="flex min-h-0 w-full flex-1 flex-col px-6 pt-6 pb-24 md:h-full md:w-[340px] md:flex-none md:border-r-[3px] md:border-line md:bg-background/50">
      <h2 className="mb-6 text-2xl font-medium text-text">Ваши уведомления</h2>

      <div className="custom-scroll flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {notifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-10 text-center text-sm text-text/40"
            >
              Уведомлений пока нет
            </motion.div>
          )}

          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              layout="position"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
              className="flex flex-col rounded-2xl border-3 border-primary bg-transparent p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={notif.sender?.full_name || 'Удаленный аккаунт'}
                  src={notif.sender?.avatar_url}
                  lqip={notif.sender?.avatar_lqip}
                  forceGradient={notif.sender?.use_gradient}
                  className="size-10"
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate text-[15px] font-medium text-text">
                    {notif.sender?.full_name || 'Неизвестный'}
                  </span>
                  <span className="truncate text-xs text-text/40">
                    {notif.sender?.username ? `@${notif.sender.username}` : 'Удален'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                {notif.type === 'friend_request' ? (
                  <>
                    <button
                      onClick={() => acceptRequest(notif.id, notif.sender_id)}
                      className="group flex cursor-pointer items-center gap-2 outline-none"
                    >
                      <Check
                        weight="bold"
                        size={20}
                        className="text-primary transition-opacity group-hover:opacity-40"
                      />
                      <span className="text-sm font-medium text-primary transition-opacity group-hover:opacity-40">
                        Принять
                      </span>
                    </button>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="cursor-pointer text-primary transition-opacity outline-none hover:opacity-40"
                    >
                      <X weight="bold" size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-text/60">Удалил вас из друзей</span>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="cursor-pointer text-primary transition-opacity outline-none hover:opacity-40"
                    >
                      <X weight="bold" size={20} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-text">
      {/* Десктопный сайдбар */}
      <aside className="hidden h-full shrink-0 flex-col md:flex">{sidebarContent}</aside>

      {/* Мобильный сайдбар */}
      <MobileSidebarPortal
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      >
        {sidebarContent}
      </MobileSidebarPortal>

      <main className="relative flex flex-1 flex-col items-center px-4 pt-20 pb-24 md:pt-24">
        <div className="absolute top-6 left-5 z-10 md:hidden">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="-m-2 p-2 text-text/60 transition-colors outline-none hover:text-text"
          >
            <SidebarSimple size={28} />
          </button>
        </div>

        {/* Поиск */}
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <MagnifyingGlass size={22} className="text-primary" weight="bold" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по никнейму или @юзернейму..."
            className="w-full border-b-[3px] border-primary bg-transparent py-3 pr-14 pl-12 text-lg font-medium text-text transition-colors outline-none placeholder:text-text/20"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-text/20 text-text transition-all outline-none hover:bg-text hover:text-surface"
            >
              <QrCode size={20} weight="fill" />
            </button>
          </div>
        </div>

        {/* Список друзей / результатов */}
        <div className="custom-scroll mt-8 flex w-full max-w-xl flex-1 flex-col gap-4 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {displayList.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-10 text-center text-text/40"
              >
                {isSearchMode ? 'Пользователи не найдены' : 'Список друзей пуст'}
              </motion.div>
            )}

            {displayList.map((person) => {
              const isAlreadyFriend = friends.some((f) => f.id === person.id);

              return (
                <motion.div
                  key={person.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex items-center justify-between rounded-2xl border-3 border-primary bg-transparent p-3 sm:p-4"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <Avatar
                      name={person.full_name || 'User'}
                      src={person.avatar_url}
                      lqip={person.avatar_lqip}
                      forceGradient={person.use_gradient}
                      className="size-12 shrink-0 sm:size-14"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-base font-medium text-text sm:text-lg">
                        {person.full_name || 'Неизвестный'}
                      </span>
                      <span className="truncate text-sm text-text/40">@{person.username}</span>
                    </div>
                  </div>

                  {isSearchMode && !isAlreadyFriend ? (
                    <button
                      onClick={() => sendRequest(person.id)}
                      className="cursor-pointer p-2 text-primary transition-opacity outline-none hover:opacity-40"
                    >
                      <UserPlus size={24} weight="bold" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setUserToRemove(person)}
                      className="cursor-pointer p-2 text-primary transition-opacity outline-none hover:opacity-40"
                    >
                      <UserMinus size={24} weight="bold" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      {/* Модалка удаления друга */}
      <Modal
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        layout="vertical"
        className="max-w-[600px] rounded-[24px] bg-surface !p-8"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="text-base font-normal text-text">
            Вы действительно хотите убрать из списка друзей?
          </span>

          {userToRemove && (
            <div className="flex items-center gap-4 border-l-3 border-primary pl-4">
              <Avatar
                name={userToRemove.full_name || 'User'}
                src={userToRemove.avatar_url}
                forceGradient={userToRemove.use_gradient}
                className="size-12"
              />
              <div className="flex flex-col">
                <span className="text-lg font-medium text-text">{userToRemove.full_name}</span>
                <span className="text-sm text-text/40">@{userToRemove.username}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="primary"
              onClick={() => setUserToRemove(null)}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={() => {
                if (userToRemove) {
                  removeFriend(userToRemove.id);
                  setUserToRemove(null);
                }
              }}
              className="w-full sm:w-auto"
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка с личным QR Кодом */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        layout="vertical"
        className="max-w-sm rounded-[32px] bg-surface !p-6"
      >
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setIsQrModalOpen(false)}
            className="absolute top-0 right-0 p-2 text-text/40 transition-colors hover:text-text"
          >
            <X size={24} weight="bold" />
          </button>

          <div className="mt-8 mb-8 rounded-2xl bg-white p-4">
            <QRCode
              value={`${window.location.origin}/app/friends?add=${profile?.username}`}
              size={200}
            />
          </div>

          <Button
            variant="outline"
            color="text"
            onClick={handleShareQR}
            className="w-full gap-2 rounded-2xl border-3 py-4"
          >
            <ShareNetwork size={20} weight="bold" />
            Поделиться
          </Button>

          <Button
            variant="solid"
            color="primary"
            onClick={() => {
              setIsQrModalOpen(false);
              setIsScannerOpen(true);
            }}
            className="mt-3 w-full gap-2 rounded-2xl md:hidden"
          >
            <Scan size={20} weight="bold" />
            Сканировать QR-код
          </Button>
        </div>
      </Modal>

      {/* Модалка со Сканером */}
      <Modal
        isOpen={isScannerOpen}
        onClose={closeScanner}
        layout="vertical"
        className="overflow-hidden !bg-black/95 !p-0 sm:max-w-md sm:rounded-[32px]"
      >
        <div className="relative flex h-[70vh] w-full flex-col bg-black sm:h-[500px]">
          {/* Хедер сканера поверх */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
            <span className="font-medium text-white shadow-black drop-shadow-md">
              Наведите на QR-код
            </span>
            <button
              onClick={closeScanner}
              className="rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/30"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          <div className="relative h-full w-full">
            {/* Ошибка камеры */}
            {cameraError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface p-6 text-center">
                <CameraSlash size={56} className="mb-4 text-primary" weight="duotone" />
                <p className="mb-2 text-xl font-medium text-text">Камера недоступна</p>
                <p className="mb-8 text-sm leading-relaxed text-text/60">{cameraError}</p>
                <Button variant="solid" color="primary" onClick={closeScanner}>
                  Понятно
                </Button>
                <p className="mt-6 px-4 text-xs text-text/40">
                  Подсказка: нажмите на три точки в углу экрана и выберите «Открыть в браузере».
                </p>
              </div>
            ) : (
              /* Сам сканер */
              isScannerOpen && (
                <Scanner
                  onScan={(detectedCodes: IDetectedBarcode[]) => {
                    if (isProcessingScan.current) return;

                    if (detectedCodes && detectedCodes.length > 0) {
                      const url = detectedCodes[0].rawValue;
                      try {
                        const parsedUrl = new URL(url);
                        const scannedUsername = parsedUrl.searchParams.get('add');

                        if (scannedUsername) {
                          isProcessingScan.current = true;
                          closeScanner();

                          handleAddByUsername(scannedUsername).finally(() => {
                            setTimeout(() => {
                              isProcessingScan.current = false;
                            }, 1000);
                          });
                        } else {
                          toast.error('Это не QR-код Music Tree');
                        }
                      } catch {
                        toast.error('Неверный формат QR-кода');
                      }
                    }
                  }}
                  onError={(error) => handleCameraError(error)} // <-- ОБРАБОТЧИК ОШИБКИ
                  components={{
                    finder: true,
                  }}
                  styles={{
                    container: { width: '100%', height: '100%' },
                  }}
                />
              )
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
