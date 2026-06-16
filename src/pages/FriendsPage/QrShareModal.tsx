import React from 'react';
import { X, ShareNetwork, Scan } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { Avatar } from '@/shared/Avatar';
import { useAuthStore } from '@/app/store/authStore';
import { GradientQrCode } from '@/shared/GradientQrCode'; // Импорт нового компонента

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  onOpenScanner: () => void;
}

export const QrShareModal: React.FC<QrShareModalProps> = ({
  isOpen,
  onClose,
  username,
  onOpenScanner,
}) => {
  const profile = useAuthStore((state) => state.profile);
  const shareUrl = `${window.location.origin}/app/friends?add=${username}`;

  const handleShareQR = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Добавь меня в друзья в Music Tree!',
          url: shareUrl,
        })
        .catch(console.error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      layout="vertical"
      className="max-w-sm rounded-[32px] bg-surface p-6"
    >
      <div className="relative flex w-full flex-col items-center">
        {/* Аватарка на самом верху модалки */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2">
          <Avatar
            name={profile?.full_name || username || 'User'}
            src={profile?.avatar_url}
            lqip={profile?.avatar_lqip}
            forceGradient={profile?.use_gradient}
            className="size-20"
          />
        </div>

        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 cursor-pointer p-2 text-text/40 transition-colors hover:text-text"
        >
          <X size={24} weight="bold" />
        </button>

        {/* ИСПОЛЬЗУЕМ ВЫДЕЛЕННЫЙ КОМПОНЕНТ */}
        <GradientQrCode value={username ? shareUrl : null} size={200} className="mt-12 mb-6" />

        {/* Текстовая подсказка */}
        <p className="mb-6 max-w-[260px] text-center text-sm leading-relaxed text-text/60">
          На в этом же меню на телефоне друга нажмите{' '}
          <span className="font-semibold text-text">"Сканировать QR-код"</span>, чтобы открыть
          камеру и подружиться.
        </p>

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
            onClose();
            onOpenScanner();
          }}
          className="mt-3 w-full gap-2 rounded-2xl md:hidden"
        >
          <Scan size={20} weight="bold" />
          Сканировать QR-код
        </Button>
      </div>
    </Modal>
  );
};
