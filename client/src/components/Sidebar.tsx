import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, CalendarClock, Network, Settings, FileText, CheckSquare, PieChart, BookOpen } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface SidebarProps {
  userRole: 'ADMIN' | 'SUB_ADMIN' | 'EMPLOYEE' | string;
  userId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, userId = 'uid1' }) => {
  const isHR = userRole === 'ADMIN' || userRole === 'SUB_ADMIN';
  const isFinance = userRole === 'ADMIN' || userRole === 'SUB_ADMIN';
  const isDirector = userRole === 'ADMIN';
  const isManagement = isHR || isFinance || isDirector;

  return (
    <div className="w-64 min-h-screen bg-gray-900 text-white flex flex-col p-4 shadow-xl">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="text-2xl font-bold text-indigo-400">HR Flow</div>
        {/* 우측 상단 알림 종(벨) 컴포넌트 탑재 */}
        <NotificationBell currentUserId={userId} />
      </div>
      
      <nav className="flex-1 space-y-2">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
        >
          <Home className="w-5 h-5" />
          <span>대시보드</span>
        </NavLink>
        
        <NavLink 
          to="/leave" 
          className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
        >
          <CalendarClock className="w-5 h-5" />
          <span>내 휴가 및 근태</span>
        </NavLink>

        {/* 지출결의 신청 탭 (전직원) */}
        <NavLink 
          to="/expense" 
          className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
        >
          <FileText className="w-5 h-5" />
          <span>지출결의 신청</span>
        </NavLink>

        {/* 게시판/공지사항 기능 (전직원 공통 조회 지원) */}
        <NavLink 
          to="/board" 
          className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-rose-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span>공지사항 게시판</span>
        </NavLink>

        {isManagement && (
          <div className="pt-6 pb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">관리자 메뉴</p>
          </div>
        )}

        {isManagement && (
          <NavLink 
            to="/admin/approvals" 
            className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>결재/승인 관리함</span>
          </NavLink>
        )}

        {isHR && (
          <NavLink 
            to="/admin/organization" 
            className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <Network className="w-5 h-5" />
            <span>조직관리</span>
          </NavLink>
        )}

        {/* 지출 및 통계 대시보드 (대표이사 등 열람 권한용) */}
        {isDirector && (
          <NavLink 
            to="/admin/finance-stats" 
            className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <PieChart className="w-5 h-5" />
            <span>지출결의 통합 조회</span>
          </NavLink>
        )}

        {/* 시스템 설정 (최고 관리자 전용) */}
        {isDirector && (
          <NavLink 
            to="/admin/settings" 
            className={({ isActive }) => `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
          >
            <Settings className="w-5 h-5" />
            <span>시스템 설정</span>
          </NavLink>
        )}
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <button className="flex w-full items-center space-x-3 px-3 py-2 text-gray-400 hover:text-white transition-colors">
          <Home className="w-5 h-5" />
          <span>홈으로</span>
        </button>
      </div>
    </div>
  );
};
