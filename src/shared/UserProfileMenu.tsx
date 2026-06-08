import { useAuthStore } from '@/app/store/authStore';
import { SignOut } from '@phosphor-icons/react'; // иконка из твоих зависимостей

export const UserProfileMenu = () => {
  // Достаем юзера и функцию выхода из стора
  const { user, signOut } = useAuthStore();

  // Если юзера нет, ничего не рендерим (или можно отрендерить кнопку "Войти")
  if (!user) return null;

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex flex-col">
        {/* Показываем email или имя из Google/GitHub */}
        <span className="text-sm font-medium text-text">
          {user.user_metadata?.full_name || user.email}
        </span>
      </div>

      <button
        onClick={() => {
          signOut();
          // После выхода Zustand сам обновит состояние,
          // и твой ProtectedRoute выкинет пользователя на страницу авторизации
        }}
        className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
      >
        <SignOut size={18} />
        Выйти
      </button>
    </div>
  );
};
