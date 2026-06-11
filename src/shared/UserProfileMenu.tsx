import { useState } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { supabase } from '@/shared/lib/supabase';
import { SignOut, WarningCircle, PencilSimple, CameraPlus } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { Avatar } from '@/shared/Avatar';
import { toast } from '@/app/utils/toast';

export const UserProfileMenu = () => {
  const { user, signOut } = useAuthStore();

  // Стэйты для выхода
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  // Стэйты для редактирования профиля
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  if (!user) return null;

  const userEmail = user.email || '';
  // Читаем имя и аватар прямо из метаданных пользователя!
  const currentName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь';
  const userPhoto = user.user_metadata?.avatar_url || null;

  const isConfirmed = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleSignOut = async () => {
    if (isConfirmed) {
      await signOut();
    }
  };

  // --- ОЖИВЛЕННАЯ ФУНКЦИЯ: Обновление имени ---
  const handleUpdateProfile = async () => {
    const trimmedName = newNickname.trim();
    if (!trimmedName || trimmedName === currentName) {
      setIsEditModalOpen(false); // Если ничего не изменили, просто закрываем
      return;
    }

    setIsUpdating(true);
    // Обновляем метаданные пользователя в Supabase
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmedName },
    });

    if (error) {
      toast.error('Ошибка при обновлении профиля');
      console.error(error);
    } else {
      toast.success('Имя успешно изменено!');
      setIsEditModalOpen(false);
      // useAuthStore автоматически обновится благодаря подписке onAuthStateChange
    }
    setIsUpdating(false);
  };

  // --- ОЖИВЛЕННАЯ ФУНКЦИЯ: Удаление фото ---
  const handleRemovePhoto = async () => {
    if (!userPhoto) return;

    setIsUpdating(true);
    // Затираем avatar_url в метаданных (полезно для OAuth аккаунтов)
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: null },
    });

    if (error) {
      toast.error('Не удалось убрать фото');
    } else {
      toast.success('Фото удалено');
    }
    setIsUpdating(false);
  };

  const handleUploadPhoto = () => {
    // Для загрузки фото в будущем потребуется создать Storage bucket (напр. 'avatars')
    toast.info('Загрузка кастомных аватаров появится в будущем обновлении!');
  };

  return (
    <>
      <div className="mb-10 flex items-center gap-5 sm:gap-6">
        <Avatar
          name={currentName}
          src={userPhoto}
          className="size-20 text-3xl sm:size-24 sm:text-4xl"
        />

        <div className="flex flex-col items-start justify-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-medium text-text sm:text-3xl">{currentName}</span>
            <button
              onClick={() => {
                setNewNickname(currentName);
                setIsEditModalOpen(true);
              }}
              className="text-text/60 transition-colors outline-none hover:text-text focus-visible:text-primary active:scale-95"
            >
              <PencilSimple size={24} weight="regular" />
            </button>
          </div>

          <span className="mt-1 text-base text-text/40 sm:text-lg">{userEmail}</span>

          <button
            onClick={() => {
              setIsSignOutModalOpen(true);
              setConfirmEmail('');
            }}
            className="group mt-3 flex shrink-0 cursor-pointer items-center gap-2 text-[15px] font-medium text-primary transition-all duration-200 outline-none active:scale-95"
          >
            <SignOut
              size={20}
              weight="regular"
              className="transition-transform group-hover:-translate-x-1"
            />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !isUpdating && setIsEditModalOpen(false)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <div className="relative mb-2 flex w-full justify-center">
            <Avatar
              name={newNickname || currentName}
              src={userPhoto}
              className="group size-32 cursor-pointer text-5xl"
            >
              <div
                onClick={handleUploadPhoto}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <CameraPlus size={36} weight="regular" className="text-red-500" />
              </div>
            </Avatar>

            {userPhoto && (
              <div className="absolute top-0 right-0 sm:top-2">
                <Button
                  variant="outline"
                  size="sm"
                  color="primary"
                  onClick={handleRemovePhoto}
                  disabled={isUpdating}
                  className="rounded-xl border-2 px-4 py-2 text-sm"
                >
                  Убрать фото
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-normal text-text">Введите новый никнейм</span>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              disabled={isUpdating}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateProfile();
              }}
              placeholder="Новый никнейм..."
              autoFocus
              className="w-full border-b-2 border-accent bg-transparent pb-2.5 text-2xl font-medium text-text transition-colors outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="accent"
              disabled={isUpdating}
              onClick={() => setIsEditModalOpen(false)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="accent"
              disabled={isUpdating || !newNickname.trim()}
              onClick={handleUpdateProfile}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              {isUpdating ? 'Сохранение...' : 'Применить'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модалка выхода остается такой же ... */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <div className="flex items-center gap-3">
            <WarningCircle size={28} className="text-primary" weight="fill" />
            <span className="text-2xl font-medium text-text">Выход из аккаунта</span>
          </div>

          <span className="text-sm leading-relaxed font-normal text-text/60">
            Ваши данные надежно сохранены в облаке, однако{' '}
            <b>локальный кэш на этом устройстве будет полностью очищен</b>.
            <br />
            <br />
            Чтобы подтвердить выход, введите вашу почту:{' '}
            <span className="font-medium text-text">{userEmail}</span>
          </span>

          <div className="mt-2 w-full">
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed) handleSignOut();
              }}
              placeholder={userEmail}
              autoFocus
              className="w-full border-b-2 border-primary bg-transparent pb-2.5 text-lg font-medium text-text transition-colors outline-none focus:border-primary"
            />
          </div>

          <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="primary"
              onClick={() => setIsSignOutModalOpen(false)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="primary"
              disabled={!isConfirmed}
              onClick={handleSignOut}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
