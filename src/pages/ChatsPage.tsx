import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneRight, ChatCircle, SpinnerGap } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';
import { useAppModeStore } from '@/app/store/useAppModeStore';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { toast } from '@/app/utils/toast';
import { cn } from '@/app/utils/cn';
import { encryptMessage, decryptMessage } from '@/shared/lib/crypto';
import { ChatHeaderBanner } from '@/shared/ChatHeaderBanner';
import { AuthLoader } from '@/app/providers/AuthRoutes'; // <-- Подставь свой путь

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const PAGE_SIZE = 30;

export function ChatsPage() {
  const { user, profile } = useAuthStore();
  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Состояния загрузки
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Состояния UI
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(true);

  // Рефы
  const lastScrollTop = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const isInputFocusedRef = useRef(false);
  const previousScrollHeightRef = useRef<number>(0);
  const isFirstRenderDone = useRef(false);
  const pendingInitialScrollRef = useRef(false);

  // Определение мобилки и блокировка боди
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && mounted) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, mounted]);

  // Глобальный слушатель скролла для шапки
  useEffect(() => {
    let isReady = false;
    let rafId: number;

    const handleScrollWindow = (e: Event) => {
      if (!isReady) return;
      const target = e.target as HTMLElement;
      if (target && target.classList && target.classList.contains('overflow-y-auto')) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const currentScrollTop = target.scrollTop;
          if (currentScrollTop > lastScrollTop.current) {
            setIsScrolled(true);
          } else if (currentScrollTop < lastScrollTop.current) {
            if (!isInputFocusedRef.current) setIsScrolled(false);
          }
          lastScrollTop.current = currentScrollTop <= 0 ? 0 : currentScrollTop;
        });
      }
    };

    window.addEventListener('scroll', handleScrollWindow, { capture: true, passive: true });

    const timer = setTimeout(() => {
      isReady = true;
      const scrollContainer = containerRef.current;
      if (scrollContainer) {
        lastScrollTop.current = scrollContainer.scrollTop;
        setIsScrolled(scrollContainer.scrollTop > 40);
      }
    }, 800);

    return () => {
      window.removeEventListener('scroll', handleScrollWindow, { capture: true });
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Первичная загрузка сообщений
  useEffect(() => {
    if (!sharedTreeId || !user) {
      setIsLoadingInitial(false);
      return;
    }

    const fetchInitialMessages = async () => {
      setIsLoadingInitial(true);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('shared_tree_id', sharedTreeId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) {
        toast.error('Не удалось загрузить сообщения');
        setIsLoadingInitial(false);
      } else if (data && data.length > 0) {
        const reversedData = data.reverse();
        const decryptedMessages = await Promise.all(
          reversedData.map(async (msg) => ({
            ...msg,
            content: await decryptMessage(msg.content, sharedTreeId),
          })),
        );

        // Включаем флаг: "Нужно отмотать вниз, когда отрендерится"
        pendingInitialScrollRef.current = true;

        setHasMore(data.length === PAGE_SIZE);
        setMessages(decryptedMessages); // Триггерит рендер
      } else {
        // Если чат пустой — просто снимаем лоадер
        isFirstRenderDone.current = true;
        setIsLoadingInitial(false);
      }
    };

    fetchInitialMessages();

    // Подписка на новые сообщения
    const channel = supabase
      .channel(`chat_${sharedTreeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `shared_tree_id=eq.${sharedTreeId}`,
        },
        async (payload) => {
          const rawMessage = payload.new as Message;
          // Избегаем дублей при оптимистичном UI
          setMessages((prev) => {
            if (prev.some((m) => m.id === rawMessage.id)) return prev;
            return prev;
          });

          const decryptedContent = await decryptMessage(rawMessage.content, sharedTreeId);

          setMessages((prev) => {
            if (prev.some((m) => m.id === rawMessage.id)) return prev;
            return [...prev, { ...rawMessage, content: decryptedContent }];
          });

          // Если мы внизу — прокручиваем к новому сообщению
          if (isNearBottomRef.current) {
            setTimeout(() => scrollToBottom('smooth'), 50);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sharedTreeId, user, scrollToBottom]);

  // Подгрузка старых сообщений (Pagination)
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0 || !sharedTreeId) return;

    setIsLoadingMore(true);

    // Запоминаем текущую высоту контента ДО добавления новых элементов
    if (containerRef.current) {
      previousScrollHeightRef.current = containerRef.current.scrollHeight;
    }

    const oldestMessage = messages[0];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('shared_tree_id', sharedTreeId)
      .lt('created_at', oldestMessage.created_at) // Cursor-based pagination
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      toast.error('Не удалось загрузить историю');
    } else if (data) {
      const reversedData = data.reverse();
      const decryptedMessages = await Promise.all(
        reversedData.map(async (msg) => ({
          ...msg,
          content: await decryptMessage(msg.content, sharedTreeId),
        })),
      );

      setMessages((prev) => [...decryptedMessages, ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setIsLoadingMore(false);
  };

  // Компенсация скролла при подгрузке старых сообщений
  // Выполняется СИНХРОННО сразу после того, как React обновил DOM
useLayoutEffect(() => {
  if (pendingInitialScrollRef.current && containerRef.current) {
    // 1. Первая загрузка: кидаем вниз
    containerRef.current.scrollTop = containerRef.current.scrollHeight;

    requestAnimationFrame(() => {
      setTimeout(() => {
        pendingInitialScrollRef.current = false;
        setIsLoadingInitial(false); // Растворяем монету
        setTimeout(() => {
          isFirstRenderDone.current = true;
        }, 400);
      }, 50);
    });
  }
  // 2. ВОТ ОНО: Компенсация скролла при подгрузке истории
  else if (previousScrollHeightRef.current > 0 && containerRef.current && !isLoadingInitial) {
    const newScrollHeight = containerRef.current.scrollHeight;
    const heightDifference = newScrollHeight - previousScrollHeightRef.current;

    // Сдвигаем скролл ровно на ту высоту, которая добавилась сверху
    containerRef.current.scrollTop += heightDifference;

    // Сбрасываем реф до следующей подгрузки
    previousScrollHeightRef.current = 0;
  }
  // 3. Автоскролл вниз при новом сообщении (если мы и так внизу)
  else if (isNearBottomRef.current && containerRef.current) {
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }
}, [messages, inputValue, isLoadingInitial]);

  // Локальный скролл контейнера (отслеживаем низ и верх)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollHeight, scrollTop, clientHeight } = target;

    // Близость к низу
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

    // Близость к верху -> триггер подгрузки (с небольшим запасом в 50px)
    if (scrollTop < 50 && !isLoadingMore && hasMore && !isLoadingInitial) {
      loadMoreMessages();
    }
  };

const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInputValue(e.target.value);

  if (textareaRef.current) {
    const el = textareaRef.current;

    // Сбрасываем высоту, чтобы измерить новый размер
    el.style.height = 'auto';

    // Высчитываем толщину рамки (border-b-3), чтобы инпут не проседал
    const borderOffset = el.offsetHeight - el.clientHeight;

    // Присваиваем высоту: контент + бордер
    el.style.height = `${Math.min(el.scrollHeight + borderOffset, 150)}px`;
  }
};

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user || !sharedTreeId) return;

    const msgContent = inputValue.trim();
    setInputValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    isNearBottomRef.current = true;
    const msgId = crypto.randomUUID();

    const optimisticMsg: Message = {
      id: msgId,
      sender_id: user.id,
      content: msgContent,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    const encryptedContent = await encryptMessage(msgContent, sharedTreeId);

    const { error } = await supabase.from('messages').insert([
      {
        id: msgId,
        shared_tree_id: sharedTreeId,
        sender_id: user.id,
        content: encryptedContent,
      },
    ]);

    if (error) {
      toast.error('Ошибка отправки');
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Экраны заглушки (доступ и дерево)
  if (!profile?.can_use_chats) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <Modal
          inline
          layout="vertical"
          title="Доступ к чатам закрыт"
          description="Ваш аккаунт пока не имеет прав для использования личных сообщений."
          icon={<ChatCircle size={40} className="text-primary" weight="regular" />}
          actions={
            <Button variant="solid" onClick={() => navigate('/app/tree')}>
              Вернуться назад
            </Button>
          }
        />
      </div>
    );
  }

  if (!activeSharedFriend || !sharedTreeId) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        <ChatCircle size={64} className="mb-4 text-text/20" weight="thin" />
        <h2 className="mb-2 text-xl font-medium text-text">Чат недоступен</h2>
        <p className="mb-6 text-sm text-text/40">
          Чат доступен только при нахождении в совместном дереве с другом.
        </p>
        <Button onClick={() => navigate('/app/tree')}>К деревьям</Button>
      </div>
    );
  }

  const ChatContent = (
    <div className="relative flex h-full min-h-full flex-col bg-background">
      <ChatHeaderBanner
        isScrolled={isScrolled}
        activeSharedFriend={activeSharedFriend}
        onBack={() => navigate(-1)}
      />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="custom-scroll flex flex-1 flex-col overflow-y-auto px-4 pt-24 pb-6"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4">
          {isLoadingMore && (
            <div className="flex w-full justify-center py-2">
              <SpinnerGap className="animate-spin text-text/40" size={24} />
            </div>
          )}

          {messages.length === 0 && !isLoadingInitial ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="rounded-full bg-surface px-4 py-2 text-sm text-text/40">
                Это начало истории чата.
              </span>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === user?.id;
              const showTail =
                idx === messages.length - 1 || messages[idx + 1].sender_id !== msg.sender_id;

              return (
                <motion.div
                  key={msg.id}
                  // МАГИЯ ЗДЕСЬ:
                  // Если это первое открытие -> стоим на месте (y: 0) и скрыты (opacity: 0).
                  // Если это новое сообщение от друга -> прячемся чуть ниже (y: 15), чтобы выплыть.
                  initial={isFirstRenderDone.current ? { opacity: 0, y: 15 } : { opacity: 0, y: 0 }}
                  // Пока крутится монета — текст прозрачный. Когда монета уходит — текст плавно появляется.
                  animate={{ opacity: isLoadingInitial ? 0 : 1, y: 0 }}
                  // Разные переходы:
                  transition={
                    isFirstRenderDone.current
                      ? { type: 'spring', damping: 25, stiffness: 350 } // Пружина для новых
                      : { duration: 0.4, ease: 'easeOut', delay: 0.1 } // Мягкий fade-in для истории (с микро-задержкой)
                  }
                  className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed break-words break-all whitespace-pre-wrap shadow-sm md:max-w-[70%]',
                      isMe ? 'bg-primary text-white' : 'bg-accent text-white',
                      'rounded-2xl',
                      isMe && showTail ? 'rounded-br-[4px]' : '',
                      !isMe && showTail ? 'rounded-bl-[4px]' : '',
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-1 shrink-0" />
        </div>
      </div>

      <div className="shrink-0 bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom,24px),24px)]">
        <div className="relative mx-auto flex w-full max-w-4xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              isInputFocusedRef.current = true;
              setIsScrolled(true);
            }}
            onBlur={() => {
              isInputFocusedRef.current = false;
            }}
            placeholder="Сообщение..."
            rows={1}
            // Добавили min-h-[44px]
            className="custom-scroll max-h-[150px] min-h-[44px] w-full resize-none border-b-3 border-primary bg-transparent pt-1 pb-2 text-lg font-medium text-text transition-colors outline-none placeholder:text-text/30"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className={cn(
              'mb-1 shrink-0 cursor-pointer p-1 transition-transform outline-none active:scale-95',
              inputValue.trim() ? 'text-primary' : 'pointer-events-none text-text/20',
            )}
          >
            <PaperPlaneRight size={26} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );

  if (mounted && isMobile) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[999] bg-background"
        >
          {ChatContent}
        </motion.div>
      </AnimatePresence>,
      document.body,
    );
  }

  // Десктоп рендер

  return (
    <>
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isLoadingInitial && (
              <motion.div
                key="overlay-loader"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="fixed inset-0 z-[9999]"
              >
                <AuthLoader />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Сам контент чата (мобильный портал или десктоп) */}
      {mounted && isMobile ? (
        createPortal(
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[999] bg-background"
          >
            {ChatContent}
          </motion.div>,
          document.body,
        )
      ) : (
        <div className="relative z-10 h-full w-full">{ChatContent}</div>
      )}
    </>
  );
}