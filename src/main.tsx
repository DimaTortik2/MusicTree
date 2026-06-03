import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MDXProvider components={mdxComponents}>
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
    </MDXProvider>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
