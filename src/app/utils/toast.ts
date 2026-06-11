import { toast as rtToast, type ToastOptions, type ToastPosition } from 'react-toastify';
import { Check, X, HourglassHigh, Trash } from '@phosphor-icons/react';
import React from 'react';

const getResponsivePosition = (customPosition?: ToastPosition): ToastPosition => {
  if (customPosition) return customPosition;
  if (typeof window !== 'undefined' && window.innerWidth <= 767) {
    return 'bottom-right';
  }
  return 'bottom-right';
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
  success: (message: React.ReactNode, options?: ToastOptions) =>
    rtToast.success(message, {
      ...defaultOptions,
      position: getResponsivePosition(options?.position),
      ...options,
      icon: (() =>
        React.createElement(Check, {
          size: 24,
          className: 'text-access',
          weight: 'bold',
        } as any)) as any,
    }),

  error: (message: React.ReactNode, options?: ToastOptions) =>
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

  info: (message: React.ReactNode, options?: ToastOptions) =>
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

  // НОВЫЙ МЕТОД ДЛЯ SOFT-DELETE
  undo: (message: React.ReactNode, options?: ToastOptions) =>
    rtToast(message, {
      ...defaultOptions,
      hideProgressBar: false,
      position: getResponsivePosition(options?.position),
      ...options,
      icon: (() =>
        React.createElement(Trash, {
          size: 24,
          className: 'text-primary',
          weight: 'bold',
        } as any)) as any,
      // Делаем рамку нейтральной для темной/светлой темы
    }),

  dismiss: (id?: string | number) => rtToast.dismiss(id),
};
