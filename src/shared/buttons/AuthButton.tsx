import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/authStore';
import { useProgressStore } from '@/app/store/useProgressStore';
import { Button } from '@/shared/buttons/Button';
import { Modal } from '@/shared/Modal';
import { User, WarningCircle } from '@phosphor-icons/react';
import { useBlobTransition } from '@/app/store/useBlobTransition';

export const AuthButton = () => {
  const { user, initialized } = useAuthStore();
  const navigate = useNavigate();
  const { startTransition } = useBlobTransition();
  const [showWarning, setShowWarning] = useState(false);

  // Проверяем, есть ли прогресс (пройденные уроки или записанное аудио)
  const hasLocalProgress = useProgressStore(
    (state) => state.passedLessons.length > 0 || state.audioRecordIds.length > 0,
  );

  if (!initialized || user) return null;

  const handleClick = () => {
    // Если есть прогресс — показываем предупреждение, иначе пускаем сразу
    if (hasLocalProgress) {
      setShowWarning(true);
    } else {
      startTransition(() => {
        navigate('/auth');
      });
    }
  };

  return (
    <>
      <div className="mb-10">
        <h2 className="mb-1 text-2xl font-normal text-text">Профиль</h2>
        <p className="mb-4 max-w-sm text-[14px] leading-tight text-text/40">
          Ваш прогресс сохранится на облаке, если войти/создать аккаунт
        </p>
        <Button
          variant="outline"
          size="sm"
          color="primary"
          onClick={handleClick}
          className="group gap-2 rounded-[14px] px-10"
        >
          <User
            size={18}
            weight='bold'
            className="text-primary transition-colors duration-200 group-hover:text-white"
          />
          <span>Войти</span>
        </Button>
      </div>

      <Modal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        layout="vertical"
        title={
          <div className="flex items-center gap-3">
            <WarningCircle size={28} className="text-primary" weight="fill" />
            Внимание
          </div>
        }
        description="У вас есть локальный прогресс. Если вы создадите новый аккаунт, прогресс сохранится. Однако, если вы войдете в уже существующий аккаунт, ваш локальный прогресс будет удален и заменен данными из облака."
        className="max-w-md !p-6"
        actions={
          <>
            <Button
              variant="outline"
              color="primary"
              onClick={() => setShowWarning(false)}
              className="w-full sm:flex-1"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              color="primary"
              onClick={() => navigate('/auth')}
              className="w-full sm:flex-1"
            >
              Продолжить
            </Button>
          </>
        }
      />
    </>
  );
};
