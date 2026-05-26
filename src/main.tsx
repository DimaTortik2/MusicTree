import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import './index.css';
import { LandingPage } from '@/pages/LandingPage';
import { AppLayout } from '@/pages/layouts/AppLayout';
import { TreePage } from '@/pages/TreePage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />, // Обычная страница без сайдбара
  },
  {
    path: '/app',
    element: <AppLayout />, // Наш лэйаут с сайдбаром
    children: [
      {
        index: true,
        element: <Navigate to="tree" replace />, // Перенаправляем с /app на /app/dashboard
      },
      {
        path: 'tree',
        element: <TreePage />, // Будет внутри Outlet
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
