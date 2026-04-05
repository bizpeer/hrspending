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

  if (!user) {
    // 아예 로그인이 안 된 경우 (Auth 없음)
    setTimeout(() => setLoginModalOpen(true), 100);
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (!userData) {
    // 로그인은 되었으나 Firestore 프로필(userData)이 아직 없거나 로드되지 않음
    // 이 상태에서 관리자 전용 페이지를 요청하면 대시보드로 보냅니다.
    if (requireAdmin || requireMasterAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
    // 일반 보호 페이지면 일단 진입 허용 (컴포넌트 내 예외 처리 필요)
    return <>{children}</>;
  }

  if (requireMasterAdmin && userData.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && userData.role !== 'ADMIN' && userData.role !== 'SUB_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
