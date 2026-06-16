import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
import { Monitor, DeviceMobileCamera, SignOut, QrCode } from '@phosphor-icons/react';
import { toast } from '@/app/utils/toast';
import { Modal } from '@/shared/Modal';
import { QrScannerModal } from '@/shared/QrScannerModal';

interface Device {
  id: string;
  device_name: string;
  device_type: string;
  last_active: string;
}

export const ActiveSessions = () => {
  const [devices, setDevices] = useState<Device[]>([]);

  // Стейты для модалок
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [isConfirmingTerminateAll, setIsConfirmingTerminateAll] = useState(false);

  // Стейт для сканера
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const currentDeviceId = localStorage.getItem('music-tree-device-id');

  useEffect(() => {
    const fetchDevices = async () => {
      const { data } = await supabase
        .from('active_devices')
        .select('*')
        .order('last_active', { ascending: false });
      if (data) setDevices(data);
    };

    fetchDevices();
  }, []);

  const terminateDevice = async (id: string) => {
    const { error } = await supabase.from('active_devices').delete().eq('id', id);
    if (!error) {
      setDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success('Сеанс завершен');
    } else {
      toast.error('Не удалось завершить сеанс');
    }
    setDeviceToRemove(null);
  };

  const terminateAllOther = async () => {
    const { error } = await supabase.from('active_devices').delete().neq('id', currentDeviceId);

    if (!error) {
      setDevices((prev) => prev.filter((d) => d.id === currentDeviceId));
      toast.success('Все остальные сеансы завершены');
    } else {
      toast.error('Не удалось завершить сеансы');
    }
    setIsConfirmingTerminateAll(false);
  };

  return (
    <div className="mb-6 flex w-full max-w-[700px] flex-col gap-4 rounded-[24px]">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-medium text-text">Активные сеансы</h3>
      </div>

      {/* --- КНОПКА ПОДКЛЮЧЕНИЯ НОВОГО УСТРОЙСТВА --- */}
      <Button
        variant="solid"
        color="primary"
        onClick={() => setIsScannerOpen(true)}
        className="md:hidden mb-2 w-full gap-2 rounded-2xl py-4"
      >
        <QrCode size={24} weight="bold" />
        Подключить устройство
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
        {devices.map((device) => {
          const isCurrent = device.id === currentDeviceId;

          return (
            <div
              key={device.id}
              className="flex items-center justify-between gap-12 rounded-2xl bg-surface px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-text/5 text-text">
                  {device.device_type === 'mobile' ? (
                    <DeviceMobileCamera size={24} />
                  ) : (
                    <Monitor size={24} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-text">
                    {device.device_name}{' '}
                    {isCurrent && <span className="text-access">(Это устройство)</span>}
                  </span>
                  <span className="text-xs text-text/40">
                    Активность: {new Date(device.last_active).toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>

              {!isCurrent && (
                <button
                  onClick={() => setDeviceToRemove(device)}
                  className="cursor-pointer p-2 text-primary/70 transition-colors hover:text-primary active:scale-95"
                >
                  <SignOut size={24} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Сканнер. Передаем пустой промис для друзей, так как тут мы ждем только QR для авторизации */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={async () => {}} // Оставляем пустым, так как логика входа внутри самого сканера
      />

      {/* --- МОДАЛКИ УДАЛЕНИЯ (ОСТАЛИСЬ БЕЗ ИЗМЕНЕНИЙ) --- */}
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
          {deviceToRemove && (
            <div className="flex items-center gap-4 border-l-3 border-primary pl-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-text/5 text-text">
                {deviceToRemove.device_type === 'mobile' ? (
                  <DeviceMobileCamera size={24} />
                ) : (
                  <Monitor size={24} />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-medium text-text">{deviceToRemove.device_name}</span>
                <span className="text-sm text-text/40">
                  Активность: {new Date(deviceToRemove.last_active).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          )}
          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="text"
              onClick={() => setDeviceToRemove(null)}
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
              className="w-full sm:w-auto"
            >
              Завершить
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
          <div className="flex items-center gap-4 border-l-3 border-primary pl-4">
            <div className="flex flex-col">
              <span className="text-lg font-medium text-text">Безопасность аккаунта</span>
              <span className="text-sm text-text/40">
                Это приведет к выходу из аккаунта на всех устройствах, кроме текущего.
              </span>
            </div>
          </div>
          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="text"
              onClick={() => setIsConfirmingTerminateAll(false)}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={terminateAllOther}
              className="w-full sm:w-auto"
            >
              Завершить все
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
