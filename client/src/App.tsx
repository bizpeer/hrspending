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
import { AdminApprovals } from './pages/AdminApprovals';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginModal } from './components/LoginModal';
import { useAuthStore } from './store/authStore';
import { LeaveApplication } from './pages/LeaveApplication';
import { LoadingSplash } from './components/LoadingSplash';

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
    return <LoadingSplash />;
  }

  return (
    <HashRouter>
      <LoginModal />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/*" element={
          <div className="flex h-screen bg-gray-50 overflow-hidden relative">
            <div className="md:hidden print:hidden flex items-center justify-between bg-gray-900 text-white p-4 fixed top-0 left-0 w-full z-50 shadow-md">
              <div className="text-xl font-bold text-indigo-400">HR Flow</div>
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1 hover:bg-gray-800 rounded-md transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            <div className={`print:hidden fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
              <Sidebar userRole={userData?.role || 'EMPLOYEE'} />
            </div>

            {isMobileMenuOpen && (
              <div className="fixed inset-0 bg-black/50 z-30 md:hidden print:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            )}
            
            <div className="flex-1 h-full overflow-y-auto mt-16 md:mt-0 pb-10 bg-gray-50 print:m-0 print:p-0">
              <Routes>
                <Route path="/" element={<AttendanceDashboard />} />
                <Route path="/dashboard" element={<AttendanceDashboard />} />
                
                <Route path="/leave" element={<ProtectedRoute><LeaveApplication /></ProtectedRoute>} />
                <Route path="/expense" element={<ProtectedRoute><ExpenseForm /></ProtectedRoute>} />
                <Route path="/board" element={<ProtectedRoute><NoticeBoard userRole={userData?.role || 'EMPLOYEE'} currentUserId={userData?.uid || ''} /></ProtectedRoute>} />

                <Route path="/admin/organization" element={<ProtectedRoute requireAdmin><OrganizationAdmin /></ProtectedRoute>} />
                <Route path="/admin/approvals" element={<ProtectedRoute requireAdmin><AdminApprovals /></ProtectedRoute>} />
                <Route path="/admin/finance-stats" element={<ProtectedRoute requireAdmin><ExpenseAdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
