import { useState } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { SignOut, WarningCircle, PencilSimple, CameraPlus } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { Avatar } from '@/shared/Avatar';

export const UserProfileMenu = () => {
  const { user, signOut } = useAuthStore();

  // Стэйты для выхода
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  // Стэйты для редактирования профиля
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');

  if (!user) return null;

  const userEmail = user.email || '';
  const currentName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь';

  // Мок фотографии (потом возьмешь из user_metadata или хранилища)
  const userPhoto = null;

  const isConfirmed = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleSignOut = async () => {
    if (isConfirmed) {
      await signOut();
    }
  };

  // МОКОВЫЕ ФУНКЦИИ (для будущего оживления)
  const handleUpdateProfile = () => {
    if (!newNickname.trim()) return;
    console.log('Сохраняем новый никнейм:', newNickname);
    // await updateProfile({ full_name: newNickname });
    setIsEditModalOpen(false);
  };

  const handleRemovePhoto = () => {
    console.log('Удаляем фото...');
  };

  const handleUploadPhoto = () => {
    console.log('Открываем диалог выбора файла...');
  };

  return (
    <>
      {/* ОСНОВНОЙ БЛОК ПРОФИЛЯ (По дизайну скриншота 1) */}
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

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ ПРОФИЛЯ (По дизайну скриншота 2) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          {/* Верхняя часть с аватаром и кнопкой удаления фото */}
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

            <div className="absolute top-0 right-0 sm:top-2">
              <Button
                variant="outline"
                size="sm"
                color="primary"
                onClick={handleRemovePhoto}
                className="rounded-xl border-2 px-4 py-2 text-sm"
              >
                Убрать фото
              </Button>
            </div>
          </div>

          {/* Поле ввода никнейма */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-normal text-text">Введите новый никнейм</span>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateProfile();
              }}
              placeholder="Новый никнейм..."
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
              onClick={() => setIsEditModalOpen(false)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="accent"
              onClick={handleUpdateProfile}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Применить
            </Button>
          </div>
        </div>
      </Modal>

      {/* МОДАЛКА ВЫХОДА (Оставил твою, только чуть подогнал стили) */}
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
