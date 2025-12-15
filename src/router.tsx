import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SiteDetailPage from './pages/SiteDetailPage';
import AlertsPage from './pages/AlertsPage';
import OrdersListPage from './pages/OrdersListPage';
import CreateOrderPage from './pages/CreateOrderPage';
import DeliveriesPage from './pages/DeliveriesPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import SettingsPage from './pages/SettingsPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import ContactPage from './pages/ContactPage';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import HomePage from './pages/HomePage';
import { Navigate } from 'react-router-dom';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <HomePage />,
      errorElement: <RouteErrorBoundary />,
    },
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/app',
      element: <App />,
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'sites/:siteId', element: <SiteDetailPage /> },
        { path: 'orders', element: <OrdersListPage /> },
        { path: 'orders/new', element: <CreateOrderPage /> },
        { path: 'deliveries', element: <DeliveriesPage /> },
        { path: 'issues', element: <IssuesPage /> },
        { path: 'issues/:ticketId', element: <IssueDetailPage /> },
        { path: 'alerts', element: <AlertsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'about', element: <Navigate to="/about" replace /> },
        { path: 'faq', element: <Navigate to="/faq" replace /> },
        { path: 'contact', element: <Navigate to="/contact" replace /> },
      ],
    },
    // Backward-compatible redirects
    { path: '/alerts', element: <Navigate to="/app/alerts" replace /> },
    { path: '/orders', element: <Navigate to="/app/orders" replace /> },
    { path: '/orders/new', element: <Navigate to="/app/orders/new" replace /> },
    { path: '/deliveries', element: <Navigate to="/app/deliveries" replace /> },
    { path: '/issues', element: <Navigate to="/app/issues" replace /> },
    { path: '/issues/:ticketId', element: <Navigate to="/app/issues" replace /> },
    { path: '/settings', element: <Navigate to="/app/settings" replace /> },
    { path: '/sites/:siteId', element: <Navigate to="/app/sites/:siteId" replace /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/faq', element: <FAQPage /> },
    { path: '/contact', element: <ContactPage /> },
  {
    path: '*',
    element: <RouteErrorBoundary />,
  },
],
{
  basename: '/FuelSensex/',
}
);
