import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // ADMIN 또는 SUB_ADMIN 만
  requireMasterAdmin?: boolean; // ADMIN 만
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireMasterAdmin = false
}) => {
  const { user, userData, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || !userData) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireMasterAdmin && userData.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && userData.role !== 'ADMIN' && userData.role !== 'SUB_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
