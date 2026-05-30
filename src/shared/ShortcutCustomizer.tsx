import React, { useState, useEffect } from 'react';
import { useShortcutStore, SHORTCUTS_METADATA, type ShortcutAction } from '@/app/store/useShortcutStore';
import { encodeKeystroke, formatKeystroke } from '@/app/utils/shortcutUtils';
import { Keyboard, ArrowCounterClockwise } from '@phosphor-icons/react';
import { cn } from '@/app/utils/cn';

export const ShortcutCustomizer: React.FC = () => {
  const { shortcuts, updateShortcut, resetShortcuts } = useShortcutStore();
  const [listeningAction, setListeningAction] = useState<ShortcutAction | null>(null);

  useEffect(() => {
    if (!listeningAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Отмена по ESC
      if (e.code === 'Escape') {
        setListeningAction(null);
        return;
      }

      // Если зажали только модификатор (например Ctrl), ждем пока нажмут основную кнопку
      const combo = encodeKeystroke(e);
      if (!combo) return;

      updateShortcut(listeningAction, combo);
      setListeningAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [listeningAction, updateShortcut]);

  const categories = Object.entries(SHORTCUTS_METADATA).reduce(
    (acc, [key, value]) => {
      const action = key as ShortcutAction;
      if (!acc[value.category]) acc[value.category] = [];
      acc[value.category].push({ action, ...value });
      return acc;
    },
    {} as Record<string, Array<{ action: ShortcutAction; label: string; defaultCode: string }>>,
  );

  return (
    <div className="rounded-[24px] border border-text/10 bg-surface p-6 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Keyboard size={24} />
          </div>
          <div>
            <h3 className="text-xl font-medium text-text">Горячие клавиши</h3>
            <p className="text-xs text-text/40">Поддержка Ctrl, Shift и Alt</p>
          </div>
        </div>
        <button
          onClick={resetShortcuts}
          title="Сбросить все шорткаты"
          className="cursor-pointer text-text/40 transition-colors outline-none hover:text-text active:scale-95"
        >
          <ArrowCounterClockwise size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(categories).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-primary uppercase">
              {category}
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {items.map(({ action, label }) => {
                const isListening = listeningAction === action;
                const currentKey = shortcuts[action];

                return (
                  <div
                    key={action}
                    className={cn(
                      'flex items-center justify-between rounded-xl border p-4 transition-all duration-200',
                      isListening
                        ? 'border-primary bg-primary/5'
                        : 'border-text/5 bg-background/30',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isListening ? 'text-primary' : 'text-text/80',
                      )}
                    >
                      {label}
                    </span>

                    <button
                      onClick={() => setListeningAction(action)}
                      className={cn(
                        'flex h-10 min-w-[120px] cursor-pointer items-center justify-center rounded-xl border px-4 text-xs font-semibold transition-all duration-200 select-none active:scale-[0.98]',
                        isListening
                          ? 'animate-pulse border-primary bg-primary text-white'
                          : 'border-text/10 bg-surface text-text hover:border-primary/50 hover:bg-surface/80',
                      )}
                    >
                      {isListening ? 'Нажмите комбинацию...' : formatKeystroke(currentKey)}
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
