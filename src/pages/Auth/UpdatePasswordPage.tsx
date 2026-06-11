import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockKey } from '@phosphor-icons/react';
import { supabase } from '@/shared/lib/supabase';
import { Button } from '@/shared/buttons/Button';
import { Input } from '@/shared/Input';
import { toast } from '@/app/utils/toast';

export const UpdatePasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Опционально: слушаем, подхватил ли Supabase сессию из ссылки
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, _) => {
      // Если по какой-то причине сессии нет и это не процесс восстановления — редирект
      if (event === 'SIGNED_OUT') {
        toast.error('Ссылка устарела или недействительна. Попробуйте еще раз.');
        navigate('/auth');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return;

    setIsLoading(true);

    // Supabase сам знает, кому менять пароль, благодаря токену в URL из письма
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast.error('Произошла ошибка: ' + error.message, { position: 'bottom-right' });
    } else {
      toast.success('Пароль успешно изменен!', { position: 'bottom-right' });
      // После смены пароля перекидываем в приложение
      navigate('/app/tree');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-text">
            <LockKey className="size-8" />
          </div>
          <h1 className="text-2xl font-medium text-text">Новый пароль</h1>
          <p className="mt-2 text-sm text-text/60">
            Пожалуйста, придумайте новый надежный пароль для вашего аккаунта
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-6">
          <Input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите новый пароль..."
          />

          <Button
            type="submit"
            disabled={password.length < 6 || isLoading}
            variant="solid"
            color="primary"
            size="md"
            className="w-full border-none"
          >
            {isLoading ? 'Сохранение...' : 'Обновить пароль'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
