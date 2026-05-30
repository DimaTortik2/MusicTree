import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './app/routes/router';

import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastContainer } from 'react-toastify';

import './index.css';
import { ShortcutManager } from '@/shared/hooks/useShortcut';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <ShortcutManager />
    </ThemeProvider>
  </StrictMode>,
);
