import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { X, CameraSlash, Flashlight } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { toast } from '@/app/utils/toast';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (username: string) => Promise<void>;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // Ref для блокировки спама (чтобы сканер не читал 60 раз в секунду)
  const isProcessingScan = useRef(false);
  // Локальный ref для безопасного поиска <video>, а не по всему document
  const containerRef = useRef<HTMLDivElement>(null);

  // Безопасное закрытие с очисткой стейтов
  const handleClose = useCallback(() => {
    // Гасим фонарик перед размонтированием (для iOS)
    setTorchOn(false);
    onClose();

    setTimeout(() => {
      setCameraError(null);
      setTorchAvailable(false);
      isProcessingScan.current = false;
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      isProcessingScan.current = false;
      return;
    }

    let attempts = 0;
    const checkTorchInterval = setInterval(() => {
      attempts++;
      // Прекращаем попытки найти фонарик через 10 секунд (20 попыток)
      if (attempts > 20) {
        clearInterval(checkTorchInterval);
        return;
      }

      const video = containerRef.current?.querySelector('video');
      // Проверяем readyState >= 1 (HAVE_METADATA), чтобы поток точно успел инициализироваться
      if (video && video.readyState >= 1 && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];

        if (track) {
          const capabilities = (
            typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
          ) as Record<string, any>;
          if (capabilities.torch) {
            setTorchAvailable(true);
          }
          // Поток загружен, возможности проверены - убиваем интервал
          clearInterval(checkTorchInterval);
        }
      }
    }, 500);

    return () => clearInterval(checkTorchInterval);
  }, [isOpen]);

  const toggleTorch = async () => {
    const video = containerRef.current?.querySelector('video');
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as any],
          });
          setTorchOn(!torchOn);
        } catch (e) {
          console.error('Ошибка при включении фонарика:', e);
          toast.error('Не удалось включить фонарик');
        }
      }
    }
  };

  const handleCameraError = (error: unknown) => {
    const err = error as Error;
    console.error('Ошибка камеры:', err);
    if (err?.name === 'NotAllowedError') {
      setCameraError('Доступ к камере запрещен. Разрешите его в настройках браузера.');
    } else if (err?.name === 'NotFoundError') {
      setCameraError('Камера не найдена на вашем устройстве.');
    } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      setCameraError('Камера в данный момент используется другим приложением.');
    } else if (err?.name === 'OverconstrainedError') {
      setCameraError('Не удалось запустить основную (заднюю) камеру.');
    } else {
      setCameraError('Браузер блокирует камеру. Откройте в Safari или Chrome.');
    }
  };

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (isProcessingScan.current || !detectedCodes || detectedCodes.length === 0) return;

    const url = detectedCodes[0].rawValue;
    if (!url) return;

    try {
      const parsedUrl = new URL(url);
      const scannedUsername = parsedUrl.searchParams.get('add');

      if (scannedUsername) {
        // Блокируем дальнейшие сканирования
        isProcessingScan.current = true;

        // Выключаем фонарик, чтобы не слепить пользователя пока идет загрузка
        if (torchOn) toggleTorch().catch(() => {});

        // Моментально закрываем модалку для идеального UX
        handleClose();

        onScanSuccess(scannedUsername).finally(() => {
          setTimeout(() => {
            isProcessingScan.current = false;
          }, 1000);
        });
      } else {
        triggerCooldownError('Это не QR-код Music Tree');
      }
    } catch {
      triggerCooldownError('Неверный формат QR-кода');
    }
  };

  // Функция для предотвращения спама тостами, если человек держит камеру на неправильном QR
  const triggerCooldownError = (message: string) => {
    isProcessingScan.current = true;
    toast.error(message);
    setTimeout(() => {
      isProcessingScan.current = false;
    }, 2500); // Кулдаун равен примерному времени отображения тоста
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      layout="vertical"
      className="overflow-hidden !bg-black !p-0 sm:max-w-md sm:rounded-[32px]"
    >
      <div className="relative flex h-[80vh] w-full flex-col bg-black sm:h-[650px]">
        {/* Хедер */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4 pb-8">
          <span className="font-medium text-white shadow-black drop-shadow-md">
            Наведите на QR-код
          </span>
          <button
            onClick={handleClose}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="relative h-full w-full bg-black">
          {cameraError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface p-6 text-center">
              <CameraSlash size={56} className="mb-4 text-primary"  />
              <p className="mb-2 text-xl font-medium text-text">Камера недоступна</p>
              <p className="mb-8 text-sm leading-relaxed text-text/60">{cameraError}</p>
              <Button variant="solid" color="primary" onClick={handleClose}>
                Понятно
              </Button>
              <p className="mt-6 px-4 text-xs text-text/40">
               Быть может Вы не давали своему браузеру доступ к камере
              </p>
            </div>
          ) : (
            isOpen && (
              <>
                {/* 
                  Ref добавлен в обертку. 
                  formats={['qr_code']} отключает поиск баркодов и ускоряет сканирование в 10 раз.
                */}
                <div ref={containerRef} className="absolute inset-0 z-0 [&_video]:object-cover">
                  <Scanner
                    onScan={handleScan}
                    onError={handleCameraError}
                    formats={['qr_code']}
                    components={{ finder: false, torch: false, zoom: false }}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' },
                    }}
                  />
                </div>

                {/* Вырез по центру как в Telegram */}
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                  <div className="relative size-[260px] rounded-3xl shadow-[0_0_0_4000px_rgba(0,0,0,0.55)] sm:size-[300px]">
                    <div className="absolute -top-1 -left-1 size-14 rounded-tl-[24px] border-t-[4px] border-l-[4px] border-white" />
                    <div className="absolute -top-1 -right-1 size-14 rounded-tr-[24px] border-t-[4px] border-r-[4px] border-white" />
                    <div className="absolute -bottom-1 -left-1 size-14 rounded-bl-[24px] border-b-[4px] border-l-[4px] border-white" />
                    <div className="absolute -right-1 -bottom-1 size-14 rounded-br-[24px] border-r-[4px] border-b-[4px] border-white" />
                  </div>
                </div>

                {/* Фонарик */}
                {torchAvailable && (
                  <div className="absolute right-0 bottom-10 left-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom)]">
                    <button
                      onClick={toggleTorch}
                      className={`flex size-14 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-95 ${
                        torchOn ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-black/60'
                      }`}
                    >
                      <Flashlight size={28} weight={torchOn ? 'fill' : 'regular'} />
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </Modal>
  );
};
