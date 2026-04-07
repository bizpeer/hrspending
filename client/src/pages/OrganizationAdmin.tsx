import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Users, UserPlus, ArrowRightLeft, 
  Trash2, Building, X, Search, MoreHorizontal, ChevronRight, Briefcase, Calendar, Mail, ShieldCheck, History,
  ChevronDown
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';

interface Division {
  id: string;
  name: string;
  headId: string;
}

interface Team {
  id: string;
  divisionId: string;
  name: string;
  leaderId: string;
}

interface Employee {
  uid: string;
  name: string;
  email: string;
  teamId?: string;
  role: string;
  teamHistory: any[];
  joinDate?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actionType: string;
  performedBy: string;
  targetId: string;
  targetName: string;
  details: string;
}

export const OrganizationAdmin: React.FC = () => {
  const { userData } = useAuthStore();
  const isMasterAdmin = userData?.role === 'ADMIN';

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 모달 제어용
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showDivisionModal, setShowDivisionModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // 입력 필드용
  const [newDivName, setNewDivName] = useState('');
  const [newTeamDivId, setNewTeamDivId] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newEmp, setNewEmp] = useState({ name: '', email: '', teamId: '', joinDate: new Date().toISOString().split('T')[0] });

  // 정보 수정용 (임명/이동)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Firestore 데이터 실시간 구독
  useEffect(() => {
    setLoading(true);

    const handleError = (error: any) => {
      console.error("Firestore Subscription Error:", error);
      setLoading(false);
    };

    const unsubDivs = onSnapshot(collection(db, 'divisions'), (snap) => {
      setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Division)));
      setLoading(false);
    }, handleError);

    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }, handleError);

    const unsubUsers = onSnapshot(collection(db, 'UserProfile'), (snap) => {
      setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Employee)));
      setLoading(false);
    }, handleError);

    const unsubLogs = onSnapshot(collection(db, 'AuditLogs'), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setAuditLogs(logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50));
    }, handleError);

    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      unsubDivs(); unsubTeams(); unsubUsers(); unsubLogs();
      clearTimeout(timeoutId);
    };
  }, []);

  const logAction = async (type: string, targetId: string, targetName: string, details: string) => {
    try {
      await addDoc(collection(db, 'AuditLogs'), {
        timestamp: new Date().toISOString(),
        actionType: type,
        performedBy: userData?.name || '시스템',
        targetId, targetName, details
      });
    } catch (err) {
      console.error("Log failed:", err);
    }
  };

  const filteredTeams = selectedDivision
    ? teams.filter((team) => team.divisionId === selectedDivision)
    : teams;

  const unassignedEmployees = employees.filter(emp => !emp.teamId || emp.teamId === '');

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'divisions'), { name: newDivName, headId: '' });
      await logAction('CREATE_DIVISION', docRef.id, newDivName, '새 본부 생성');
      setNewDivName(''); setShowDivisionModal(false);
    } catch (err) {
      alert("본부 생성 실패: " + (err as Error).message);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDivId) return;
    try {
      const docRef = await addDoc(collection(db, 'teams'), { divisionId: newTeamDivId, name: newTeamName, leaderId: '' });
      const divName = divisions.find(d => d.id === newTeamDivId)?.name || '알 수 없음';
      await logAction('CREATE_TEAM', docRef.id, newTeamName, `${divName} 소속 팀 생성`);
      setNewTeamName(''); setNewTeamDivId(''); setShowTeamModal(false);
    } catch (err) {
      alert("팀 생성 실패: " + (err as Error).message);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalEmail = newEmp.email.trim().toLowerCase();
      if (!finalEmail.includes('@')) finalEmail = `${finalEmail}@internal.com`;

      const tempId = `temp_${Date.now()}`;
      const selectedTeam = teams.find(t => t.id === newEmp.teamId);
      const divisionId = selectedTeam?.divisionId || '';

      await setDoc(doc(db, 'UserProfile', tempId), {
        name: newEmp.name,
        email: finalEmail,
        role: 'EMPLOYEE',
        teamId: newEmp.teamId || '',
        divisionId,
        teamHistory: [],
        joinDate: newEmp.joinDate,
        mustChangePassword: true,
        createdAt: new Date().toISOString()
      });
      
      await logAction('CREATE_EMPLOYEE', tempId, newEmp.name, `직원 등록 (${finalEmail}) / 임비 123456`);
      alert(`[안내] 신규 직원 데이터가 등록되었습니다.\n아이디: ${finalEmail.split('@')[0]}\n임시 비밀번호: 123456`);
      setShowEmployeeModal(false);
      setNewEmp({ name: '', email: '', teamId: '', joinDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      alert("직원 등록 실패: " + (err as Error).message);
    }
  };

  const handleDeleteEmployee = async (uid: string, name: string) => {
    if (!window.confirm(`'${name}' 직원을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'UserProfile', uid));
      await logAction('DELETE_EMPLOYEE', uid, name, '직원 삭제(영구)');
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  };

  const handleUpdateRole = async (emp: Employee, newTeamId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'UserProfile', emp.uid);
      const selectedTeam = teams.find(t => t.id === newTeamId);
      const divisionId = selectedTeam?.divisionId || '';
      const teamName = selectedTeam?.name || '미배정';
      
      const newHistory = [...(emp.teamHistory || []), {
        teamId: newTeamId, teamName, joinedAt: new Date().toISOString(), role: newRole
      }];

      await updateDoc(userRef, {
        teamId: newTeamId,
        divisionId,
        role: newRole,
        teamHistory: newHistory
      });
      
      await logAction('UPDATE_EMPLOYEE', emp.uid, emp.name, `${teamName} 로 이동 / 역할: ${newRole}`);
      alert(`${emp.name}님의 소속/역할이 ${newRole} 등급으로 변경되었습니다.`);
      setShowEditModal(false);
      setEditingEmployee(null);
    } catch (err) {
      alert("변경 실패: " + (err as Error).message);
    }
  };

  const handleAppointHead = async (divisionId: string, userId: string) => {
    try {
      await setDoc(doc(db, 'divisions', divisionId), { headId: userId }, { merge: true });
      const empName = employees.find(e => e.uid === userId)?.name || '미임명';
      const divName = divisions.find(d => d.id === divisionId)?.name || '';
      await logAction('APPOINT_HEAD', divisionId, divName, `본부장 임명: ${empName}`);
      alert("본부장이 임명되었습니다.");
    } catch (err) {
      alert("임명 실패: " + (err as Error).message);
    }
  };

  const handleAppointLeader = async (teamId: string, userId: string) => {
    try {
      await setDoc(doc(db, 'teams', teamId), { leaderId: userId }, { merge: true });
      const empName = employees.find(e => e.uid === userId)?.name || '미임명';
      const teamName = teams.find(t => t.id === teamId)?.name || '';
      await logAction('APPOINT_LEADER', teamId, teamName, `팀장 임명: ${empName}`);
      alert("팀장이 임명되었습니다.");
    } catch (err) {
      alert("임명 실패: " + (err as Error).message);
    }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    const hasTeams = teams.some(t => t.divisionId === id);
    if (hasTeams) {
      alert("소속된 팀이 있는 본부는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`'${name}' 본부를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'divisions', id));
      await logAction('DELETE_DIVISION', id, name, '본부 삭제');
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    const hasEmployees = employees.some(e => e.teamId === id);
    if (hasEmployees) {
      alert("이 팀에 소속된 직원이 있습니다.");
      return;
    }
    if (!window.confirm(`'${name}' 팀을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      await logAction('DELETE_TEAM', id, name, '팀 삭제');
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  };

  const getEmployeesInTeam = (teamId: string) => {
    return employees.filter(emp => emp.teamId === teamId);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black tracking-tight text-lg">조직 엔진 최적화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">전사 조직 관리 시스템</h1>
            </div>
            <p className="text-slate-500 font-medium">본부 및 팀의 구조를 설계하고 인사 정보를 통합 관리합니다.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden xl:block">
              <input 
                type="text" 
                placeholder="구성원 이름 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-11 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-bold text-slate-700 premium-shadow"
              />
              <Search className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <button 
              onClick={() => setShowEmployeeModal(true)}
              className="flex items-center gap-2.5 px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 shrink-0"
            >
              <UserPlus className="w-5 h-5" />
              <span>직원 등록</span>
            </button>
          </div>
        </div>

        {isMasterAdmin && (
          <div className="w-full bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                  <ShieldCheck className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl flex items-center gap-2 tracking-tight">시스템 마스터 제어판</h3>
                  <p className="text-slate-400 text-sm font-medium mt-1">부관리자 임명 및 시스템 전역 보안 설정을 관리할 수 있습니다.</p>
                </div>
              </div>
              <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl shadow-xl font-black transition-all hover:bg-indigo-50 hover:scale-105 active:scale-95 text-sm">
                관리자 설정 이동
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* 본부 리스트 (Divisions) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Building className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">본부 구성</h2>
                </div>
                <button 
                  onClick={() => setShowDivisionModal(true)}
                  className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-4 space-y-3">
                {divisions.map((div) => (
                  <div 
                    key={div.id}
                    onClick={() => setSelectedDivision(div.id)}
                    className={`group p-6 rounded-[2rem] transition-all duration-500 cursor-pointer border-2 ${
                      selectedDivision === div.id 
                        ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-100 -translate-y-1' 
                        : 'bg-white border-transparent hover:border-indigo-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                            selectedDivision === div.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <span className={`text-lg font-black tracking-tight ${selectedDivision === div.id ? 'text-white' : 'text-slate-700'}`}>
                            {div.name}
                          </span>
                        </div>
                        <Trash2 
                          className={`w-5 h-5 transition-all opacity-0 group-hover:opacity-100 ${
                            selectedDivision === div.id ? 'text-white/40 hover:text-white' : 'text-slate-200 hover:text-rose-500'
                          }`}
                          onClick={(e) => { e.stopPropagation(); handleDeleteDivision(div.id, div.name); }}
                        />
                      </div>
                      
                      <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        selectedDivision === div.id ? 'bg-white/10' : 'bg-slate-50'
                      }`}>
                         <ShieldCheck className={`w-4 h-4 ${selectedDivision === div.id ? 'text-white/60' : 'text-slate-400'}`} />
                         <span className={`text-xs font-bold ${selectedDivision === div.id ? 'text-white/60' : 'text-slate-400'}`}>본부장:</span>
                         <select 
                          className={`flex-1 text-xs font-black bg-transparent border-none focus:ring-0 p-0 cursor-pointer appearance-none ${
                            selectedDivision === div.id ? 'text-white' : 'text-indigo-600'
                          }`}
                          value={div.headId || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleAppointHead(div.id, e.target.value)}
                         >
                           <option value="" className="text-slate-900">미임명</option>
                           {employees.map(emp => (
                             <option key={emp.uid} value={emp.uid} className="text-slate-900">{emp.name}</option>
                           ))}
                         </select>
                         <ChevronRight className={`w-4 h-4 ${selectedDivision === div.id ? 'text-white/40' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  </div>
                ))}
                {divisions.length === 0 && (
                  <div className="py-12 text-center">
                    <Building className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold">등록된 본부가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 팀 및 구성원 (Teams & Members) */}
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[600px]">
              <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                    소속 팀 관리
                    <span className="text-xs font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 tracking-widest uppercase">
                      Teams
                    </span>
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mt-1">본부 산하의 직조와 리더를 임명합니다.</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedDivision && (
                    <button 
                      onClick={() => setSelectedDivision(null)}
                      className="px-4 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                      전체 팀 보기
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (selectedDivision) setNewTeamDivId(selectedDivision);
                      setShowTeamModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>팀 생성</span>
                  </button>
                </div>
              </div>

              <div className="p-8">
                {filteredTeams.length > 0 || unassignedEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 팀 미배정 사원 카드 추가 */}
                    {unassignedEmployees.length > 0 && !selectedDivision && (
                      <div className="group p-8 rounded-[2.5rem] border-2 border-amber-100 bg-amber-50/20 hover:bg-white hover:border-amber-300 hover:shadow-2xl transition-all duration-500">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-amber-100">
                                Unassigned
                              </span>
                            </div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">팀 미배정 구성원</h4>
                          </div>
                          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                            <Users className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                             <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">배정 대기 ({unassignedEmployees.length})</span>
                             </div>
                             <div className="flex flex-wrap gap-2">
                               {unassignedEmployees.map(emp => (
                                 <div 
                                   key={emp.uid} 
                                   className="group/tag flex items-center gap-3 bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm hover:border-amber-500 hover:scale-[1.05] transition-all cursor-pointer"
                                   onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }}
                                 >
                                   <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-black text-amber-600 group-hover/tag:bg-amber-100">
                                      {emp.name.charAt(0)}
                                   </div>
                                   <span className="text-xs font-black text-slate-700">{emp.name}</span>
                                   <X 
                                     className="w-3.5 h-3.5 text-slate-200 hover:text-rose-500 transition-colors" 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.uid, emp.name); }}
                                   />
                                 </div>
                               ))}
                             </div>
                          </div>
                          <p className="text-[10px] text-amber-600/60 font-medium italic pt-2">
                            * 직원을 클릭하여 팀을 배정하거나 역할을 수정할 수 있습니다.
                          </p>
                        </div>
                      </div>
                    )}

                    {filteredTeams.map((team) => (
                      <div key={team.id} className="group p-8 rounded-[2.5rem] border-2 border-slate-50 bg-slate-50/30 hover:bg-white hover:border-indigo-100 hover:shadow-2xl transition-all duration-500">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                                {divisions.find(d => d.id === team.divisionId)?.name}
                              </span>
                            </div>
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{team.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                             <button className="p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                               <MoreHorizontal className="w-5 h-5" />
                             </button>
                             <button 
                              onClick={() => handleDeleteTeam(team.id, team.name)}
                              className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 className="w-4.5 h-4.5" />
                             </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-emerald-200">
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <ShieldCheck className="w-4 h-4" />
                                 </div>
                                 <span className="text-xs font-black text-slate-500 tracking-tight">팀 리더</span>
                              </div>
                              <select 
                                className="text-xs font-black text-emerald-600 bg-transparent border-none focus:ring-0 p-0 text-right cursor-pointer"
                                value={team.leaderId || ''}
                                onChange={(e) => handleAppointLeader(team.id, e.target.value)}
                              >
                                <option value="">미지정</option>
                                {getEmployeesInTeam(team.id).map(emp => (
                                  <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                                ))}
                              </select>
                           </div>

                           <div className="space-y-2">
                              <div className="flex items-center justify-between px-1">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">구성원 ({getEmployeesInTeam(team.id).length})</span>
                                 <button 
                                    onClick={() => { setEditingEmployee(null); setShowEditModal(true); }}
                                    className="text-[10px] font-black text-indigo-500 hover:underline"
                                 >
                                    직원 추가
                                 </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {getEmployeesInTeam(team.id).map(emp => (
                                  <div 
                                    key={emp.uid} 
                                    className="group/tag flex items-center gap-3 bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm hover:border-indigo-500 hover:scale-[1.05] transition-all cursor-pointer"
                                    onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }}
                                  >
                                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/tag:bg-indigo-50 group-hover/tag:text-indigo-600">
                                       {emp.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-black text-slate-700">
                                      {emp.name}
                                      {team.leaderId === emp.uid && <span className="text-[9px] ml-1.5 text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-50 rounded-lg">LEAD</span>}
                                    </span>
                                    <X 
                                      className="w-3.5 h-3.5 text-slate-200 hover:text-rose-500 transition-colors" 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.uid, emp.name); }}
                                    />
                                  </div>
                                ))}
                                {getEmployeesInTeam(team.id).length === 0 && (
                                  <p className="text-[10px] text-slate-300 font-medium italic w-full py-2 text-center">아직 배정된 직원이 없습니다.</p>
                                )}
                              </div>
                           </div>
                           
                           <button 
                              onClick={() => { /* Logic to open history? */ }}
                              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 bg-slate-100/50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                           >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              인사 이동 및 전체 기록
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-inner relative">
                       <Building className="w-10 h-10 text-slate-200" />
                       <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-slate-100">
                          <PlusCircle className="w-6 h-6 text-indigo-400" />
                       </div>
                    </div>
                    <p className="text-slate-400 font-black tracking-tight text-lg">새로운 조직 구조를 설계해 보세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 감사 로그 (Audit Logs) */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">전사 조직 변경 이력</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase bg-slate-50 px-4 py-2 rounded-full">
              Live Feed
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">일시</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">수행자</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">변경 분류</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">대상 객체</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">상세 변경 내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                         <Calendar className="w-3.5 h-3.5" />
                         {new Date(log.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {log.performedBy.charAt(0)}
                         </div>
                         <span className="text-sm font-black text-slate-700">{log.performedBy}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                        log.actionType.includes('CREATE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        log.actionType.includes('DELETE') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-600">{log.targetName}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-xs font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">{log.details}</span>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-24">
                       <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                       <p className="text-slate-400 font-bold tracking-tight">표시할 변경 이력이 없습니다.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 모달 배경 필터 (Shared) */}
      {(showDivisionModal || showTeamModal || showEmployeeModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] transition-opacity duration-500" />
      )}

      {/* 본부 생성 모달 */}
      {showDivisionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 w-full max-w-lg border border-slate-100 transform transition-all animate-modal-pop">
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">신규 본부 설립</h2>
                <p className="text-slate-500 text-sm font-medium tracking-tight">새로운 조직 단위를 정의합니다.</p>
              </div>
              <button onClick={() => setShowDivisionModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDivision} className="space-y-8">
              <div className="space-y-3">
                <label className="block text-sm font-black text-slate-800 ml-1">본부 명칭</label>
                <input 
                  type="text" autoFocus required value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  placeholder="예: 글로벌 비즈니스 본부"
                  className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-lg shadow-inner" 
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowDivisionModal(false)} className="flex-1 px-8 py-5 text-slate-400 font-black bg-slate-100 rounded-[1.5rem] hover:bg-slate-200 transition-all">취소</button>
                <button type="submit" className="flex-[2] px-8 py-5 text-white font-black bg-indigo-600 rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all active:scale-95">본부 생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 팀 생성 모달 */}
      {showTeamModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 w-full max-w-lg border border-slate-100 animate-modal-pop">
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">신규 팀 구축</h2>
                <p className="text-slate-500 text-sm font-medium tracking-tight">실무를 담당할 새로운 유닛을 생성합니다.</p>
              </div>
              <button onClick={() => setShowTeamModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight">소속 본부 선택</label>
                  <select 
                    required value={newTeamDivId}
                    onChange={(e) => setNewTeamDivId(e.target.value)}
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-slate-700 shadow-inner appearance-none"
                  >
                    <option value="">-- 본부 선택 --</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight">팀 명칭</label>
                  <input 
                    type="text" required value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="예: 브랜드 커뮤니케이션 팀"
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-lg shadow-inner" 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 px-8 py-5 text-slate-400 font-black bg-slate-100 rounded-[1.5rem] hover:bg-slate-200 transition-all">취소</button>
                <button type="submit" className="flex-[2] px-8 py-5 text-white font-black bg-emerald-600 rounded-[1.5rem] hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition-all active:scale-95">팀 설립</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmployeeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 w-full max-w-xl border border-slate-100 animate-modal-pop">
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                   인사 DB 신규 등록
                </h2>
                <p className="text-slate-500 text-sm font-medium tracking-tight">새로운 가족을 아카이브에 안전하게 추가합니다.</p>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" /> 이름
                  </label>
                  <input type="text" required value={newEmp.name} onChange={(e) => setNewEmp({...newEmp, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner" />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" /> 입사 일자
                  </label>
                  <input type="date" required value={newEmp.joinDate} onChange={(e) => setNewEmp({...newEmp, joinDate: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-500" /> 사내 아이디
                  </label>
                  <input type="text" placeholder="user_id" required value={newEmp.email} onChange={(e) => setNewEmp({...newEmp, email: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner" />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" /> 초기 소속 팀
                  </label>
                  <select value={newEmp.teamId} onChange={(e) => setNewEmp({...newEmp, teamId: e.target.value})} className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-black text-slate-700 shadow-inner appearance-none">
                    <option value="">-- 미배정 --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-8 flex gap-6">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 px-8 py-5 text-slate-400 font-black bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">취소</button>
                <button type="submit" className="flex-[2] px-8 py-5 text-white font-black bg-indigo-600 rounded-2xl shadow-[0_12px_24px_-8px_rgba(79,70,229,0.5)] hover:bg-indigo-700 transition-all active:scale-95">입사 정보 등록</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 인사 정보 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-12 w-full max-w-md border border-slate-100 animate-modal-pop">
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">인사 고과 및 소속 관리</h2>
                <p className="text-slate-500 text-sm font-medium tracking-tight">
                  <span className="text-indigo-600 font-black">{editingEmployee?.name || '신규 인원'}</span>님의 정보를 수정합니다.
                </p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight">소속 팀 재배치</label>
                  <select 
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-slate-700 shadow-inner appearance-none"
                    value={editingEmployee?.teamId || ''}
                    onChange={(e) => setEditingEmployee(editingEmployee ? { ...editingEmployee, teamId: e.target.value } : null)}
                  >
                    <option value="">-- 팀 선택 --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-black text-slate-800 ml-1 tracking-tight">권한 등급 (Access Level)</label>
                  <div className="relative">
                    <select 
                      className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:border-indigo-500 focus:bg-white outline-none transition-all font-black text-slate-700 shadow-sm appearance-none cursor-pointer pr-12"
                      value={editingEmployee?.role || 'EMPLOYEE'}
                      onChange={(e) => setEditingEmployee(editingEmployee ? { ...editingEmployee, role: e.target.value } : null)}
                    >
                      <option value="EMPLOYEE">일반 직원 (EMPLOYEE)</option>
                      <option value="SUB_ADMIN">부관리자 (SUB_ADMIN)</option>
                      <option value="ADMIN">시스템 마스터 (ADMIN)</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-8 py-5 text-slate-400 font-black bg-slate-100 rounded-[1.5rem] hover:bg-slate-200 transition-all">취소</button>
                <button 
                  onClick={() => {
                    if (editingEmployee) handleUpdateRole(editingEmployee, editingEmployee.teamId || '', editingEmployee.role);
                  }}
                  className="flex-[2] px-8 py-5 text-white font-black bg-indigo-600 rounded-[1.5rem] shadow-2xl shadow-indigo-200 transition-all active:scale-95"
                >
                  기록 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
