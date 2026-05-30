import { createBrowserRouter, Navigate } from 'react-router-dom';

import { LandingPage } from '@/pages/LandingPage/LandingPage';
import { AppLayout } from '@/pages/layouts/AppLayout';
import { TreePage } from '@/pages/TreePage';
import { CurrentLecturePage } from '@/pages/CurrentLecturePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import { HomeworksPage } from '@/pages/HomeworksPage/HomeworksPage';
import { DebugPage } from '@/pages/debug/DebugPage';
import { ChainsPage } from '@/pages/chains/ChainsPage';
import { TestsPage } from '@/pages/tests/TestsPage';
import PitchDetectorPiano from '@/features/Pitcher/Pitcher';
import { NotFoundPage } from '@/pages/NotFoundPage';
import ShortcutsPage from '@/pages/ShortcutsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="tree" replace />,
      },
      {
        path: 'tree',
        element: <TreePage />,
      },
      {
        path: 'current/lecture',
        element: <CurrentLecturePage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'mic',
        element: <PitchDetectorPiano />,
      },
      {
        path: 'homeworks',
        element: <HomeworksPage />,
      },
      {
        path: 'homeworks/:homeworkId?',
        element: <HomeworksPage />,
      },
      {
        path: 'chains',
        element: <ChainsPage />,
      },
      {
        path: 'chains/:chainId?',
        element: <ChainsPage />,
      },
      {
        path: 'tests',
        element: <TestsPage />,
      },
      {
        path: 'tests/:testId?',
        element: <TestsPage />,
      },
      {
        path: 'debug',
        element: <DebugPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
      {
        path: 'shortcuts',
        element: <ShortcutsPage />,
      },
    ],
  },
]);
