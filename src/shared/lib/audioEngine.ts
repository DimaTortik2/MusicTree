import * as Tone from 'tone';

// 1. Создаем строго ОДИН инстанс AudioContext для всего приложения
// (Поддержка старых webkit префиксов для старых Safari на всякий случай)
const NativeAudioContext = window.AudioContext || (window as any).webkitAudioContext;
export const globalAudioContext = new NativeAudioContext();

// 2. Принудительно передаем наш контекст в Tone.js (согласно ТЗ)
Tone.setContext(globalAudioContext);

// 3. Главная функция разблокировки звука
export const unlockAudioContext = async () => {
  try {
    // Разблокируем нативный контекст
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }
    // Включаем движок Tone.js
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
  } catch (error) {
    console.error('Ошибка инициализации аудио контекста:', error);
  }
};
