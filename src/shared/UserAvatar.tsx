import React from 'react';
import { Avatar } from '@/shared/Avatar';
import { useIsOnline } from '@/app/store/presenceStore';

// Теперь мы импортируем твой реальный стор!
import { useAuthStore } from '@/app/store/authStore';

type UserAvatarProps = React.ComponentProps<typeof Avatar> & {
  userId?: string | null;
};

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(
  ({ userId, isOnline: forceIsOnline, ...props }) => {
    // ДОСТАЕМ ТВОЙ РЕАЛЬНЫЙ ID
    const currentUserId = useAuthStore((s) => s.user?.id);

    // Проверяем, моя ли это аватарка
    const isMe = currentUserId && currentUserId === userId;

    // Если это моя аватарка, передаем null, чтобы не подписываться на стор
    const storeIsOnline = useIsOnline(isMe ? null : userId);

    // Итоговый статус:
    // 1. Если передали явно (например isOnline={false} в ViewToggle) -> берем его.
    // 2. Если это моя аватарка (и явно ничего не передали) -> false.
    // 3. Иначе -> берем из стора.
    const finalIsOnline =
      forceIsOnline !== undefined ? forceIsOnline : isMe ? false : storeIsOnline;

    return <Avatar {...props} isOnline={finalIsOnline} />;
  },
);

UserAvatar.displayName = 'UserAvatar';
