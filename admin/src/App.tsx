import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { LicensesPage } from '@/pages/LicensesPage';
import { NewLicensePage } from '@/pages/NewLicensePage';
import { LicenseDetailPage } from '@/pages/LicenseDetailPage';
import { PlansPage } from '@/pages/PlansPage';
import { TenantsPage } from '@/pages/TenantsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/licenses" replace />,
      },
      {
        path: 'licenses',
        element: <LicensesPage />,
      },
      {
        path: 'licenses/new',
        element: <NewLicensePage />,
      },
      {
        path: 'licenses/:id',
        element: <LicenseDetailPage />,
      },
      {
        path: 'plans',
        element: <PlansPage />,
      },
      {
        path: 'tenants',
        element: <TenantsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/licenses" replace />,
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
