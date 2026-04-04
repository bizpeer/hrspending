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
  const { user, userData, loading, setLoginModalOpen } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user || !userData) {
    // 팝업 로그인을 위해 홈으로 리다이렉트하고 모달을 켭니다.
    // useEffect를 사용하여 렌더링 후 모달을 열도록 처리할 수도 있지만, 
    // 여기서는 간단히 홈으로 보낸 후 사용자가 대시보드 클릭 시 모달이 뜨게 유도합니다.
    // 혹은 바로 모달을 열고 싶다면 아래처럼 처리 가능합니다.
    setTimeout(() => setLoginModalOpen(true), 100);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireMasterAdmin && userData.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && userData.role !== 'ADMIN' && userData.role !== 'SUB_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
