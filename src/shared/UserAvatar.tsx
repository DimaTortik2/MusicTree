// src/shared/UserAvatar.tsx (или там же, где Avatar)
import React from 'react';
import { Avatar } from '@/shared/Avatar'; // Путь к твоему Аватару
import { useIsOnline } from '@/app/store/presenceStore';

// Берем все пропсы обычного Аватара и добавляем userId
type UserAvatarProps = React.ComponentProps<typeof Avatar> & {
  userId?: string | null;
};

export const UserAvatar: React.FC<UserAvatarProps> = React.memo(
  ({ userId, isOnline: forceIsOnline, ...props }) => {
    // Хук сам сходит в Zustand.
    // Из-за селектора этот конкретный аватар перерисуется ТОЛЬКО если
    // статус изменится именно у этого userId!
    const storeIsOnline = useIsOnline(userId);

    // Если передали isOnline явно пропсом (мало ли) - используем его, иначе берем из стора
    const finalIsOnline = forceIsOnline !== undefined ? forceIsOnline : storeIsOnline;

    return <Avatar {...props} isOnline={finalIsOnline} />;
  },
);

UserAvatar.displayName = 'UserAvatar';
