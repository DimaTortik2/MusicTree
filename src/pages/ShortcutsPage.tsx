import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowArcLeft, ArrowCounterClockwise } from '@phosphor-icons/react';
import {
  useShortcutStore,
  type ShortcutAction,
  SHORTCUTS_METADATA,
  type ShortcutMetadata,
} from '@/app/store/useShortcutStore';
import { encodeKeystroke, formatKeystroke } from '@/app/utils/shortcutUtils';
import { cn } from '@/app/utils/cn';

import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';

export default function ShortcutsPage() {
  const navigate = useNavigate();
  const { shortcuts, updateShortcut, resetShortcuts } = useShortcutStore();

  const [listeningAction, setListeningAction] = useState<ShortcutAction | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false); // стейт для модалки

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
    <div className="relative min-h-screen w-full bg-background p-6 pb-[50vh] text-text ">
      <div className="mx-auto max-w-250">
        {/* Шапка */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="-ml-2 cursor-pointer p-2 text-white/40 transition-colors outline-none hover:text-text active:scale-95"
            >
              <ArrowArcLeft size={28} />
            </button>
            <h2 className="text-2xl font-medium text-text md:text-3xl">Горячие клавиши</h2>
          </div>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="cursor-pointer p-2 text-white/40 transition-colors outline-none hover:text-text active:scale-95"
            title="Сбросить все шорткаты"
          >
            <ArrowCounterClockwise size={24} />
          </button>
        </div>

        <p className="mb-10 text-[15px] leading-relaxed text-white/40">
          Нажмите на текущее сочетание клавиш, чтобы назначить новое. Вы можете использовать
          комбинации с <span className="text-text/70">Ctrl, Shift и Alt</span>. Для отмены нажмите
          кнопку «Отменить» или клавишу <span className="text-text/70">ESC</span>.
        </p>

        {/* Списки по категориям */}
        <div className="flex flex-col gap-10">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category}>
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-lg font-medium tracking-widest text-primary uppercase">
                  {category}
                </h3>
              </div>

              <div className="relative flex flex-col">
                {items.map(({ action, label }) => {
                  const isListening = listeningAction === action;
                  const currentKey = shortcuts[action];

                  return (
                    <div
                      key={action}
                      className="group relative flex items-center justify-between gap-4 rounded-2xl border border-transparent py-4 transition-colors hover:bg-surface/30"
                    >
                      <div className="flex flex-1 items-center">
                        <h4 className="text-[16px] font-medium text-text/90 group-hover:text-text">
                          {label}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3">
                        {isListening && (
                          <button
                            onClick={() => setListeningAction(null)}
                            className="animate-fade-in text-[13px] font-medium text-white/40 outline-none hover:text-white cursor-pointer"
                          >
                            Отменить
                          </button>
                        )}

                        <button
                          onClick={() => setListeningAction(isListening ? null : action)}
                          className={cn(
                            'flex h-10 min-w-[140px] shrink-0 cursor-pointer items-center justify-center rounded-xl px-4 text-[13px] font-semibold tracking-wide transition-all duration-200 outline-none select-none active:scale-[0.98]',
                            isListening
                              ? 'animate-pulse bg-primary text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                              : 'bg-surface text-text hover:bg-surface/80',
                          )}
                        >
                          {isListening ? 'Нажмите клавишу...' : formatKeystroke(currentKey)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Модалка сброса */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        layout="vertical"
        title={
          <>
            Сбросить <span className="text-primary">горячие клавиши</span>?
          </>
        }
        description={
          <span className="text-text/40">
            Вы действительно хотите вернуть все горячие клавиши к стандартным значениям?
          </span>
        }
        className="max-w-2xl rounded-[32px] p-8 md:p-10"
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              color="primary"
              onClick={() => setIsResetModalOpen(false)}
              className="w-full px-4 sm:flex-1"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="md"
              color="primary"
              onClick={() => {
                resetShortcuts();
                setIsResetModalOpen(false);
              }}
              className="w-full px-4 sm:flex-1"
            >
              Сбросить
            </Button>
          </>
        }
      />
    </div>
  );
}
