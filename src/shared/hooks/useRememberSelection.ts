import { useEffect, useRef, useCallback } from 'react';

export const useRememberSelection = (
  storageKey: string,
  currentId: string | undefined,
  isValidId: (id: string) => boolean,
) => {
  // Используем ref для функции валидации, чтобы не триггерить useEffect
  // при каждом рендере (когда дата меняется)
  const isValidIdRef = useRef(isValidId);

  useEffect(() => {
    isValidIdRef.current = isValidId;
  }, [isValidId]);

  // Запоминаем валидный ID при заходе на страницу
  useEffect(() => {
    if (currentId && isValidIdRef.current(currentId)) {
      localStorage.setItem(storageKey, currentId);
    }
  }, [currentId, storageKey]);

  // Функция для безопасного извлечения сохраненного ID
  const getSavedId = useCallback(() => {
    const saved = localStorage.getItem(storageKey);
    // Возвращаем сохраненный ID только если он до сих пор доступен пользователю
    return saved && isValidIdRef.current(saved) ? saved : null;
  }, [storageKey]);

  return getSavedId;
};
