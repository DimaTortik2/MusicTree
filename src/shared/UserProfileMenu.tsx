import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/app/store/authStore';
import { supabase } from '@/shared/lib/supabase';
import {
  SignOut,
  WarningCircle,
  PencilSimple,
  CameraPlus,
  ArrowCounterClockwise,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Trash,
  UploadSimple,
} from '@phosphor-icons/react';
import { Modal } from '@/shared/Modal';
import { Button } from '@/shared/buttons/Button';
import { Avatar } from '@/shared/Avatar';
import { toast } from '@/app/utils/toast';
import { cn } from '@/app/utils/cn';
import { Toggle } from '@/shared/Toggle';
import { useBlobTransition } from '@/app/store/useBlobTransition';

export const UserProfileMenu = () => {
  // ДОБАВИЛИ: profile и updateProfileState из стора
  const { user, profile, signOut, updateProfileState } = useAuthStore();
  const { startTransition } = useBlobTransition();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [newNickname, setNewNickname] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Права на загрузку теперь берем напрямую из profile (useEffect больше не нужен)
  const canUpload = !!profile?.can_upload_avatar;

  const [isDragActive, setIsDragActive] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clampOffset = (newX: number, newY: number, currentZoom: number) => {
    if (!imgRef.current || !containerRef.current) return { x: newX, y: newY };
    const img = imgRef.current;
    const container = containerRef.current;

    const scaledW = img.naturalWidth * baseScale * currentZoom;
    const scaledH = img.naturalHeight * baseScale * currentZoom;

    const maxOffsetX = Math.max(0, (scaledW - container.clientWidth) / 2);
    const maxOffsetY = Math.max(0, (scaledH - container.clientHeight) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, newX)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, newY)),
    };
  };

  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, zoom));
  }, [zoom, baseScale]);

  if (!user) return null;

  const userEmail = user.email || '';

  // Приоритет данных: сначала таблица profiles, если там пусто — дефолт из Google/GitHub
  const currentName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Пользователь';

  // Проверяем на undefined, чтобы отличить отсутствие данных от намеренно удаленной аватарки (null)
  const displayPhoto =
    profile?.avatar_url !== undefined ? profile.avatar_url : user.user_metadata?.avatar_url || null;
  const displayLqip =
    profile?.avatar_lqip !== undefined
      ? profile.avatar_lqip
      : user.user_metadata?.avatar_lqip || null;

  const identity = user.identities?.find(
    (id) => id.provider === 'google' || id.provider === 'github',
  );
  const providerName = identity?.provider === 'google' ? 'Google' : 'GitHub';

  let providerAvatar = identity?.identity_data?.avatar_url || identity?.identity_data?.picture;

  if (providerAvatar) {
    const lower = providerAvatar.toLowerCase();
    if (lower.includes('default-user') || lower.includes('ui-avatars')) {
      providerAvatar = null;
    }
  }

  const canRestoreProvider = !!providerAvatar && displayPhoto !== providerAvatar;
  const isConfirmed = confirmEmail.trim().toLowerCase() === userEmail.toLowerCase();

  const handleSignOut = async () => {
    if (isConfirmed) {
      // 1. Сначала скрываем модалку для визуальной чистоты
      setIsSignOutModalOpen(false);

      // 2. Запускаем волны. Как только они закроют экран,
      // выполнится signOut(), который сбросит стейт, и React Router
      // сам перекинет юзера на главную страницу прямо под волнами.
      startTransition(() => {
        signOut();
      });
    }
  };

  const handleUpdateProfile = async () => {
    const trimmedName = newNickname.trim();
    if (!trimmedName || trimmedName === currentName.trim()) return;

    setIsUpdating(true);

    // ИСПРАВЛЕНО: Сохраняем в таблицу profiles, а не в user_metadata
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmedName })
      .eq('id', user.id);

    if (error) {
      toast.error('Ошибка при обновлении профиля');
    } else {
      updateProfileState({ full_name: trimmedName }); // Мгновенный апдейт UI
      toast.success('Имя успешно изменено!');
      setIsEditModalOpen(false);
    }
    setIsUpdating(false);
  };

  const deleteOldStoragePhoto = async () => {
    if (
      displayPhoto &&
      displayPhoto.includes('supabase.co') &&
      displayPhoto.includes('/avatars/')
    ) {
      const oldFilePath = displayPhoto.split('/avatars/')[1];
      if (oldFilePath) {
        await supabase.storage.from('avatars').remove([oldFilePath]);
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!displayPhoto) return;

    // ИСПРАВЛЕНО: Меняем локально через новую функцию
    updateProfileState({ avatar_url: null, avatar_lqip: null });

    if (newNickname.trim() === currentName.trim()) setIsEditModalOpen(false);

    try {
      await deleteOldStoragePhoto();
      // ИСПРАВЛЕНО: Обновляем таблицу profiles
      await supabase
        .from('profiles')
        .update({ avatar_url: null, avatar_lqip: null })
        .eq('id', user.id);
      toast.success('Фото удалено');
    } catch (error) {
      toast.error('Не удалось убрать фото');
    }
  };

  const handleRestoreProviderPhoto = async () => {
    if (!providerAvatar) return;

    // ИСПРАВЛЕНО: Меняем локально
    updateProfileState({ avatar_url: providerAvatar, avatar_lqip: null });

    if (newNickname.trim() === currentName.trim()) setIsEditModalOpen(false);

    try {
      await deleteOldStoragePhoto();
      // ИСПРАВЛЕНО: Обновляем таблицу profiles
      await supabase
        .from('profiles')
        .update({ avatar_url: providerAvatar, avatar_lqip: null })
        .eq('id', user.id);
      toast.success(`Фотография ${providerName} восстановлена!`);
    } catch (error) {
      toast.error('Не удалось вернуть фото');
    }
  };

  const handleCropApply = async () => {
    const image = imgRef.current;
    const container = containerRef.current;
    if (!image || !container) return;

    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    const ratio = size / container.clientWidth;
    ctx.scale(ratio, ratio);
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    ctx.scale(baseScale, baseScale);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

    const lqipCanvas = document.createElement('canvas');
    lqipCanvas.width = 16;
    lqipCanvas.height = 16;
    const lqipCtx = lqipCanvas.getContext('2d');
    if (lqipCtx) {
      lqipCtx.drawImage(canvas, 0, 0, size, size, 0, 0, 16, 16);
    }
    const lqipBase64 = lqipCanvas.toDataURL('image/webp', 0.2);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          toast.error('Ошибка обработки фото');
          return;
        }

        const localUrl = URL.createObjectURL(blob);

        // ИСПРАВЛЕНО: Обновляем мгновенно через новую функцию стейта
        updateProfileState({ avatar_url: localUrl, avatar_lqip: lqipBase64 });

        setCropModalOpen(false);
        setImageSrc(null);

        if (newNickname.trim() === currentName.trim()) {
          setIsEditModalOpen(false);
        }

        try {
          const fileName = `${user.id}/${Date.now()}.webp`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, blob, { cacheControl: '3600', contentType: 'image/webp' });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          const newAvatarUrl = publicUrlData.publicUrl;

          await deleteOldStoragePhoto();

          // ИСПРАВЛЕНО: Сохраняем в таблицу profiles
          await supabase
            .from('profiles')
            .update({
              avatar_url: newAvatarUrl,
              avatar_lqip: lqipBase64,
            })
            .eq('id', user.id);
        } catch (error) {
          toast.error('Не удалось сохранить фото на сервере');
        }
      },
      'image/webp',
      0.9,
    );
  };

  const handleAvatarClick = () => {
    if (!canUpload) {
      toast.error('У нас пока нет средств на мощные сервера, чтобы обеспечить всех аватарками :(');
      return;
    }
    fileInputRef.current?.click();
  };

  const processFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите изображение.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 5 МБ.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    if (!canUpload) {
      toast.error('У нас пока нет средств на мощные сервера, чтобы обеспечить всех аватарками :(');
      return;
    }

    processFile(e.dataTransfer.files?.[0]);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (container) {
      const scale = Math.max(
        container.clientWidth / img.naturalWidth,
        container.clientHeight / img.naturalHeight,
      );
      setBaseScale(scale);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setOffset(clampOffset(newX, newY, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <div className="mb-8 flex w-full items-center gap-4 overflow-hidden">
        <Avatar
          src={displayPhoto}
          name={currentName}
          lqip={displayLqip}
          forceGradient={!!profile?.use_gradient}
          className="size-20 shrink-0 text-3xl font-medium shadow-sm sm:size-24"
        />
        {/* ДОБАВЛЕНО: flex-1 и min-w-0. 
            min-w-0 - это магия флексбоксов, которая позволяет дочерним элементам сжиматься, 
            даже если внутри них очень длинное слово без пробелов */}
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center">
          <div className="flex w-full items-center gap-3">
            <span className="truncate text-2xl font-medium text-text sm:text-3xl">
              {currentName}
            </span>

            <button
              onClick={() => {
                setNewNickname(currentName);
                setIsEditModalOpen(true);
              }}
              className="shrink-0 cursor-pointer text-text/60 transition-colors outline-none hover:text-text focus-visible:text-primary active:scale-95"
            >
              <PencilSimple size={24} weight="regular" />
            </button>
          </div>

          {/* === ВЫВОД ЮЗЕРНЕЙМА С КОПИРОВАНИЕМ === */}
          {profile?.username && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(`@${profile.username}`);
                toast.success('Юзернейм скопирован!');
              }}
              className="group mt-1 flex max-w-full cursor-pointer items-center text-base text-text/70 transition-colors outline-none hover:text-text sm:text-lg"
              title="Нажмите, чтобы скопировать"
            >
              <span className="truncate">@{profile.username}</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsSignOutModalOpen(true);
              setConfirmEmail('');
            }}
            className="group mt-3 flex shrink-0 cursor-pointer items-center gap-2 text-[15px] font-medium text-primary transition-all duration-200 outline-none active:scale-95"
          >
            <SignOut
              size={20}
              weight="regular"
              className="transition-transform group-hover:-translate-x-1"
            />
            <span>Выйти</span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen && !cropModalOpen}
        onClose={() => !isUpdating && setIsEditModalOpen(false)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-[24px] border-2 p-6 transition-all duration-300 ease-out',
              isDragActive ? 'border-accent bg-accent/5' : 'border-transparent',
            )}
          >
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUpdating}
            />

            <Avatar
              name={newNickname || currentName}
              src={displayPhoto}
              lqip={displayLqip}
              forceGradient={!!profile?.use_gradient}
              className="group size-32 cursor-pointer text-5xl transition-transform duration-300"
              style={{ transform: isDragActive ? 'scale(1.05)' : 'scale(1)' }}
              enableTypingEffect={true}
            >
              <div
                onClick={() => !isUpdating && handleAvatarClick()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <CameraPlus size={32} weight="regular" className="text-white" />
              </div>
            </Avatar>

            {isDragActive && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[24px] bg-background/50 backdrop-blur-lg">
                <div className="flex flex-col items-center gap-2 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  <UploadSimple size={48} className="animate-bounce" />
                  <span className="text-lg font-medium">Отпустите фото</span>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {displayPhoto && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={isUpdating}
                  className="group flex cursor-pointer items-center gap-1.5 text-sm font-medium text-text/50 transition-colors outline-none hover:text-primary active:scale-95 disabled:opacity-50"
                >
                  <Trash
                    size={18}
                    weight="bold"
                    className="transition-transform group-hover:scale-110"
                  />
                  Удалить
                </button>
              )}
              {canRestoreProvider && (
                <button
                  onClick={handleRestoreProviderPhoto}
                  disabled={isUpdating}
                  className="group flex cursor-pointer items-center gap-1.5 text-sm font-medium text-text/50 transition-colors outline-none hover:text-accent active:scale-95 disabled:opacity-50"
                >
                  <ArrowCounterClockwise
                    size={18}
                    weight="bold"
                    className="transition-transform group-hover:-rotate-45"
                  />
                  Вернуть {providerName}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-normal text-text">Введите новый никнейм</span>
            <input
              type="text"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              disabled={isUpdating}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateProfile();
              }}
              placeholder="Новый никнейм..."
              autoFocus
              className="w-full border-b-2 border-accent bg-transparent pb-2.5 text-2xl font-medium text-text transition-colors outline-none focus:border-accent disabled:opacity-50"
            />
          </div>

          {profile?.can_use_gradient && !displayPhoto && (
            <div className="mt-2 flex items-center justify-between rounded-[16px] border border-surface bg-background/50 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-base font-medium text-text">Анимированный градиент</span>
                <span className="text-sm text-text/50">Постоянное медленное переливание</span>
              </div>
              <Toggle
                checked={!!profile.use_gradient}
                onCheckedChange={async (newVal) => {
                  // Меняем локально мгновенно
                  updateProfileState({ use_gradient: newVal });
                  // Отправляем в бд
                  await supabase
                    .from('profiles')
                    .update({ use_gradient: newVal })
                    .eq('id', user.id);
                }}
              />
            </div>
          )}

          <div className="mt-4 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="accent"
              disabled={isUpdating}
              onClick={() => setIsEditModalOpen(false)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Закрыть
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="accent"
              disabled={
                isUpdating || !newNickname.trim() || newNickname.trim() === currentName.trim()
              }
              onClick={handleUpdateProfile}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              {isUpdating ? 'Сохранение...' : 'Применить'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={cropModalOpen}
        onClose={() => {}}
        layout="vertical"
        className="max-w-md rounded-[32px] bg-surface !p-6 shadow-2xl"
      >
        <div className="flex flex-col gap-6 text-center">
          <h3 className="text-xl font-medium text-text">Обрезка фото</h3>

          <div
            ref={containerRef}
            className="relative mx-auto aspect-square w-full max-w-[300px] cursor-move touch-none overflow-hidden rounded-3xl bg-background"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="crop preview"
                onLoad={handleImageLoad}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                style={{
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom * baseScale})`,
                  transformOrigin: 'center',
                }}
              />
            )}

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
            >
              <defs>
                <mask id="crop-mask">
                  <rect width="100" height="100" fill="white" />
                  <circle cx="50" cy="50" r="50" fill="black" />
                </mask>
              </defs>
              <rect
                width="100"
                height="100"
                fill="currentColor"
                className="text-surface/80"
                mask="url(#crop-mask)"
              />
              <circle
                cx="50"
                cy="50"
                r="50"
                fill="none"
                stroke="currentColor"
                className="text-accent/40"
                strokeWidth="0.5"
              />
            </svg>
          </div>

          <div className="flex items-center gap-3 px-2">
            <MagnifyingGlassMinus size={20} className="text-text/50" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-text/10 accent-accent"
            />
            <MagnifyingGlassPlus size={20} className="text-text/50" />
          </div>

          <div className="mt-2 flex w-full gap-3">
            <Button
              variant="outline"
              size="sm"
              color="accent"
              onClick={() => {
                setCropModalOpen(false);
                setImageSrc(null);
              }}
              className="flex-1 rounded-[16px] border-2 py-3 text-[15px] font-medium"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="accent"
              onClick={handleCropApply}
              className="flex-1 rounded-[16px] border-2 py-3 text-[15px] font-medium"
            >
              Готово
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        layout="vertical"
        className="max-w-lg rounded-[32px] bg-surface !p-8 shadow-2xl md:max-w-[540px]"
      >
        <div className="flex flex-col gap-6 text-left">
          <div className="flex items-center gap-3">
            <WarningCircle size={28} className="text-primary" weight="fill" />
            <span className="text-2xl font-medium text-text">Выход из аккаунта</span>
          </div>

          <span className="text-sm leading-relaxed font-normal text-text/60">
            Ваши данные надежно сохранены в облаке, однако{' '}
            <b>локальный кэш на этом устройстве будет полностью очищен</b>.
            <br />
            <br />
            Чтобы подтвердить выход, введите вашу почту:{' '}
            <span className="font-medium text-text">{userEmail}</span>
          </span>

          <div className="mt-2 w-full">
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed) handleSignOut();
              }}
              placeholder={userEmail}
              autoFocus
              className="w-full border-b-2 border-primary bg-transparent pb-2.5 text-lg font-medium text-text transition-colors outline-none focus:border-primary"
            />
          </div>

          <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3.5">
            <Button
              variant="outline"
              size="sm"
              color="primary"
              onClick={() => setIsSignOutModalOpen(false)}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Отмена
            </Button>
            <Button
              variant="solid"
              size="sm"
              color="primary"
              disabled={!isConfirmed}
              onClick={handleSignOut}
              className="w-full rounded-[16px] border-2 py-3 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[140px] md:min-w-[160px]"
            >
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
