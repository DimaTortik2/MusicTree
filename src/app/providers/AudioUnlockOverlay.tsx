import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HandWaving } from '@phosphor-icons/react';
import * as Tone from 'tone';
import { unlockAudioContext } from '@/shared/lib/audioEngine';

export const AudioUnlockOverlay = () => {
  const location = useLocation();
  // Состояние: заблокирован ли сейчас звук (берем из встроенного контекста Tone)
  const [isSuspended, setIsSuspended] = useState(Tone.getContext().state === 'suspended');

  useEffect(() => {
    // Слушаем изменения статуса нативного контекста браузера
    const handleStateChange = () => {
      setIsSuspended(Tone.getContext().state === 'suspended');
    };

    // Достаем нативный AudioContext из Tone.js
    const rawContext = Tone.getContext().rawContext as AudioContext;

    rawContext.addEventListener('statechange', handleStateChange);
    return () => rawContext.removeEventListener('statechange', handleStateChange);
  }, []);

  // Если мы на лендинге ИЛИ контекст уже активен — ничего не перекрываем
  if (location.pathname === '/' || !isSuspended) {
    return null;
  }

  // Обработчик клика: разблокируем звук и на всякий случай синхронизируем стейт
  const handleUnlock = async () => {
    await unlockAudioContext();
    setIsSuspended(Tone.getContext().state === 'suspended');
  };

  // Рендерим оверлей по ТЗ
  return (
    <div
      onClick={handleUnlock} // Клик в любое место разблокирует звук
      className="animate-in fade-in fixed inset-0 z-[9999] flex cursor-pointer flex-col items-center justify-center bg-[#0f0510] p-6 text-center duration-300"
    >
      <HandWaving className="size-28 text-primary sm:size-45" />
      <h1 className="mt-6 text-3xl font-bold text-white sm:text-4xl">Приветствуем</h1>
      <p className="mt-4 text-base text-white/40 sm:text-lg">
        Для корректной работы сайта кликните в любое место
      </p>
    </div>
  );
};
