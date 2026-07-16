import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';

export function ProtectedRoute() {
  const isAuthenticated = authStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
