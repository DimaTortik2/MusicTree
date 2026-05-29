import { toast as rtToast, type ToastOptions } from 'react-toastify';
import { Check, X } from '@phosphor-icons/react';
import React from 'react';

const defaultOptions: ToastOptions = {
  position: 'top-right',
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
      ...options,
      // Оборачиваем в функцию и кастуем к any — TS больше не придерется
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
      ...options,
      // Аналогично для крестика
      icon: (() =>
        React.createElement(X, {
          size: 24,
          className: 'text-primary',
          weight: 'bold',
        } as any)) as any,
    }),
};
