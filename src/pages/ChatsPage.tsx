import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PaperPlaneRight, ChatCircle } from '@phosphor-icons/react';
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

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function ChatsPage() {
  const { user, profile } = useAuthStore();
  const { activeSharedFriend, sharedTreeId } = useAppModeStore();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Состояния для мобильного портала
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

const [isScrolled, setIsScrolled] = useState(true);
const lastScrollTop = useRef(0);

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

        // Сравниваем текущий скролл с предыдущим для понимания направления
        if (currentScrollTop > lastScrollTop.current) {
          setIsScrolled(true); // Скроллим вниз (читаем новые) -> сворачиваем
        } else if (currentScrollTop < lastScrollTop.current) {
          if (!isInputFocusedRef.current) {
            setIsScrolled(false);
          }
        }

        lastScrollTop.current = currentScrollTop <= 0 ? 0 : currentScrollTop;
      });
    }
  };

  window.addEventListener('scroll', handleScrollWindow, { capture: true, passive: true });

  const timer = setTimeout(() => {
    isReady = true;
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      lastScrollTop.current = scrollContainer.scrollTop;
      setIsScrolled(scrollContainer.scrollTop > 40); // Стартовая проверка
    }
  }, 800);

  return () => {
    window.removeEventListener('scroll', handleScrollWindow, { capture: true });
    clearTimeout(timer);
    cancelAnimationFrame(rafId);
  };
}, []);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  const isInputFocusedRef = useRef(false);

  // Определение мобильного устройства
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Блокировка скролла фона для портала
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

  // Загрузка и дешифровка сообщений
  useEffect(() => {
    if (!sharedTreeId || !user) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('shared_tree_id', sharedTreeId)
        .order('created_at', { ascending: true });

      if (error) {
        toast.error('Не удалось загрузить сообщения');
      } else if (data) {
        const decryptedMessages = await Promise.all(
          data.map(async (msg) => ({
            ...msg,
            content: await decryptMessage(msg.content, sharedTreeId),
          })),
        );
        setMessages(decryptedMessages);
      }
      setIsLoading(false);
      setTimeout(scrollToBottom, 50);
    };

    fetchMessages();

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

          setMessages((prev) => {
            if (prev.some((m) => m.id === rawMessage.id)) return prev;
            return prev;
          });

          const decryptedContent = await decryptMessage(rawMessage.content, sharedTreeId);

          setMessages((prev) => {
            if (prev.some((m) => m.id === rawMessage.id)) return prev;
            return [...prev, { ...rawMessage, content: decryptedContent }];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sharedTreeId, user]);


  // Умный скролл + отслеживание направления для шапки
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollHeight, scrollTop, clientHeight } = target;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useLayoutEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, inputValue]);

  // Авто-ресайз текстареи
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  // Шифрование и отправка
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

  // Экран отсутствия доступа
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

  // Экран вне совместного дерева
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

  // === ОСНОВНОЙ КОНТЕНТ ЧАТА ===
 const ChatContent = (
   <div className="relative flex h-full min-h-full flex-col bg-background">
     {/* --- АНИМИРОВАННАЯ ШАПКА ВЫНЕСЕНА В КОМПОНЕНТ --- */}
     <ChatHeaderBanner
       isScrolled={isScrolled}
       activeSharedFriend={activeSharedFriend}
       onBack={() => navigate(-1)}
     />

     {/* --- СПИСОК СООБЩЕНИЙ --- */}
     <div
       ref={containerRef}
       onScroll={handleScroll}
       className="custom-scroll flex flex-1 flex-col overflow-y-auto px-4 pt-24 pb-6"
     >
       {/* Контейнер для центрирования на больших экранах */}
       <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4">
         {isLoading ? (
           <div className="flex h-full items-center justify-center text-sm text-text/40">
             Загрузка сообщений...
           </div>
         ) : messages.length === 0 ? (
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
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ type: 'spring', damping: 25, stiffness: 400 }}
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

     {/* --- ЗОНА ВВОДА --- */}
     <div className="shrink-0 bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom,24px),24px)]">
       <div className="relative mx-auto flex w-full max-w-4xl items-end gap-2">
         {/* Стили скопированы с компонента Input */}
         <textarea
           ref={textareaRef}
           value={inputValue}
           onChange={handleInput}
           onKeyDown={handleKeyDown}
           onFocus={() => {
             isInputFocusedRef.current = true;
             setIsScrolled(true); // Принудительно сворачиваем плашку при открытии клавиатуры
           }}
           onBlur={() => {
             isInputFocusedRef.current = false;
           }}
           placeholder="Сообщение..."
           rows={1}
           className="custom-scroll max-h-[150px] w-full resize-none border-b-3 border-primary bg-transparent pt-1 pb-2 text-lg font-medium text-text transition-colors outline-none placeholder:text-text/30"
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

  // Рендер в портал на мобилках
  if (mounted && isMobile) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: '100%' }} // Выезжает справа налево как в Telegram
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
  return <div className="relative z-10 h-full w-full">{ChatContent}</div>;
}
