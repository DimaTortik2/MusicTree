import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scanner, type IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { X, CameraSlash, Flashlight } from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { toast } from '@/app/utils/toast';
import { supabase } from '@/shared/lib/supabase';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (username: string) => Promise<void>; // Сделал опциональным
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const isProcessingScan = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mountTimer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      mountTimer = setTimeout(() => {
        setIsCameraActive(true);
        isProcessingScan.current = false;
      }, 300);
    } else {
      setIsCameraActive(false);
      setCameraError(null);
      setTorchAvailable(false);
      setTorchOn(false);
    }
    return () => clearTimeout(mountTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isCameraActive) return;
    let attempts = 0;
    const checkTorchInterval = setInterval(() => {
      attempts++;
      if (attempts > 20) {
        clearInterval(checkTorchInterval);
        return;
      }
      const video = containerRef.current?.querySelector('video');
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
          clearInterval(checkTorchInterval);
        }
      }
    }, 500);
    return () => clearInterval(checkTorchInterval);
  }, [isCameraActive]);

  const toggleTorch = async () => {
    const video = containerRef.current?.querySelector('video');
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
          setTorchOn(!torchOn);
        } catch (e) {
          toast.error('Не удалось включить фонарик');
        }
      }
    }
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleCameraError = (error: unknown) => {
    if (!isOpen) return;
    const err = error as Error;
    if (err?.name === 'NotAllowedError') {
      setCameraError('Доступ к камере запрещен. Разрешите его в настройках браузера.');
    } else if (err?.name === 'NotFoundError') {
      setCameraError('Камера не найдена на вашем устройстве.');
    } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
      setCameraError('Камера в данный момент используется другим приложением.');
    } else if (err?.name === 'OverconstrainedError') {
      setCameraError('Не удалось запустить основную (заднюю) камеру.');
    } else {
      setCameraError('Браузер блокирует камеру. Откройте в Safari или Chrome. Дайте приложению браузера доступ к камере');
    }
  };

  const triggerCooldownError = (message: string) => {
    isProcessingScan.current = true;
    toast.error(message);
    setTimeout(() => {
      isProcessingScan.current = false;
    }, 2500);
  };

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (isProcessingScan.current || !detectedCodes || detectedCodes.length === 0) return;

    const url = detectedCodes[0].rawValue;
    if (!url) return;

    try {
       if (url.includes('/auth/v1/verify')) {
         isProcessingScan.current = true;
         toast.success('Успешно! Входим в аккаунт...');
         if (torchOn) toggleTorch().catch(() => {});
         handleClose();

         // Просто перенаправляем браузер по этой ссылке, она сама всё сделает
         window.location.href = url;
         return;
       }
      const parsedUrl = new URL(url);
      const scannedUsername = parsedUrl.searchParams.get('add');
      const loginToken = parsedUrl.searchParams.get('login_token');
      const phoneLoginToken = parsedUrl.searchParams.get('phone_login');

      // 1. ЛОГИКА ДРУЗЕЙ
      if (scannedUsername && onScanSuccess) {
        isProcessingScan.current = true;
        if (torchOn) toggleTorch().catch(() => {});
        handleClose();

        onScanSuccess(scannedUsername).finally(() => {
          setTimeout(() => {
            isProcessingScan.current = false;
          }, 1000);
        });
        return;
      }

      // 2. ЛОГИКА АВТОРИЗАЦИИ ПК (Телефон сканирует ПК для входа ПК)
      if (loginToken) {
        isProcessingScan.current = true;
        try {
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();
          if (sessionError || !session?.access_token) {
            throw new Error('Локальная сессия не найдена. Попробуйте перезайти в аккаунт.');
          }

          const { data, error } = await supabase.functions.invoke('qr-login', {
            body: {
              session_token: loginToken,
              redirect_to: `${parsedUrl.origin}/app/tree`,
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (error || (data && data.error)) {
            throw new Error(data?.error || error?.message || 'Ошибка входа');
          }

          toast.success('Успешный вход на новом устройстве!');
          if (torchOn) toggleTorch().catch(() => {});
          handleClose();
        } catch (err: any) {
          triggerCooldownError(
            err.message === 'Нет доступа к этой функции'
              ? 'У вас нет Premium прав для QR входа'
              : `Ошибка: ${err.message}`,
          );
        } finally {
          setTimeout(() => {
            isProcessingScan.current = false;
          }, 1000);
        }
        return;
      }

      // 3. 🔥 НОВАЯ ЛОГИКА: АВТОРИЗАЦИЯ ТЕЛЕФОНА (Телефон сканирует ПК для входа Телефона)
      if (phoneLoginToken) {
        isProcessingScan.current = true;
        try {
          // Ищем готовую ссылку в базе (которую ПК туда любезно положил)
          const { data, error } = await supabase
            .from('qr_auth_sessions')
            .select('status, action_link')
            .eq('id', phoneLoginToken)
            .single();

          if (error || !data) throw new Error('QR-код устарел или не существует');
          if (data.status !== 'approved' || !data.action_link)
            throw new Error('QR-код еще не готов');

          toast.success('Успешно! Входим в аккаунт...');
          if (torchOn) toggleTorch().catch(() => {});
          handleClose();

          // Редиректим телефон по магической ссылке
          window.location.href = data.action_link;
        } catch (err: any) {
          triggerCooldownError(`Ошибка: ${err.message}`);
        } finally {
          setTimeout(() => {
            isProcessingScan.current = false;
          }, 1000);
        }
        return;
      }

      triggerCooldownError('Это не QR-код Music Tree');
    } catch {
      triggerCooldownError('Неверный формат QR-кода');
    }
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
            className="cursor-pointer rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="relative h-full w-full bg-black">
          {cameraError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface p-6 text-center">
              <CameraSlash size={56} className="mb-4 text-primary" />
              <p className="mb-2 text-xl font-medium text-text">Камера недоступна</p>
              <p className="mb-8 text-sm leading-relaxed text-text/60">{cameraError}</p>
              <Button variant="solid" color="primary" onClick={handleClose}>
                Понятно
              </Button>
            </div>
          ) : (
            isCameraActive && (
              <>
                <div ref={containerRef} className="absolute inset-0 z-0 [&_video]:object-cover">
                  <Scanner
                    onScan={handleScan}
                    onError={handleCameraError}
                    formats={['qr_code']}
                    sound={false}
                    components={{ finder: false, torch: false, zoom: false }}
                    styles={{
                      container: { width: '100%', height: '100%' },
                      video: { width: '100%', height: '100%', objectFit: 'cover' },
                    }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
                  <div className="relative size-[260px] rounded-3xl shadow-[0_0_0_4000px_rgba(0,0,0,0.55)] sm:size-[300px]">
                    <div className="absolute -top-1 -left-1 size-14 rounded-tl-[24px] border-t-[4px] border-l-[4px] border-white" />
                    <div className="absolute -top-1 -right-1 size-14 rounded-tr-[24px] border-t-[4px] border-r-[4px] border-white" />
                    <div className="absolute -bottom-1 -left-1 size-14 rounded-bl-[24px] border-b-[4px] border-l-[4px] border-white" />
                    <div className="absolute -right-1 -bottom-1 size-14 rounded-br-[24px] border-r-[4px] border-b-[4px] border-white" />
                  </div>
                </div>
                {torchAvailable && (
                  <div className="absolute right-0 bottom-10 left-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom)]">
                    <button
                      onClick={toggleTorch}
                      className={`flex size-14 cursor-pointer items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-95 ${torchOn ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-black/60'}`}
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
