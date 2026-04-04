import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { OrganizationAdmin } from './pages/OrganizationAdmin';
import { ExpenseAdminDashboard } from './pages/ExpenseAdminDashboard';
import { ExpenseForm } from './pages/ExpenseForm';
import { AttendanceDashboard } from './pages/AttendanceDashboard';
import { NoticeBoard } from './pages/NoticeBoard';
import { Login } from './pages/Login';
import { AdminSettings } from './pages/AdminSettings';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

function App() {
  const { initAuth, userData, loading } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initAuth]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Application...</div>;
  }

  // 로그인되지 않은 라우트는 별도로 처리
  return (
    <HashRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<Login />} />
        
        {/* 보호된 라우트 래퍼 */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex h-screen bg-gray-50 overflow-hidden relative">
              
              {/* 1. 모바일 햄버거 메뉴 */}
              <div className="md:hidden print:hidden flex items-center justify-between bg-gray-900 text-white p-4 fixed top-0 left-0 w-full z-50 shadow-md">
                <div className="text-xl font-bold text-indigo-400">HR Flow</div>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-1 hover:bg-gray-800 rounded-md transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>

              {/* 2. 사이드바 메뉴 */}
              <div className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
                <Sidebar userRole={userData?.role || 'EMPLOYEE'} userId={userData?.uid || ''} />
              </div>

              {/* 3. 모바일에서 오버레이 */}
              {isMobileMenuOpen && (
                <div 
                  className="fixed inset-0 bg-black/50 z-30 md:hidden print:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}
              
              {/* 4. 메인 콘텐츠 영역 하위 라우팅 */}
              <div className="flex-1 h-full overflow-y-auto mt-16 md:mt-0 pb-10 bg-gray-50 print:m-0 print:p-0">
                <Routes>
                  <Route path="/dashboard" element={<AttendanceDashboard />} />
                  <Route path="/leave" element={<div className="p-8">내 휴가 및 근태 신청 폼 (개발 중)</div>} />
                  <Route path="/expense" element={<ExpenseForm />} />
                  
                  {/* 관리자 및 서브관리자만 접근 가능 */}
                  <Route path="/admin/organization" element={
                    <ProtectedRoute requireAdmin>
                      <OrganizationAdmin />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/finance-stats" element={
                    <ProtectedRoute requireAdmin>
                      <ExpenseAdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute requireAdmin>
                      <AdminSettings />
                    </ProtectedRoute>
                  } />
                  
                  {/* 전사 공지/알림 게시판 */}
                  <Route path="/board" element={<NoticeBoard userRole={userData?.role || 'EMPLOYEE'} currentUserId={userData?.uid || ''} />} />
                  
                  {/* 기본 경로 접속 시 대시보드로 리다이렉트 */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
