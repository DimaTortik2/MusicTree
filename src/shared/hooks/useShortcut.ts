import { useEffect, useRef } from 'react';
import { useShortcutStore, type ShortcutAction } from '@/app/store/useShortcutStore';
import { encodeKeystroke } from '@/app/utils/shortcutUtils';

// === ЭТОТ КОМПОНЕНТ НУЖНО ДОБАВИТЬ ОДИН РАЗ В КОРЕНЬ ПРИЛОЖЕНИЯ ===
// (Я уже добавил его в AppLayout ниже)
export const ShortcutManager = () => {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Игнорируем зажатие

      // Проверяем, не в инпуте ли мы
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';
        const type = activeEl.getAttribute('type');

        const isAllowedInput =
          tag === 'input' &&
          (type === 'range' || type === 'radio' || type === 'checkbox' || type === 'button');

        if ((tag === 'input' && !isAllowedInput) || tag === 'textarea' || isContentEditable) {
          return; // Если мы печатаем текст - шорткаты отключены
        }
      }

      // Собираем нажатую комбинацию (например "Ctrl+KeyM")
      const pressedCombo = encodeKeystroke(e);
      if (!pressedCombo) return;

      // Ищем, есть ли такая комбинация в нашем Zustand-сторе
      const shortcuts = useShortcutStore.getState().shortcuts;
      const matchedAction = Object.entries(shortcuts).find(([_, code]) => code === pressedCombo);

      if (matchedAction) {
        const [actionName] = matchedAction;
        e.preventDefault(); // Блокируем стандартное действие браузера

        // Бросаем кастомный ивент
        window.dispatchEvent(new CustomEvent('app-shortcut', { detail: actionName }));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return null; // Ничего не рендерит
};

// === ИДЕАЛЬНО ОПТИМИЗИРОВАННЫЙ ХУК ДЛЯ КОМПОНЕНТОВ ===
export const useShortcut = (action: ShortcutAction, callback: () => void) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ShortcutAction>;
      if (customEvent.detail === action) {
        callbackRef.current();
      }
    };

    window.addEventListener('app-shortcut', handler);
    return () => window.removeEventListener('app-shortcut', handler);
  }, [action]);
};
