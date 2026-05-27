import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import './index.css';
import { LandingPage } from '@/pages/LandingPage/LandingPage';
import { AppLayout } from '@/pages/layouts/AppLayout';
import { TreePage } from '@/pages/TreePage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { CurrentLecturePage } from '@/pages/CurrentLecturePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import { HomeworksPage } from '@/pages/HomeworksPage/HomeworksPage';

const router = createBrowserRouter([
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
        path: 'homeworks',
        element: <HomeworksPage />,
      },
      {
        path: 'homeworks/:homeworkId?',
        element: <HomeworksPage />,
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
