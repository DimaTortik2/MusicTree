import React, { useState, useEffect, useMemo } from 'react';
import { ArrowArcLeft, ArrowCounterClockwise, Keyboard } from '@phosphor-icons/react';
// ✨ Добавили импорт ShortcutMetadata
import {
  useShortcutStore,
  SHORTCUTS_METADATA,
  type ShortcutAction,
  type ShortcutMetadata,
} from '@/app/store/useShortcutStore';
import { encodeKeystroke, formatKeystroke } from '@/app/utils/shortcutUtils';
import { cn } from '@/app/utils/cn';

interface ShortcutCustomizationProps {
  onClose: () => void;
}

export const ShortcutCustomization: React.FC<ShortcutCustomizationProps> = ({ onClose }) => {
  const { shortcuts, updateShortcut, resetShortcuts } = useShortcutStore();
  const [listeningAction, setListeningAction] = useState<ShortcutAction | null>(null);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }

      const combo = encodeKeystroke(e);
      if (!combo) return;

      updateShortcut(listeningAction, combo);
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningAction, updateShortcut]);

  // ✨ Исправили типизацию здесь
  const categories = useMemo(() => {
    return Object.entries(SHORTCUTS_METADATA).reduce(
      (acc, [key, item]) => {
        const action = key as ShortcutAction;
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push({ action, ...item });
        return acc;
      },
      {} as Record<string, Array<{ action: ShortcutAction } & ShortcutMetadata>>,
    );
  }, []);

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-y-auto bg-background px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[50vh]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="-ml-2 p-2 text-white/40 transition-colors outline-none active:text-text"
          >
            <ArrowArcLeft size={28} />
          </button>
          <h2 className="text-xl font-medium text-text">Горячие клавиши</h2>
        </div>

        <button
          onClick={resetShortcuts}
          className="p-2 text-white/40 transition-colors outline-none hover:text-text active:scale-95"
          title="Сбросить все шорткаты"
        >
          <ArrowCounterClockwise size={24} />
        </button>
      </div>

      <p className="mb-8 text-[14px] leading-tight text-white/40">
        Нажмите на текущее сочетание клавиш, чтобы назначить новое. Доступны Ctrl, Shift и Alt.
      </p>

      <div className="flex flex-col gap-8">
        {Object.entries(categories).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm tracking-wider text-white/40 uppercase">{category}</h3>

            <div className="relative flex flex-col">
              {items.map(({ action, label }) => {
                const isListening = listeningAction === action;

                // ✨ Теперь TypeScript точно знает, что action — это ShortcutAction
                const currentKey = shortcuts[action];

                return (
                  <div key={action} className="relative flex items-center gap-4 bg-background py-3">
                    {/* Иконка слева */}
                    <div className="flex w-7 shrink-0 items-center justify-center">
                      <Keyboard size={28} className="text-text/80" />
                    </div>

                    {/* Текст */}
                    <div className="flex flex-1 items-center">
                      <h4 className="text-[16px] font-medium text-text">{label}</h4>
                    </div>

                    {/* Кнопка записи */}
                    <button
                      onClick={() => setListeningAction(action)}
                      className={cn(
                        'flex h-9 min-w-[100px] shrink-0 cursor-pointer items-center justify-center rounded-xl border px-3 text-[13px] font-semibold transition-all duration-200 outline-none select-none active:scale-[0.98]',
                        isListening
                          ? 'animate-pulse border-primary bg-primary text-white'
                          : 'border-surface bg-surface text-text hover:bg-surface/80 active:border-primary/50',
                      )}
                    >
                      {isListening ? 'Нажмите...' : formatKeystroke(currentKey)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
