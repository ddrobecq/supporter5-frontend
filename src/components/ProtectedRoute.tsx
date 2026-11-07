import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';
import { isJwtExpired } from '../lib/jwt';

export function ProtectedRoute() {
  const token = authStore((s) => s.token);
  const logout = authStore((s) => s.logout);
  const location = useLocation();
  const isExpired = token ? isJwtExpired(token) : false;

  useEffect(() => {
    if (isExpired) {
      logout();
    }
  }, [isExpired, logout]);

  if (!token || isExpired) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
