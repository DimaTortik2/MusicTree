import  { useState } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { SignOut, WarningCircle } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';

export const UserProfileMenu = () => {
  const { user, signOut } = useAuthStore();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  if (!user) return null;

  const userEmail = user.email || '';
  // Проверяем, ввел ли пользователь свой email в точности
  const isConfirmed = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleSignOut = async () => {
    if (isConfirmed) {
      await signOut();
    }
  };

  return (
    <>
      <div className="mb-10 flex items-center justify-between gap-4 rounded-[24px] bg-surface p-5 shadow-sm">
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-base font-medium text-text">
            {user.user_metadata?.full_name || user.email}
          </span>
          <span className="mt-0.5 truncate text-[13px] text-text/40">
            Облачная синхронизация активна
          </span>
        </div>

        <button
          onClick={() => {
            setIsSignOutModalOpen(true);
            setConfirmEmail(''); // Сбрасываем инпут при открытии
          }}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all duration-200 outline-none hover:bg-primary hover:text-white active:scale-95"
        >
          <SignOut size={18} weight="bold" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>

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
                if (e.key === 'Enter' && isConfirmed) {
                  handleSignOut();
                }
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
              // Добавляем disabled стили, чтобы кнопка выглядела неактивной, пока не введен правильный email
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
