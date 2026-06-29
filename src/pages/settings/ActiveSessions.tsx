import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
import {
  Monitor,
  DeviceMobileCamera,
  SignOut,
  QrCode,
  X,
  CircleNotch,
  CaretDown,
} from '@phosphor-icons/react';
import { toast } from '@/app/utils/toast';
import { Modal } from '@/shared/Modal';
import { QrScannerModal } from '@/shared/QrScannerModal';
import { useAuthStore } from '@/app/store/authStore';
import { Avatar } from '@/shared/Avatar';
import { GradientQrCode } from '@/shared/GradientQrCode';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/app/utils/cn';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  last_active: string;
}

export const ActiveSessions = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [isConfirmingTerminateAll, setIsConfirmingTerminateAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Стейты для "ПК -> Телефон"
  const [isShowQrModalOpen, setIsShowQrModalOpen] = useState(false);
  const [phoneQrLink, setPhoneQrLink] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const currentDeviceId = localStorage.getItem('music-tree-device-id');

  useEffect(() => {
    if (!user || !profile?.can_use_qr_login) return;

    const fetchDevices = async () => {
      const { data } = await supabase
        .from('active_devices')
        .select('*')
        .order('last_active', { ascending: false });
      if (data) setDevices(data);
    };

    fetchDevices();

    const channel = supabase
      .channel('active_devices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_devices' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDevices((prev) => {
              if (prev.some((d) => d.id === payload.new.id)) return prev;
              return [payload.new as Device, ...prev].sort(
                (a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime(),
              );
            });
            toast.success('Вход выполнен');
            setIsShowQrModalOpen(false);
          } else if (payload.eventType === 'DELETE') {
            setDevices((prev) => prev.filter((d) => d.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            fetchDevices();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile?.can_use_qr_login]);

  // ЭФФЕКТ ДЛЯ ГЕНЕРАЦИИ КОДА ДЛЯ ТЕЛЕФОНА
  useEffect(() => {
    if (isShowQrModalOpen) {
      const generateQr = async () => {
        setIsGeneratingQr(true);
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) throw new Error('Нет сессии');

          const { data, error } = await supabase.functions.invoke('qr-login', {
            body: {
              redirect_to: `${window.location.origin}/app/tree`,
              return_link_only: true, // Требуем прямую ссылку без записи в БД
            },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (error || !data?.action_link) throw new Error('Ошибка генерации');

          // Вшиваем чистую магическую ссылку прямо в QR-код
          setPhoneQrLink(data.action_link);
        } catch (e) {
          toast.error('Не удалось создать код');
          setIsShowQrModalOpen(false);
        } finally {
          // Даем анимации прокрутиться хотя бы секунду для красоты
          setTimeout(() => setIsGeneratingQr(false), 800);
        }
      };
      generateQr();
    } else {
      setPhoneQrLink(null);
    }
  }, [isShowQrModalOpen]);

  if (!user || !profile?.can_use_qr_login) return null;

  const terminateDevice = async (id: string) => {
    if (!currentDeviceId) return;

    setIsTerminating(true); // Включаем лоадер
    try {
      const { error } = await supabase.rpc('terminate_device', {
        target_device_id: id,
        current_device_id: currentDeviceId,
      });

      if (!error) {
        toast.success('Сеанс завершен');
      } else {
        toast.error(error.message || 'Не удалось завершить сеанс');
      }
    } finally {
      setIsTerminating(false); // Выключаем лоадер
      setDeviceToRemove(null); // Модалка закрывается в любом случае
    }
  };

  const terminateAllOther = async () => {
    if (!currentDeviceId) return;

    setIsTerminatingAll(true); // Включаем лоадер
    try {
      const { error } = await supabase.rpc('terminate_all_other_devices', {
        current_device_id: currentDeviceId,
      });

      if (!error) {
        toast.success('Все остальные сеансы завершены');
      } else {
        toast.error(error.message || 'Не удалось завершить сеансы');
      }
    } finally {
      setIsTerminatingAll(false); // Выключаем лоадер
      setIsConfirmingTerminateAll(false); // Модалка закрывается в любом случае
    }
  };

  return (
    // 1. Убрали flex flex-col gap-4 отсюда, чтобы не было прыжков layout-а
    <div className="mb-10 w-full max-w-[700px]">
      {/* 1. Кликабельная плашка-заголовок С ПОДЛОЖКОЙ */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="group relative flex w-full cursor-pointer items-center justify-between rounded-[20px] bg-surface px-6 py-4 transition-all duration-200 ease-out outline-none active:scale-[0.98]"
      >
        {/* ИЗМЕНЕНО: items-end и leading-none, чтобы прижать цифру к низу строки */}
        <div className="flex items-center gap-3">
          <h3 className="text-xl leading-none font-medium text-text transition-colors group-hover:text-text/80">
            Активные сеансы
          </h3>
          {devices.length > 0 && (
            <span className="text-sm leading-none font-semibold text-text/40">
              {devices.length}
            </span>
          )}
        </div>

        {/* 2. Стрелочка БЕЗ КРУЖКА */}
        <div
          className={cn(
            'text-text transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:text-text/40',
            isExpanded ? 'rotate-180' : 'rotate-0',
          )}
        >
          <CaretDown size={24} weight="bold" />
        </div>
      </button>

      {/* 3. Плавно разворачивающийся контент */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            // ИЗМЕНЕНО: Добавлено -mx-2 px-2. Это расширяет невидимые границы
            // overflow-hidden на 8px по бокам, давая кнопкам место для scale-102
            className="-mx-2 overflow-hidden px-2"
          >
            <div className="flex flex-col gap-4 pt-4 pb-2">
              {/* --- ТВОЙ СТАРЫЙ КОНТЕНТ (Кнопки и список) --- */}
              <Button
                variant="solid"
                color="primary"
                onClick={() => setIsScannerOpen(true)}
                className="mb-2 w-full gap-2 rounded-2xl py-4 md:hidden"
              >
                <QrCode size={24} weight="bold" />
                Подключить устройство
              </Button>

              <Button
                variant="solid"
                color="primary"
                onClick={() => setIsShowQrModalOpen(true)}
                className="mb-2 hidden w-full gap-2 md:flex"
              >
                <QrCode size={24} weight="bold" />
                Показать QR-код для входа с телефона
              </Button>

              {devices.length > 1 && (
                <Button
                  variant="outline"
                  color="primary"
                  onClick={() => setIsConfirmingTerminateAll(true)}
                  className="mb-2 w-full"
                >
                  Завершить все другие сеансы
                </Button>
              )}

              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {devices.map((device) => {
                    const isCurrent = device.id === currentDeviceId;
                    return (
                      <motion.div
                        key={device.id}
                        layout
                        initial={{
                          opacity: 0,
                          height: 0,
                          scale: 0.95,
                          overflow: 'hidden',
                          marginBottom: -12,
                        }}
                        animate={{
                          opacity: 1,
                          height: 'auto',
                          scale: 1,
                          overflow: 'visible',
                          marginBottom: 0,
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          scale: 0.9,
                          overflow: 'hidden',
                          marginBottom: -12,
                        }}
                        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                      >
                        {/* Сама карточка вынесена внутрь motion.div */}
                        <div className="flex items-center justify-between gap-12 rounded-2xl bg-surface px-6 py-4">
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-text/5 text-text">
                              {device.device_type === 'mobile' ? (
                                <DeviceMobileCamera size={24} />
                              ) : (
                                <Monitor size={24} />
                              )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="truncate font-medium text-text">
                                {device.device_name}{' '}
                                {isCurrent && (
                                  <span className="text-sm text-access">(Это устройство)</span>
                                )}
                              </span>
                              <span className="truncate text-xs text-text/40">
                                Активность: {new Date(device.last_active).toLocaleString('ru-RU')}
                              </span>
                            </div>
                          </div>
                          {!isCurrent && (
                            <button
                              onClick={() => setDeviceToRemove(device)}
                              className="shrink-0 cursor-pointer p-2 text-primary/70 transition-colors hover:text-primary active:scale-95"
                            >
                              <SignOut size={24} weight="bold" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {/* --- КОНЕЦ ТВОЕГО КОНТЕНТА --- */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- МОДАЛКИ --- */}
      <QrScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />

      {/* 🔥 МОДАЛКА ПК -> ТЕЛЕФОН (Оставили только одну!) */}
      <Modal
        isOpen={isShowQrModalOpen}
        onClose={() => setIsShowQrModalOpen(false)}
        layout="vertical"
        className="max-w-sm rounded-[32px] bg-surface p-6 text-center"
      >
        <div className="relative flex w-full flex-col items-center">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <Avatar
              name={profile?.full_name || profile?.username || 'User'}
              src={profile?.avatar_url}
              lqip={profile?.avatar_lqip}
              forceGradient={profile?.use_gradient}
              className="size-20"
            />
          </div>

          <button
            onClick={() => setIsShowQrModalOpen(false)}
            className="absolute top-0 right-0 cursor-pointer p-2 text-text/40 transition-colors hover:text-text"
          >
            <X size={24} weight="bold" />
          </button>

          {isGeneratingQr ? (
            <div className="mt-12 mb-6 flex size-[250px] items-center justify-center [perspective:800px]">
              {/* Точная копия твоей CSS-анимации через Framer Motion */}
              <motion.div
                style={{ transformOrigin: 'center' }}
                animate={{
                  rotateX: [0, 70, 75, 75, 0],
                  rotateY: [0, 50, 55, 55, 0],
                }}
                transition={{
                  duration: 3,
                  ease: 'linear',
                  times: [0, 0.45, 0.5, 0.52, 1], // Повторяет твои keyframes 0%, 45%, 50%, 52%, 100%
                  repeat: Infinity,
                }}
              >
                <svg viewBox="0 0 200 200" stroke="currentColor" className="size-52.5 text-primary">
                  <circle cx="100" cy="100" r="80" fill="none" strokeWidth="4" />
                </svg>
              </motion.div>
            </div>
          ) : (
            <GradientQrCode value={phoneQrLink} size={200} className="mt-12 mb-6" />
          )}

          <p className="max-w-[260px] text-center text-sm leading-relaxed text-text/60">
            Откройте страницу входа на телефоне и нажмите{' '}
            <span className="font-semibold text-text">"Войти по QR-коду"</span>.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={!!deviceToRemove}
        onClose={() => setDeviceToRemove(null)}
        layout="vertical"
        className="max-w-[600px] rounded-[24px] bg-surface !p-8"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="text-base font-normal text-text">
            Вы действительно хотите выйти из аккаунта на этом устройстве?
          </span>
          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="text"
              onClick={() => setDeviceToRemove(null)}
              disabled={isTerminating} // Блокируем отмену во время загрузки
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={() => {
                if (deviceToRemove) terminateDevice(deviceToRemove.id);
              }}
              disabled={isTerminating} // Блокируем кнопку
              className="w-full gap-2 sm:w-auto"
            >
              {/* Показываем крутилку, если грузится */}
              {isTerminating && <CircleNotch weight="bold" size={20} className="animate-spin" />}
              {isTerminating ? 'Завершение...' : 'Завершить'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmingTerminateAll}
        onClose={() => setIsConfirmingTerminateAll(false)}
        layout="vertical"
        className="max-w-[600px] rounded-[24px] bg-surface !p-8"
      >
        <div className="flex flex-col gap-6 text-left">
          <span className="text-base font-normal text-text">
            Вы действительно хотите завершить <b>все другие</b> сеансы?
          </span>
          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="text"
              onClick={() => setIsConfirmingTerminateAll(false)}
              disabled={isTerminatingAll}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={terminateAllOther}
              disabled={isTerminatingAll}
              className="w-full gap-2 sm:w-auto"
            >
              {isTerminatingAll && <CircleNotch weight="bold" size={20} className="animate-spin" />}
              {isTerminatingAll ? 'Завершение...' : 'Завершить все'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
