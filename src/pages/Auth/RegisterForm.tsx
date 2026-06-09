import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { GithubLogo, GoogleLogo, EnvelopeSimple, LockKey } from '@phosphor-icons/react';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
// Подключи твой компонент Button. Путь укажи свой, например:

export const RegisterForm = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error('Ошибка входа: ' + error.message);
      else toast.success('С возвращением!');
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error('Ошибка регистрации: ' + error.message);
      else toast.success('Успешная регистрация!');
    }

    setIsLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    const redirectUrl = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) toast.error(`Ошибка входа: ${error.message}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-text">
          {isLogin ? 'Вход в аккаунт' : 'Создать аккаунт'}
        </h2>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text/80">Email</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <EnvelopeSimple className="h-5 w-5 text-text/40" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-line bg-background p-2.5 pl-10 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="name@mail.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text/80">Пароль</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <LockKey className="h-5 w-5 text-text/40" />
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-line bg-background p-2.5 pl-10 text-sm text-text focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                placeholder="Минимум 6 символов"
              />
            </div>
          </div>

          {/* Используем твой кастомный Button */}
          <Button
            type="submit"
            variant="solid"
            color="primary"
            size="md"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-text/60">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-primary hover:underline"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>

        <div className="my-6 flex items-center">
          <div className="h-px flex-1 bg-line"></div>
          <span className="px-3 text-sm text-text/40">Или через</span>
          <div className="h-px flex-1 bg-line"></div>
        </div>

        <div className="space-y-3">
          {/* Используем твой Button в стиле outline с цветом text */}
          <Button
            type="button"
            variant="outline"
            color="text"
            size="sm"
            className="w-full gap-2 border border-line bg-surface"
            onClick={() => handleOAuthLogin('google')}
          >
            <GoogleLogo weight="bold" className="h-5 w-5" /> Google
          </Button>
          <Button
            type="button"
            variant="outline"
            color="text"
            size="sm"
            className="w-full gap-2 border border-line bg-surface"
            onClick={() => handleOAuthLogin('github')}
          >
            <GithubLogo weight="fill" className="h-5 w-5" /> GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};
