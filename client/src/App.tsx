import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { OrganizationAdmin } from './pages/OrganizationAdmin';
import { ExpenseAdminDashboard } from './pages/ExpenseAdminDashboard';
import { ExpenseForm } from './pages/ExpenseForm';
import { AttendanceDashboard } from './pages/AttendanceDashboard';
import { NoticeBoard } from './pages/NoticeBoard';

function App() {
  // 예시: 실제 구현시에는 Firebase Auth 등에서 유저 데이터를 가져와야 합니다.
  const mockUserRole = 'DIRECTOR'; 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    // 앱이 Root(/)에서 구동되도록 basename을 제거(또는 "/")합니다.
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        
        {/* 1. 모바일 햄버거 메뉴 (헤더 탑-바) : md 미만 화면에서만 노출 및 인쇄(Print)시 숨김 */}
        <div className="md:hidden print:hidden flex items-center justify-between bg-gray-900 text-white p-4 fixed top-0 left-0 w-full z-50 shadow-md">
          <div className="text-xl font-bold text-indigo-400">HR Flow</div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 hover:bg-gray-800 rounded-md transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* 2. 사이드바 메뉴 (반응형 오버레이/고정 분기) 및 인쇄시 숨김 */}
        <div className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
          <Sidebar userRole={mockUserRole} userId="uid1" />
        </div>

        {/* 3. 모바일에서 메뉴 활성화 시 뒤쪽 흐린 배경 오버레이 */}
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
            
            <Route path="/admin/organization" element={<OrganizationAdmin />} />
            <Route path="/admin/finance-stats" element={<ExpenseAdminDashboard />} />
            
            {/* 전사 공지/알림 게시판 라우팅 추가 */}
            <Route path="/board" element={<NoticeBoard userRole={mockUserRole} currentUserId="uid1" />} />
            
            {/* 기본 경로 접속 시 대시보드로 리다이렉트 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
