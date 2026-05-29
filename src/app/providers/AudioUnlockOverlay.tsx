import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HandWaving } from '@phosphor-icons/react';
import { globalAudioContext, unlockAudioContext } from '@/shared/lib/audioEngine';

export const AudioUnlockOverlay = () => {
  const location = useLocation();
  // Состояние: заблокирован ли сейчас звук?
  const [isSuspended, setIsSuspended] = useState(globalAudioContext.state === 'suspended');

  useEffect(() => {
    // Слушаем изменения статуса контекста браузера
    const handleStateChange = () => setIsSuspended(globalAudioContext.state === 'suspended');

    globalAudioContext.addEventListener('statechange', handleStateChange);
    return () => globalAudioContext.removeEventListener('statechange', handleStateChange);
  }, []);

  // Если мы на лендинге ИЛИ контекст уже активен — ничего не перекрываем
  if (location.pathname === '/' || !isSuspended) {
    return null;
  }

  // Рендерим оверлей по ТЗ
  return (
    <div
      onClick={unlockAudioContext} // Клик в любое место разблокирует звук
      className="animate-in fade-in fixed inset-0 z-[9999] flex cursor-pointer flex-col items-center justify-center bg-[#0f0510] p-6 text-center duration-300"
    >
      <HandWaving  className="size-28 text-primary sm:size-45" />
      <h1 className="mt-6 text-3xl font-bold text-white sm:text-4xl">Приветствуем</h1>
      <p className="mt-4 text-base text-white/40 sm:text-lg">
        Для корректной работы сайта кликните в любое место
      </p>
    </div>
  );
};
