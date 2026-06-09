import { toast as rtToast, type ToastOptions, type ToastPosition } from 'react-toastify';
import { Check, X, HourglassHigh } from '@phosphor-icons/react';
import React from 'react';

// Функция динамически определяет позицию в зависимости от ширины экрана
const getResponsivePosition = (customPosition?: ToastPosition): ToastPosition => {
  // Если позиция передана вручную в объекте параметров, используем её
  if (customPosition) return customPosition;

  // Если ширина экрана <= 767px, показываем сверху, иначе — снизу
  if (typeof window !== 'undefined' && window.innerWidth <= 767) {
    return 'top-right'; // На телефоне дефолт сверху
  }
  return 'bottom-right'; // На ПК дефолт снизу
};

const defaultOptions: Omit<ToastOptions, 'position'> = {
  autoClose: 3500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  closeButton: false,
};

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    rtToast.success(message, {
      ...defaultOptions,
      // Вычисляем позицию динамически
      position: getResponsivePosition(options?.position),
      ...options,
      icon: (() =>
        React.createElement(Check, {
          size: 24,
          className: 'text-access',
          weight: 'bold',
        } as any)) as any,
    }),

  error: (message: string, options?: ToastOptions) =>
    rtToast.error(message, {
      ...defaultOptions,
      position: getResponsivePosition(options?.position),
      ...options,
      icon: (() =>
        React.createElement(X, {
          size: 24,
          className: 'text-primary',
          weight: 'bold',
        } as any)) as any,
    }),

  info: (message: string, options?: ToastOptions) =>
    rtToast.info(message, {
      ...defaultOptions,
      position: getResponsivePosition(options?.position),
      ...options,
      icon: (() =>
        React.createElement(HourglassHigh, {
          size: 24,
          className: 'text-access-glow',
          weight: 'bold',
        } as any)) as any,
    }),
  dismiss: (id?: string | number) => rtToast.dismiss(id),
};
