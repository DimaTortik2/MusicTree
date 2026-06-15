import React, { useState, useEffect, useId } from 'react';
import QRCode from 'react-qr-code';
import { X, ShareNetwork, Scan } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { Avatar } from '@/shared/Avatar';
import { useAuthStore } from '@/app/store/authStore';

interface QrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
  onOpenScanner: () => void;
}

// Набор контрастных пар, которые отлично считываются сканером
const GRADIENT_PAIRS = [
  { from: 'var(--primary)', to: 'var(--accent)' },
  { from: 'var(--accent)', to: 'var(--avatar-4)' },
  { from: 'var(--avatar-7)', to: 'var(--avatar-1)' },
];

// Вспомогательная функция для получения случайного градиента
const getRandomPair = (currentPair?: { from: string; to: string }) => {
  const available = currentPair
    ? GRADIENT_PAIRS.filter((pair) => pair.from !== currentPair.from || pair.to !== currentPair.to)
    : GRADIENT_PAIRS;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
};

export const QrShareModal: React.FC<QrShareModalProps> = ({
  isOpen,
  onClose,
  username,
  onOpenScanner,
}) => {
  const profile = useAuthStore((state) => state.profile);
  const shareUrl = `${window.location.origin}/app/friends?add=${username}`;

  const uniqueId = useId();
  const gradientElementId = `qr-gradient-${uniqueId}`;

  const [colorPair, setColorPair] = useState(() => getRandomPair());
  // Состояние, контролирующее плавность. При открытии мы ее вырубаем, чтобы цвет применился мгновенно.
  const [enableTransition, setEnableTransition] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Когда модалка закрывается, отключаем транзишн, чтобы при следующем
      // открытии новый цвет применился без плавного перетекания из старого
      setEnableTransition(false);
      return;
    }

    // 1. Модалка открылась -> мгновенно ставим новый случайный цвет
    setColorPair(getRandomPair());

    // 2. Даем браузеру кадр (50ms), чтобы отрисовать новый цвет БЕЗ анимации,
    // и затем включаем transition для последующих смен цвета
    const transitionTimeout = setTimeout(() => {
      setEnableTransition(true);
    }, 50);

    // 3. Запускаем интервал медленной смены цветов (каждые 7 секунд)
    const interval = setInterval(() => {
      setColorPair((current) => getRandomPair(current));
    }, 7000);

    // Очистка при закрытии/размонтировании
    return () => {
      clearTimeout(transitionTimeout);
      clearInterval(interval);
    };
  }, [isOpen]);

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

        {/* Белая плашка для QR-кода */}
        <div className="relative mx-auto mt-12 mb-6 w-fit rounded-3xl bg-white p-5">
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id={gradientElementId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={colorPair.from}
                  style={{
                    transition: enableTransition ? 'stop-color 1.5s ease-in-out' : 'none',
                  }}
                />
                <stop
                  offset="100%"
                  stopColor={colorPair.to}
                  style={{
                    transition: enableTransition ? 'stop-color 1.5s ease-in-out' : 'none',
                  }}
                />
              </linearGradient>

              {/* Фильтр скругления */}
              <filter id="qr-rounded-filter">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.3" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -11.5"
                />
              </filter>
            </defs>
          </svg>

          {/* Применяем фильтр скругления */}
          <div style={{ filter: 'url(#qr-rounded-filter)' }}>
            {username && (
              <QRCode
                value={shareUrl}
                size={200}
                fgColor={`url(#${gradientElementId})`}
                bgColor="transparent"
              />
            )}
          </div>
        </div>

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
