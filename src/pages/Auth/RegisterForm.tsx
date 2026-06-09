import React, { useState, useEffect } from 'react';
import { GithubLogo, GoogleLogo, EnvelopeOpen } from '@phosphor-icons/react'; // Добавили EnvelopeOpen
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
import { Input } from '@/shared/Input';
import { toast } from '@/app/utils/toast';
import { cn } from '@/app/utils/cn';

// Твой обновленный и чистый маппинг ошибок
const getFriendlyErrorMessage = (message: string): string => {
  const msg = message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Неверная почта или пароль';
  }
  if (msg.includes('user already registered') || msg.includes('user already exists')) {
    return 'Этот аккаунт уже существует';
  }
  if (msg.includes('email format is invalid') || msg.includes('invalid email')) {
    return 'Некорректный формат почты';
  }
  if (msg.includes('password should be at least 6 characters')) {
    return 'Пароль должен быть >= 6 символов.';
  }
  if (msg.includes('rate limit exceeded') || msg.includes('too many requests')) {
    return 'Слишком много попыток. Пожалуйста, подождите пару минут.';
  }
  if (msg.includes('email not confirmed') || msg.includes('confirmation required')) {
    return 'Пожалуйста, подтвердите вашу почту по ссылке из письма.';
  }
  if (msg.includes('network error') || msg.includes('failed to fetch')) {
    return 'Проблема с сетью. Проверьте интернет-соединение.';
  }

  return 'Что-то пошло не так. Пожалуйста, попробуйте позже.';
};

export const RegisterForm = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Новые стейты для логичного флоу подтверждения почты
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Обратный отсчет для кнопки повторной отправки письма
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Валидация
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;
  const isFormValid = isEmailValid && isPasswordValid;

  const isSubmitDisabled = !isFormValid || isLoading;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
      } else {
        toast.success('Рады видеть вас снова!', { position: 'bottom-right' });
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
      } else {
        // Если Supabase возвращает user, но нет активной сессии — значит, включена проверка почты (Email Confirmation)
        if (data.user && !data.session) {
          setIsEmailSent(true);
          toast.success('Письмо отправлено!', { position: 'bottom-right' });
        } else {
          toast.success('Успешный вход!', { position: 'bottom-right' });
        }
      }
    }

    setIsLoading(false);
  };

  // Повторная отправка ссылки для подтверждения
  const handleResendEmail = async () => {
    if (cooldown > 0) return;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
    } else {
      toast.success('Письмо отправлено повторно!', { position: 'bottom-right' });
      setCooldown(60); // Кулдаун на 60 секунд
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const redirectUrl = `${window.location.origin}/app/tree`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
    }
  };

  // 🌲 ЭКРАН 3: Если письмо отправлено, показываем эту красивую и понятную заглушку
  if (isEmailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
      >
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <EnvelopeOpen size={32} />
        </div>

        <h2 className="mb-3 text-xl font-medium text-text sm:text-2xl">Подтвердите ваш аккаунт</h2>

        <p className="mb-8 max-w-sm text-sm leading-relaxed text-text/60 sm:text-base">
          Мы отправили ссылку для активации на почту{' '}
          <span className="font-semibold text-text">{email}</span>. Пожалуйста, перейдите по ней,
          чтобы войти в систему.
        </p>

        <div className="w-full space-y-4">
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="md"
            className="w-full"
            onClick={() => {
              setIsEmailSent(false);
              setIsLogin(true); // Сразу переключаем в режим «Войти», чтобы пользователь мог залогиниться
            }}
          >
            Вернуться ко входу
          </Button>

          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleResendEmail}
            className={cn(
              'mx-auto block cursor-pointer text-sm font-medium transition-colors outline-none',
              cooldown > 0 ? 'cursor-not-allowed text-text/30' : 'text-primary hover:text-accent',
            )}
          >
            {cooldown > 0
              ? `Отправить еще раз через ${cooldown}с`
              : 'Не пришло письмо? Отправить еще раз'}
          </button>
        </div>
      </motion.div>
    );
  }

  // СТАНДАРТНЫЙ ФЛОУ: Вход и Регистрация
  return (
    <div className="flex h-full w-full flex-col items-center">
      {/* Переключатель вкладок */}
      <div className="relative mb-12 flex w-fit rounded-2xl bg-background p-1.5">
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className={cn(
            'relative z-10 cursor-pointer rounded-xl px-6 py-2 text-sm font-medium transition-colors duration-200 outline-none',
            !isLogin ? 'text-white' : 'text-text/60 hover:text-text',
          )}
        >
          {!isLogin && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-md"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          Регистрация
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className={cn(
            'relative z-10 cursor-pointer rounded-xl px-6 py-2 text-sm font-medium transition-colors duration-200 outline-none',
            isLogin ? 'text-white' : 'text-text/60 hover:text-text',
          )}
        >
          {isLogin && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 -z-10 rounded-xl bg-primary shadow-md"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          Войти
        </button>
      </div>

      <form onSubmit={handleEmailAuth} className="flex w-full flex-1 flex-col">
        <div className="space-y-10">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Почта..."
          />

          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль..."
          />
        </div>

        {/* Разделитель */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-line"></div>
          <span className="text-sm text-text/40">или</span>
          <div className="h-px flex-1 bg-line"></div>
        </div>

        {/* OAuth Кнопки */}
        <div className="space-y-4">
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="md"
            className="relative w-full justify-center border-none font-medium"
            onClick={() => handleOAuthLogin('google')}
          >
            <GoogleLogo className="absolute left-6 h-5 w-5" />
            Войти через Google
          </Button>
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="md"
            className="relative w-full justify-center border-none font-medium"
            onClick={() => handleOAuthLogin('github')}
          >
            <GithubLogo className="absolute left-6 h-5 w-5" />
            Войти через Github
          </Button>
        </div>

        {/* Кнопка сабмита */}
        <div className="mt-auto pt-12">
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className={cn(
              'w-full border-none transition-all duration-300',
              isSubmitDisabled
                ? 'pointer-events-none scale-100 cursor-not-allowed bg-[#7A224D]/30 text-text/30'
                : 'cursor-pointer bg-[#7A224D] text-white hover:scale-102 hover:bg-[#902A5B] active:scale-98',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  Загрузка...
                </motion.span>
              ) : (
                <motion.span
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                >
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </form>
    </div>
  );
};
