import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
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
} from '@phosphor-icons/react';
import { useAuthStore } from '@/app/store/authStore';
import { Avatar } from '@/shared/Avatar';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { useFriends, type FriendProfile } from '@/features/friends/hooks/useFriends';
import { MobileSidebarPortal } from '@/shared/MobileSidebarPortal';

export function FriendsPage() {
  // ИСПРАВЛЕНО: Добавили profile сюда
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

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<FriendProfile | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayList = searchQuery.trim() ? searchResults : friends;
  const isSearchMode = !!searchQuery.trim();

  const handleShareQR = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Добавь меня в друзья в Music Tree!',
          // Используем username для шеринга
          url: `${window.location.origin}/app/friends?add=${profile?.username}`,
        })
        .catch(console.error);
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
                        Принять в друзья
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
        {/* Кнопка открытия мобильного сайдбара */}
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
              // ИСПРАВЛЕНО: Проверяем, в друзьях ли уже этот человек (важно для поиска)
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

                  {/* ИСПРАВЛЕНО: Правильная логика показа иконок + и - */}
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
                {/* ИСПРАВЛЕНО: Теперь тут красивый username */}
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

      {/* Модалка QR Кода */}
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

          {/* Только на мобилках */}
          <Button
            variant="solid"
            color="primary"
            className="mt-3 w-full gap-2 rounded-2xl md:hidden"
          >
            <Scan size={20} weight="bold" />
            Сканировать QR-код
          </Button>
        </div>
      </Modal>
    </div>
  );
}
