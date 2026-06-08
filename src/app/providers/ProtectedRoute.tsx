import { useAuthStore } from '@/app/store/authStore';
import React from 'react';
import { Navigate } from 'react-router-dom';

// Защищает внутренности приложения от неавторизованных пользователей
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    // Показываем заглушку-загрузку, пока Supabase проверяет сессию
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    // Если юзер не вошел, отправляем на страницу авторизации
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Не дает авторизованным пользователям снова зайти на страницу регистрации/входа
export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialized } = useAuthStore();

  if (!initialized) return null;

  if (user) {
    // Если юзер уже вошел, отправляем его в приложение
    return <Navigate to="/app/tree" replace />;
  }

  return <>{children}</>;
};
