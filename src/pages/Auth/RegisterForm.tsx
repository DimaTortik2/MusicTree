import React, { useState, useEffect, useRef } from 'react';
import { GithubLogo, GoogleLogo, ArrowLeft } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
import { Input } from '@/shared/Input';
import { toast } from '@/app/utils/toast';
import { cn } from '@/app/utils/cn';
import { useNavigate } from 'react-router-dom';

const getFriendlyErrorMessage = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Неверная почта или пароль';
  if (msg.includes('user already registered') || msg.includes('user already exists'))
    return 'Этот аккаунт уже существует';
  if (msg.includes('email format is invalid') || msg.includes('invalid email'))
    return 'Некорректный формат почты';
  if (msg.includes('password should be at least 6 characters'))
    return 'Пароль должен быть >= 6 символов.';
  if (msg.includes('rate limit exceeded') || msg.includes('too many requests'))
    return 'Слишком много попыток. Пожалуйста, подождите пару минут.';
  if (msg.includes('email not confirmed') || msg.includes('confirmation required'))
    return 'Пожалуйста, подтвердите вашу почту по ссылке из письма.';
  if (msg.includes('network error') || msg.includes('failed to fetch'))
    return 'Ошибка сети. Возможно, запрос блокирует AdBlock, VPN или превышен лимит писем.';
  if (msg.includes('captcha') || msg.includes('bot detection'))
    return 'Пожалуйста, подтвердите, что вы человек (капча не пройдена).';
  if (msg.includes('user not found')) return 'Пользователь с такой почтой не найден.';
  return 'Что-то пошло не так. Пожалуйста, попробуйте позже.';
};

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // НОВОЕ СОСТОЯНИЕ
  const [isLoading, setIsLoading] = useState(false);

  // Капча
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Письмо и таймер
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isResetEmailSent, setIsResetEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Сбрасываем состояния при переключении табов
  useEffect(() => {
    setCaptchaToken(null);
    setIsForgotPassword(false);
    setIsResetEmailSent(false);
    setFullName(''); // Очищаем имя при переключении
  }, [isLogin]);

  useEffect(() => {
    setCaptchaToken(null);
  }, [isForgotPassword]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // Поправил регулярку (\.)
  const isPasswordValid = password.length >= 6;
  const isNameValid = fullName.trim().length >= 2;

  // Валидация зависит от того, логин это или регистрация
  const isFormValid = isLogin
    ? isEmailValid && isPasswordValid
    : isEmailValid && isPasswordValid && isNameValid;

  const isSubmitDisabled = !isFormValid || isLoading || !captchaToken;
  const isForgotSubmitDisabled = !isEmailValid || isLoading || !captchaToken;

  const renderCaptcha = () => (
    <div className="mt-6 flex min-h-[65px] w-full flex-col items-center justify-center gap-2">
      <Turnstile
        ref={turnstileRef}
        siteKey="0x4AAAAAADhan7iwbBXBvP5v"
        options={{ language: 'ru', theme: 'auto' }}
        onSuccess={(token) => setCaptchaToken(token)}
        onExpire={() => {
          setCaptchaToken(null);
          toast.error('Время капчи истекло', { position: 'bottom-right' });
          turnstileRef.current?.reset();
        }}
        onError={() => {
          setCaptchaToken(null);
          toast.error('Ошибка капчи. Отключите VPN/AdBlock.', { position: 'bottom-right' });
        }}
      />
    </div>
  );

  const executeAction = async (
    e: React.FormEvent | React.MouseEvent,
    action: 'email' | 'google' | 'github',
  ) => {
    e.preventDefault();
    if (isSubmitDisabled && action === 'email') return;

    setIsLoading(true);

    if (action === 'email') {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captchaToken || undefined },
        });

        if (error) {
          toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
          setCaptchaToken(null);
          turnstileRef.current?.reset();
        } else {
          toast.success('Рады видеть вас снова!', { position: 'bottom-right' });
        }
      } else {
        // РЕГИСТРАЦИЯ: Передаем ИМЯ в метаданные
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() }, // <-- ПЕРЕДАЕМ СЮДА
            captchaToken: captchaToken || undefined,
          },
        });

        if (error) {
          toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
          setCaptchaToken(null);
          turnstileRef.current?.reset();
        } else if (data.user && !data.session) {
          setIsEmailSent(true);
          toast.success('Письмо отправлено!', { position: 'bottom-right' });
        } else {
          toast.success('Успешный вход!', { position: 'bottom-right' });
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: action,
        options: { redirectTo: `${window.location.origin}/app/tree` },
      });
      if (error) toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
    }

    setIsLoading(false);
  };

  // ... (handleResetPassword и handleResendEmail остаются без изменений) ...
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotSubmitDisabled) return;

    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
      captchaToken: captchaToken || undefined,
    });

    if (error) {
      toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } else {
      setIsResetEmailSent(true);
      toast.success('Письмо для сброса пароля отправлено!', { position: 'bottom-right' });
    }

    setIsLoading(false);
  };

  const handleResendEmail = async () => {
    if (cooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (error) {
      toast.error(getFriendlyErrorMessage(error.message), { position: 'bottom-right' });
    } else {
      toast.success('Письмо отправлено повторно!', { position: 'bottom-right' });
      setCooldown(60);
    }
  };

  if (isEmailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
      >
        {/* Оставил без изменений, чтобы не раздувать ответ */}
        <h2 className="mb-2 text-xl font-medium text-text">Подтвердите ваш аккаунт</h2>
        <p className="mb-8 text-sm text-text/60">
          Мы отправили ссылку для активации на почту{' '}
          <span className="font-semibold text-text">{email}</span>.
        </p>
        <Button
          type="button"
          variant="solid"
          color="primary"
          size="md"
          className="mb-6 w-full"
          onClick={() => {
            setIsEmailSent(false);
            setIsLogin(true);
          }}
        >
          Вернуться ко входу
        </Button>
        <button
          type="button"
          onClick={handleResendEmail}
          disabled={cooldown > 0}
          className={cn(
            'mx-auto block cursor-pointer text-sm font-medium transition-colors outline-none',
            cooldown > 0 ? 'cursor-not-allowed text-text/30' : 'text-primary hover:text-accent',
          )}
        >
          {cooldown > 0
            ? `Отправить еще раз через ${cooldown}с`
            : 'Не пришло письмо? Отправить еще раз'}
        </button>
      </motion.div>
    );
  }

  if (isResetEmailSent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-full w-full flex-col items-center justify-center p-4 text-center"
      >
        {/* Оставил без изменений */}
        <h2 className="mb-2 text-xl font-medium text-text">Письмо отправлено</h2>
        <p className="mb-8 text-sm text-text/60">
          Мы отправили ссылку для восстановления пароля на почту{' '}
          <span className="font-semibold text-text">{email}</span>.
        </p>
        <Button
          type="button"
          variant="solid"
          color="primary"
          size="md"
          className="w-full"
          onClick={() => {
            setIsResetEmailSent(false);
            setIsForgotPassword(false);
            setIsLogin(true);
          }}
        >
          Вернуться ко входу
        </Button>
      </motion.div>
    );
  }

  if (isForgotPassword) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="relative flex h-full w-full flex-col pt-12 sm:pt-8"
      >
        <button
          type="button"
          onClick={() => setIsForgotPassword(false)}
          className="absolute top-0 left-0 flex cursor-pointer items-center gap-2 text-sm font-medium text-text/50 transition-colors outline-none hover:text-text active:scale-95 sm:-top-4 sm:-left-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-medium text-text">Восстановление пароля</h2>
          <p className="text-sm text-text/60">
            Введите почту, указанную при регистрации, и мы отправим ссылку для сброса пароля.
          </p>
        </div>
        <form onSubmit={handleResetPassword} className="flex w-full flex-1 flex-col">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ваша почта..."
          />
          {renderCaptcha()}
          <Button
            type="submit"
            disabled={isForgotSubmitDisabled}
            className={cn(
              'mt-auto w-full border-none transition-all duration-300 sm:mt-8',
              isForgotSubmitDisabled
                ? 'pointer-events-none scale-100 cursor-not-allowed bg-[#7A224D]/30 text-text/30'
                : 'cursor-pointer bg-primary text-white hover:scale-102 hover:bg-[#902A5B] active:scale-98',
            )}
          >
            {isLoading ? 'Отправка...' : 'Отправить ссылку'}
          </Button>
        </form>
      </motion.div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col pt-8 sm:pt-0">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="absolute top-0 left-0 flex cursor-pointer items-center gap-2 text-sm font-medium text-text/50 transition-colors outline-none hover:text-text active:scale-95 sm:-top-8 sm:-left-8"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="relative mt-4 mb-12 flex w-fit rounded-2xl bg-surface p-1.5 sm:mt-0">
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

      <form onSubmit={(e) => executeAction(e, 'email')} className="flex w-full flex-1 flex-col">
        <div className="space-y-6 sm:space-y-8">
          {/* НОВОЕ ПОЛЕ: Отображается только при регистрации */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Отображаемое имя..."
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Почта..."
          />
          <div>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль..."
            />
            {isLogin && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="cursor-pointer text-sm font-medium text-primary transition-colors outline-none hover:text-primary/70"
                >
                  Забыли пароль?
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="my-8 flex items-center gap-4 sm:my-10">
          <div className="h-px flex-1 bg-line"></div>
          <span className="text-sm text-text/40">или</span>
          <div className="h-px flex-1 bg-line"></div>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="md"
            className="relative w-full justify-center border-none font-medium"
            onClick={(e) => executeAction(e, 'google')}
          >
            <GoogleLogo className="absolute left-6 h-5 w-5" /> Войти через Google
          </Button>
          <Button
            type="button"
            variant="solid"
            color="primary"
            size="md"
            className="relative w-full justify-center border-none font-medium"
            onClick={(e) => executeAction(e, 'github')}
          >
            <GithubLogo className="absolute left-6 h-5 w-5" /> Войти через Github
          </Button>
        </div>

        {renderCaptcha()}

        <div className="mt-auto pt-8 sm:pt-10">
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className={cn(
              'w-full border-none transition-all duration-300',
              isSubmitDisabled
                ? 'pointer-events-none scale-100 cursor-not-allowed bg-[#7A224D]/30 text-text/30'
                : 'cursor-pointer bg-primary text-white hover:scale-102 hover:bg-[#902A5B] active:scale-98',
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
