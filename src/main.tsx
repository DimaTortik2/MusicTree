import { StrictMode, useEffect } from 'react'; // Добавили useEffect
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router'; // или react-router-dom, в зависимости от твоей версии
import { router } from './app/routes/router';

import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastContainer } from 'react-toastify';

import './index.css';
import { ShortcutManager } from '@/shared/hooks/useShortcut';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Metronome } from '@/components/Metronome';
import { MDXProvider } from '@mdx-js/react';
import { CustomAudioPlayer } from '@/shared/CustomAudioPlayer';
import { BuildGamma } from '@/components/BuildGamma';
import { ChordTrainer } from '@/components/ChordTrainer';
import { DurationMatcher } from '@/components/DurationMatcher';
import { IntervalComparisonTrainer } from '@/components/IntervalComparisonTrainer';
import { IntervalTrainer } from '@/components/IntervalTrainer';
import { MusicCleaning } from '@/components/MusicCleaning';
import { MusicStaff } from '@/components/MusicStaff';
import { PhrasingTrainer } from '@/components/PhrasingTrainer';
import { TransferRule } from '@/components/TransferRule';
import { MdxImage } from '@/shared/MdxImage';
import { useAuthStore } from '@/app/store/authStore';
import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { useDeviceTracker } from '@/app/hooks/useDeviceTracker';
import { CookieBanner } from '@/shared/CookieBanner';
import { BlobTransitionOverlay } from '@/shared/BlobTransitionOverlay';

const mdxComponents = {
  Metronome,
  BuildGamma,
  ChordTrainer,
  DurationMatcher,
  IntervalComparisonTrainer,
  IntervalTrainer,
  MusicCleaning,
  MusicStaff,
  PhrasingTrainer,
  TransferRule,
  Audio: CustomAudioPlayer,
  Img: MdxImage,
};

// Создаем компонент App, чтобы внутри него работал useEffect
const App = () => {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useCloudSync();
  useDeviceTracker();

  useEffect(() => {
    // Инициализируем сессию Supabase и запускаем слушатель событий
    const unsubscribe = initializeAuth();

    // Отписываемся при размонтировании компонента (полезно при HMR в Vite)
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [initializeAuth]);

  return (
    <MDXProvider components={mdxComponents}>
      <ThemeProvider>
        <RouterProvider router={router} />
        <BlobTransitionOverlay />
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
        <CookieBanner />
        <ShortcutManager />
      </ThemeProvider>
    </MDXProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
