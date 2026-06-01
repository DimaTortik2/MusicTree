import * as Tone from 'tone';

export const unlockAudioContext = async () => {
  try {
    // Tone.start() делает всё необходимое: resume() контекста и
    // запуск тихих осцилляторов для снятия мута на iOS
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
  } catch (error) {
    console.error('Ошибка инициализации аудио контекста:', error);
  }
};
