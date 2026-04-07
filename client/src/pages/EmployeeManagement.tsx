import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Building, Filter, Trash2, UserX, Key, 
  Clock, ChevronRight, Loader2, ShieldAlert,
  MapPin, Calendar, LogIn, LogOut
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  getDocs, orderBy, writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { format } from 'date-fns';
import { useAuthStore } from '../store/authStore';

interface Employee {
  uid: string;
  name: string;
  email: string;
  role: string;
  divisionId?: string;
  teamId?: string;
  status?: 'ACTIVE' | 'RESIGNED';
  joinDate?: string;
}

interface AttendanceRecord {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  location?: string;
}

export const EmployeeManagement: React.FC = () => {
  const { userData } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [selectedEmpRecords, setSelectedEmpRecords] = useState<{emp: Employee, records: AttendanceRecord[]} | null>(null);
  const [deleteConfirmEmp, setDeleteConfirmEmp] = useState<Employee | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 1. Fetch Organization Data
    const unsubDivs = onSnapshot(collection(db, 'divisions'), (snap) => {
      setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Subscribe to Employees
    const q = query(collection(db, 'UserProfile'), orderBy('name', 'asc'));
    const unsubEmployees = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Employee)));
      setLoading(false);
    });

    return () => { unsubDivs(); unsubTeams(); unsubEmployees(); };
  }, []);

  // Filtered List
  const filteredEmployees = employees.filter(emp => {
    const matchesDiv = selectedDivision === 'ALL' || emp.divisionId === selectedDivision;
    const matchesTeam = selectedTeam === 'ALL' || emp.teamId === selectedTeam;
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDiv && matchesTeam && matchesSearch;
  });

  const handleShowRecords = async (emp: Employee) => {
    setLoading(true);
    const q = query(
      collection(db, 'attendance'), 
      where('userId', '==', emp.uid),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    setSelectedEmpRecords({ emp, records });
    setLoading(false);
  };

  const handleTerminate = async (emp: Employee) => {
    if (!window.confirm(`[퇴사 처리] ${emp.name}님의 계정을 비활성화하시겠습니까? 기록은 유지되지만 로그인이 차단됩니다.`)) return;
    
    try {
      await updateDoc(doc(db, 'UserProfile', emp.uid), { status: 'RESIGNED' });
      alert('퇴사 처리가 완료되었습니다.');
    } catch (e) {
      alert('오류 발생: ' + (e as Error).message);
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteConfirmEmp || !adminPassword) return;
    setIsProcessing(true);
    
    try {
      // 0. Verify Admin Password (Re-auth)
      try {
        await signInWithEmailAndPassword(auth, userData?.email || '', adminPassword);
      } catch (err) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      const emp = deleteConfirmEmp;
      const batch = writeBatch(db);

      // 1. Delete Attendance
      const attSnap = await getDocs(query(collection(db, 'attendance'), where('userId', '==', emp.uid)));
      attSnap.forEach(d => batch.delete(d.ref));

      // 2. Delete Leaves
      const leaveSnap = await getDocs(query(collection(db, 'leaves'), where('userId', '==', emp.uid)));
      leaveSnap.forEach(d => batch.delete(d.ref));

      // 3. Delete Expenses
      const expSnap = await getDocs(query(collection(db, 'expenses'), where('userId', '==', emp.uid)));
      expSnap.forEach(d => batch.delete(d.ref));

      // 4. Delete Profile
      batch.delete(doc(db, 'UserProfile', emp.uid));

      await batch.commit();
      alert(`[삭제 완료] ${emp.name}님의 모든 정보가 삭제되었습니다.`);
      setDeleteConfirmEmp(null);
      setAdminPassword('');
    } catch (e) {
      alert('삭제 중 오류 발생: ' + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPasswordLink = async (emp: Employee) => {
    if (!window.confirm(`${emp.name}님에게 비밀번호 재설정 이메일을 발송하시겠습니까?`)) return;
    try {
      await sendPasswordResetEmail(auth, emp.email);
      alert('재설정 이메일이 발급되었습니다.');
    } catch (e) {
      alert('오류 발생: ' + (e as Error).message);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">전체 구성원 관리</h1>
            </div>
            <p className="text-slate-500 font-medium whitespace-pre-wrap">직원의 근태 조회, 퇴사 처리 및 보안 설정을 통합 관리합니다.</p>
          </div>

          <div className="flex items-center gap-4">
            {loading && (
              <div className="flex items-center gap-2 text-indigo-500 bg-indigo-50 px-4 py-2 rounded-xl animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-black uppercase tracking-tighter">Syncing...</span>
              </div>
            )}
            <div className="relative group w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-800"
            />
          </div>
        </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Building className="w-5 h-5" /></div>
            <select 
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setSelectedTeam('ALL'); }}
              className="flex-1 bg-transparent border-none outline-none font-black text-slate-700 text-sm appearance-none cursor-pointer"
            >
              <option value="ALL">전체 본부</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Filter className="w-5 h-5" /></div>
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={selectedDivision === 'ALL'}
              className="flex-1 bg-transparent border-none outline-none font-black text-slate-700 text-sm appearance-none cursor-pointer disabled:opacity-30"
            >
              <option value="ALL">본부 내 전체 팀</option>
              {teams.filter(t => t.divisionId === selectedDivision).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl flex items-center justify-between px-6">
             <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Members</span>
             <span className="text-2xl font-black">{filteredEmployees.length} 명</span>
          </div>
        </div>

        {/* List Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">직원 정보 / 소속</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">직책 / 입사일</th>
                  <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">계정 상태</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const div = divisions.find(d => d.id === emp.divisionId)?.name || '기타';
                  const team = teams.find(t => t.id === emp.teamId)?.name || '팀 없음';
                  const isResigned = emp.status === 'RESIGNED';

                  return (
                    <tr key={emp.uid} className={`group hover:bg-slate-50/80 transition-all ${isResigned ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleShowRecords(emp)}>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm group-hover:rotate-6 transition-all ${isResigned ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white'}`}>
                            {emp.name[0]}
                          </div>
                          <div>
                            <div className={`text-md font-black tracking-tight ${isResigned ? 'text-slate-400' : 'text-slate-800'}`}>{emp.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 whitespace-nowrap">{div}</span>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{team}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className={`text-sm font-black ${isResigned ? 'text-slate-300' : 'text-slate-700'}`}>{emp.role}</div>
                         <div className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                           <Calendar className="w-3 h-3" /> {emp.joinDate || '-'} 입사
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          {isResigned ? (
                            <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-full border border-rose-100">퇴사자</span>
                          ) : (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-black rounded-full border border-emerald-100">정상</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2 text-slate-300">
                          <button 
                            onClick={() => handleResetPasswordLink(emp)}
                            className="p-2.5 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all" 
                            title="비밀번호 재설정 이메일"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {!isResigned && (
                            <button 
                              onClick={() => handleTerminate(emp)}
                              className="p-2.5 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
                              title="퇴사 처리"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => setDeleteConfirmEmp(emp)}
                            className="p-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                            title="전체 기록 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 bg-slate-100 mx-2"></div>
                          <button 
                            onClick={() => handleShowRecords(emp)}
                            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-sm"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attendance Records Modal */}
      {selectedEmpRecords && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-slate-50 flex justify-between items-start">
              <div className="space-y-4">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest">Member Timeline Logs</div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedEmpRecords.emp.name}님의 근태 기록</h2>
              </div>
              <button onClick={() => setSelectedEmpRecords(null)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><ChevronRight className="w-6 h-6 rotate-90" /></button>
            </div>
            <div className="p-10 max-h-[60vh] overflow-y-auto premium-scrollbar">
              {selectedEmpRecords.records.length > 0 ? (
                <div className="space-y-4">
                  {selectedEmpRecords.records.map((r, idx) => (
                    <div key={r.id} className="relative pl-10">
                      {idx !== selectedEmpRecords.records.length - 1 && <div className="absolute left-[19px] top-10 bottom-[-16px] w-[2px] bg-slate-100"></div>}
                      <div className={`absolute left-0 top-1 w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${r.type === 'IN' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
                        {r.type === 'IN' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                      </div>
                      <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                         <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${r.type === 'IN' ? 'text-indigo-500' : 'text-rose-500'}`}>{r.type === 'IN' ? 'CHECK-IN' : 'CHECK-OUT'}</span>
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(r.timestamp), 'yyyy.MM.dd')}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <div className="text-xl font-black text-slate-800 tracking-tighter">{format(new Date(r.timestamp), 'HH:mm:ss')}</div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                               <MapPin className="w-3.5 h-3.5" /> {r.location || '본사'}
                            </div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4">
                  <Clock className="w-12 h-12 text-slate-200 mx-auto" />
                  <p className="text-slate-400 font-bold">근태 기록이 존재하지 않습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmEmp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden text-center p-12 space-y-8 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto shadow-inner">
                <ShieldAlert className="w-10 h-10" />
             </div>
             
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic">데이터 영구 삭제</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  <span className="text-rose-600 font-black">{deleteConfirmEmp.name}</span>님의 모든 데이터(출퇴근, 휴가, 지출결의)가 <span className="underline decoration-rose-200 decoration-w-2">영구적으로 삭제</span>되며 복구할 수 없습니다.
                </p>
             </div>

             <div className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    placeholder="관리자 비밀번호를 입력하세요"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all font-bold"
                  />
                </div>
                
                <div className="flex gap-3">
                   <button 
                    onClick={() => { setDeleteConfirmEmp(null); setAdminPassword(''); }}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all"
                   >
                     취소
                   </button>
                   <button 
                    onClick={handleDeleteAll}
                    disabled={!adminPassword || isProcessing}
                    className="flex-2 px-10 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                   >
                     {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                     데이터 삭제 승인
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};
