import React from 'react';
import QRCode from 'react-qr-code';
import { X, ShareNetwork, Scan } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';

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
      className="max-w-sm rounded-[32px] bg-surface !p-6"
    >
      <div className="relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 text-text/40 transition-colors hover:text-text cursor-pointer"
        >
          <X size={24} weight="bold" />
        </button>

        {/* Изменили mb-8 на mb-4, чтобы освободить место для подписи */}
        <div className="mt-8 mb-4 rounded-2xl bg-white p-4">
          {username && <QRCode value={shareUrl} size={200} />}
        </div>

        {/* Текстовая подсказка */}
        <p className="mb-6 max-w-[260px] text-center text-sm leading-relaxed text-text/60">
          На в этом же меню на телефоне друга нажмите {' '}
          <span className="font-semibold text-text">"Сканировать QR-код"</span>,
          чтобы открыть камеру и подружиться.
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
