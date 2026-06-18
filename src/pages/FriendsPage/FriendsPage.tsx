import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabase';
import {
  UserMinus,
  UserPlus,
  MagnifyingGlass,
  QrCode,
  Check,
  X,
  GitFork,
  Trash,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/app/store/authStore';
// 1. ИМПОРТИРУЕМ НАШ НОВЫЙ UserAvatar ВМЕСТО Avatar
import { UserAvatar } from '@/shared/UserAvatar';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { useFriends, type FriendProfile } from '@/features/friends/hooks/useFriends';
import { MobileSidebarPortal } from '@/shared/MobileSidebarPortal';
import { toast } from '@/app/utils/toast';
import { QrShareModal } from '@/pages/FriendsPage/QrShareModal';
import { QrScannerModal } from '@/shared/QrScannerModal';
import { ControlButton } from '@/shared/buttons/ControlButton';
import { SidebarIcon } from '@/shared/icons/sidebarIcon';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { useProgressStore } from '@/app/store/useProgressStore';
import { useSharedProgressStore } from '@/app/store/useSharedProgressStore';
import { cn } from '@/app/utils/cn';
import { useBlobTransition } from '@/app/store/useBlobTransition';
// 2. ИМПОРТ usePresenceStore БОЛЬШЕ НЕ НУЖЕН, УДАЛИЛИ ЕГО!

export function FriendsPage() {
  const { profile, user, initialized } = useAuthStore();
  const navigate = useNavigate();
  // 3. УБРАЛИ СТРОКУ С onlineUsers ИЗ ЗУСТАНДА

  const {
    friends,
    notifications,
    searchResults,
    searchUsers,
    sendRequest,
    acceptRequest,
    removeFriend,
    dismissNotification,
    deleteSharedTree,
    sharedTrees,
  } = useFriends();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<FriendProfile | null>(null);
  const [treeToDelete, setTreeToDelete] = useState<{
    friend: FriendProfile;
    treeId: string;
  } | null>(null);

  const [isQrShareOpen, setIsQrShareOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  const { activeSharedFriend, setSharedMode, exitSharedMode } = useAppModeStore();
  const personalProgress = useProgressStore();

  const [isCreatingShared, setIsCreatingShared] = useState<FriendProfile | null>(null);
  const [isSyncingModalOpen, setIsSyncingModalOpen] = useState(false);
  const { startTransition } = useBlobTransition();

  // 1. НАЖАТИЕ НА ДРУГА
  const handleFriendClick = async (friend: FriendProfile) => {
    const { data } = await supabase
      .from('shared_trees')
      .select('id, progress_state')
      .or(
        `and(user1_id.eq.${user?.id},user2_id.eq.${friend.id}),and(user1_id.eq.${friend.id},user2_id.eq.${user?.id})`,
      )
      .single();

    if (data) {
      // 🔥 ОБЕРНУЛИ В ТРАНЗИШЕН
      startTransition(() => {
        useSharedProgressStore.setState(data.progress_state || {});
        setSharedMode(friend, data.id);
        navigate('/app/tree');
      });
    } else {
      setIsCreatingShared(friend);
    }
  };

  // 2. СОЗДАНИЕ ДЕРЕВА
  const handleCreateTree = async (type: 'empty' | 'min') => {
    if (!isCreatingShared || !user) return;

    let initialState = {};

    if (type === 'min') {
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('progress_state')
        .eq('id', isCreatingShared.id)
        .single();

      const friendState = friendProfile?.progress_state || {};
      const intersect = (arr1: any[] = [], arr2: any[] = []) =>
        arr1.filter((x) => arr2.includes(x));

      initialState = {
        passedLessons: intersect(personalProgress.passedLessons, friendState.passedLessons),
        passedHomeworks: intersect(personalProgress.passedHomeworks, friendState.passedHomeworks),
      };
    }

    const { data } = await supabase
      .from('shared_trees')
      .insert([{ user1_id: user.id, user2_id: isCreatingShared.id, progress_state: initialState }])
      .select()
      .single();

    if (data) {
      // 🔥 ОБЕРНУЛИ В ТРАНЗИШЕН
      startTransition(() => {
        useSharedProgressStore.setState(initialState);
        setSharedMode(isCreatingShared, data.id);
        setIsCreatingShared(null);
        navigate('/app/tree');
      });
    } else {
      toast.error('Не удалось создать совместное дерево');
    }
  };

  // 3. ВОЗВРАТ К СВОЕМУ ДЕРЕВУ
  const handleReturnToPersonal = () => {
    const sharedProgress = useSharedProgressStore.getState();

    const hasMoreLessons =
      sharedProgress.passedLessons.length > personalProgress.passedLessons.length;
    const hasMoreHW =
      sharedProgress.passedHomeworks.length > personalProgress.passedHomeworks.length;
    const hasMoreTests =
      Object.keys(sharedProgress.passedTests).length >
      Object.keys(personalProgress.passedTests).length;

    if (hasMoreLessons || hasMoreHW || hasMoreTests) {
      setIsSyncingModalOpen(true);
    } else {
      // 🔥 ОБЕРНУЛИ В ТРАНЗИШЕН
      startTransition(() => {
        exitSharedMode();
        navigate('/app/tree');
      });
    }
  };

  // 4. ПЕРЕНОС ПРОГРЕССА
  const handleSyncProgress = (sync: boolean) => {
    // 🔥 ОБЕРНУЛИ В ТРАНЗИШЕН ВЕСЬ БЛОК
    startTransition(() => {
      if (sync) {
        const sharedProgress = useSharedProgressStore.getState();
        useProgressStore.setState({
          passedLessons: [
            ...new Set([...personalProgress.passedLessons, ...sharedProgress.passedLessons]),
          ],
          passedHomeworks: [
            ...new Set([...personalProgress.passedHomeworks, ...sharedProgress.passedHomeworks]),
          ],
          passedTests: { ...personalProgress.passedTests, ...sharedProgress.passedTests },
        });
        toast.success('Прогресс успешно перенесен!');
      }

      exitSharedMode();
      setIsSyncingModalOpen(false);
      navigate('/app/tree');
    });
  };

  const prevNotifsLength = useRef(notifications.length);
  useEffect(() => {
    // Если массив уведомлений стал больше, значит пришла новая заявка в друзья
    if (isQrShareOpen && notifications.length > prevNotifsLength.current) {
      setIsQrShareOpen(false);
      toast.success('Кто-то отсканировал ваш код и добавился в друзья!');
    }
    prevNotifsLength.current = notifications.length;
  }, [notifications.length, isQrShareOpen]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const processedAddParam = useRef<string | null>(null);

  useEffect(() => {
    const addUsername = searchParams.get('add');

    if (addUsername && profile && processedAddParam.current !== addUsername) {
      processedAddParam.current = addUsername;

      handleAddByUsername(addUsername);

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, profile, setSearchParams]);

  if (initialized && (!user || !profile?.can_use_friends)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-6 md:p-12">
        <Modal
          inline
          layout="horizontal"
          title={
            !user
              ? 'Раздел друзей может быть доступен только зарегистрированным пользователям'
              : 'Доступ к разделу Друзья закрыт'
          }
          description={
            !user
              ? 'Войдите или создайте аккаунт, чтобы добавлять друзей.'
              : 'Ваш аккаунт пока не имеет доступа к функции совместных деревьев.'
          }
          icon={<UserPlus className="size-8 text-text sm:size-10" weight="regular" />}
          onIconClick={!user ? () => navigate('/auth') : undefined}
          iconContainerClassName="bg-primary text-surface"
        />
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex min-h-0 w-full flex-1 flex-col px-6 pt-6 pb-24 md:h-full md:w-[340px] md:flex-none md:border-r-[3px] md:border-line">
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
                {/* ЗАМЕНА 1: Уведомления */}
                <UserAvatar
                  userId={notif.sender?.id}
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
                ) : notif.type === 'shared_tree_created' ? (
                  // 🔥 НОВЫЙ ТИП: Уведомление о создании совместного дерева
                  <>
                    <span className="text-sm font-medium text-text/60">
                      Создал совместное дерево!
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          // Быстрый бесшовный вход в созданное дерево прямо из уведомления!
                          handleFriendClick(notif.sender);
                          dismissNotification(notif.id);
                        }}
                        className="group flex cursor-pointer items-center gap-1.5 outline-none"
                      >
                        <Check
                          weight="bold"
                          size={18}
                          className="text-primary transition-opacity group-hover:opacity-40"
                        />
                        <span className="text-sm font-medium text-primary transition-opacity group-hover:opacity-40">
                          Войти
                        </span>
                      </button>
                      <button
                        onClick={() => dismissNotification(notif.id)}
                        className="cursor-pointer text-primary/60 transition-opacity outline-none hover:text-primary"
                      >
                        <X weight="bold" size={18} />
                      </button>
                    </div>
                  </>
                ) : notif.type === 'shared_tree_deleted' ? (
                  // 🔥 НОВЫЙ ТИП: Уведомление об удалении совместного дерева
                  <>
                    <span className="text-sm font-medium text-text/60">
                      Удалил совместное дерево
                    </span>
                    <button
                      onClick={() => dismissNotification(notif.id)}
                      className="cursor-pointer text-primary transition-opacity outline-none hover:opacity-40"
                    >
                      <X weight="bold" size={20} />
                    </button>
                  </>
                ) : (
                  // Обычное удаление из друзей
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
      <aside className="hidden h-full shrink-0 flex-col md:flex">{sidebarContent}</aside>

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
            <SidebarIcon />
          </button>
        </div>

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
            <ControlButton
              icon={<QrCode size={20} weight="fill" />}
              onClick={() => setIsQrShareOpen(true)}
              innerClassName="p-1"
            />
          </div>
        </div>

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

            {activeSharedFriend && !isSearchMode && (
              <motion.div
                layout="position"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex cursor-pointer items-center justify-start gap-4 rounded-2xl border-3 border-primary p-3 transition-colors hover:bg-primary/20 sm:p-4"
                onClick={handleReturnToPersonal}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full text-text sm:size-14">
                  <GitFork size={28} weight="bold" />
                </div>
                <span className="text-base font-medium text-text sm:text-lg">
                  Вернуться к своему дереву
                </span>
              </motion.div>
            )}

            {displayList.map((person) => {
              const isAlreadyFriend = friends.some((f) => f.id === person.id);

              // Находим совместное дерево с этим другом, если оно есть
              const activeTree = sharedTrees.find(
                (t) => t.user1_id === person.id || t.user2_id === person.id,
              );

              return (
                <motion.div
                  key={person.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onClick={() => {
                    if (isAlreadyFriend) {
                      handleFriendClick(person);
                    } else {
                      toast.info('Сначала отправьте заявку в друзья!');
                    }
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-2xl border-3 border-primary bg-transparent p-3 transition-colors sm:p-4',
                    isAlreadyFriend ? 'cursor-pointer hover:bg-primary/20' : 'cursor-default',
                  )}
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <UserAvatar
                      userId={person.id}
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

                  <div className="flex items-center gap-2">
                    {/* КНОПКА УДАЛЕНИЯ ДЕРЕВА (Показывается только друзьям и только если дерево создано) */}
                    {isAlreadyFriend && activeTree && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 🛡 Останавливаем переход в дерево
                          setTreeToDelete({ friend: person, treeId: activeTree.id });
                        }}
                        className="cursor-pointer p-2 text-primary transition-colors outline-none hover:text-primary/40"
                        title="Удалить совместное дерево"
                      >
                        <Trash size={24} weight="bold" />
                      </button>
                    )}

                    {isSearchMode && !isAlreadyFriend ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          sendRequest(person.id);
                        }}
                        className="cursor-pointer p-2 text-primary transition-opacity outline-none hover:opacity-40"
                      >
                        <UserPlus size={24} weight="bold" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 🛡 Останавливаем переход в дерево
                          setUserToRemove(person);
                        }}
                        className="cursor-pointer p-2 text-primary transition-opacity outline-none hover:opacity-40"
                      >
                        <UserMinus size={24} weight="bold" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </main>

      <QrShareModal
        isOpen={isQrShareOpen}
        onClose={() => setIsQrShareOpen(false)}
        username={profile?.username}
        onOpenScanner={() => setIsQrScannerOpen(true)}
      />

      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleAddByUsername}
      />

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
              {/* ЗАМЕНА 3: Аватарка в модалке подтверждения */}
              <UserAvatar
                userId={userToRemove.id}
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

      {/* МОДАЛКА: Создание совместного дерева */}
      <Modal isOpen={!!isCreatingShared} onClose={() => setIsCreatingShared(null)}>
        <h2 className="text-xl font-medium text-text">Создать совместное дерево</h2>
        <p className="mb-6 text-sm text-text/60">
          У вас еще нет совместного дерева с {isCreatingShared?.full_name}. Вы можете создать его с
          нуля или объединить ваши уже пройденные лекции (возьмется минимальный общий прогресс).
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="solid" onClick={() => handleCreateTree('min')}>
            Объединить прогресс
          </Button>
          <Button variant="outline" onClick={() => handleCreateTree('empty')}>
            Создать пустое
          </Button>
          <Button variant="outline" color="text" onClick={() => setIsCreatingShared(null)}>
            Отмена
          </Button>
        </div>
      </Modal>

      {/* МОДАЛКА: Перенос прогресса при возврате */}
      <Modal isOpen={isSyncingModalOpen} onClose={() => setIsSyncingModalOpen(false)}>
        <h2 className="text-xl font-medium text-text">Перенести результаты?</h2>
        <p className="mb-6 text-sm text-text/60">
          Вместе с {activeSharedFriend?.full_name} вы прошли больше лекций и заданий, чем на вашем
          личном дереве. Хотите перенести эти результаты себе, чтобы не проходить их заново?
        </p>
        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => handleSyncProgress(false)}>
            Не переносить
          </Button>
          <Button variant="solid" onClick={() => handleSyncProgress(true)}>
            Да, перенести
          </Button>
        </div>
      </Modal>

      {/* Модалка подтверждения удаления совместного дерева */}
      <Modal
        isOpen={!!treeToDelete}
        onClose={() => setTreeToDelete(null)}
        layout="vertical"
        className="max-w-[500px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="text-xl font-medium text-text">Удалить совместное дерево?</span>
          <p className="text-sm leading-relaxed text-text/60">
            Это действие полностью сбросит совместный прогресс с{' '}
            <strong className="text-text">{treeToDelete?.friend.full_name}</strong>. Все пройденные
            вместе лекции, тесты и домашки в рамках этого дерева будут стерты. Ваши личные прогрессы
            останутся нетронутыми.
          </p>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setTreeToDelete(null)}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={async () => {
                if (treeToDelete) {
                  // Удаляем дерево из БД
                  await deleteSharedTree(treeToDelete.treeId);

                  // Если мы прямо сейчас находимся в режиме этого дерева — выходим из него
                  if (activeSharedFriend?.id === treeToDelete.friend.id) {
                    startTransition(() => {
                      exitSharedMode();
                      navigate('/app/tree');
                    });
                  }

                  setTreeToDelete(null);
                }
              }}
              className="w-full sm:w-auto"
            >
              Удалить дерево
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
