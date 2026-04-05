import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Users, ShieldAlert, UserPlus, ArrowRightLeft, 
  Trash2, Loader2, Building, X 
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
    const unsubDivs = onSnapshot(collection(db, 'divisions'), (snap) => {
      setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Division)));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    const unsubUsers = onSnapshot(collection(db, 'UserProfile'), (snap) => {
      setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Employee)));
      setLoading(false);
    });
    // 감사 로그 구독 (최근 50개)
    const unsubLogs = onSnapshot(collection(db, 'AuditLogs'), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
      setAuditLogs(logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 50));
    });

    return () => {
      unsubDivs();
      unsubTeams();
      unsubUsers();
      unsubLogs();
    };
  }, []);

  // 감사 로그 저장 유틸리티
  const logAction = async (type: string, targetId: string, targetName: string, details: string) => {
    try {
      await addDoc(collection(db, 'AuditLogs'), {
        timestamp: new Date().toISOString(),
        actionType: type,
        performedBy: userData?.name || '시스템',
        targetId,
        targetName,
        details
      });
    } catch (err) {
      console.error("Log failed:", err);
    }
  };

  const filteredTeams = selectedDivision
    ? teams.filter((team) => team.divisionId === selectedDivision)
    : teams;

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'divisions'), {
        name: newDivName,
        headId: ''
      });
      await logAction('CREATE_DIVISION', docRef.id, newDivName, '새 본부 생성');
      setNewDivName('');
      setShowDivisionModal(false);
    } catch (err) {
      alert("본부 생성 실패: " + (err as Error).message);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDivId) return;
    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        divisionId: newTeamDivId,
        name: newTeamName,
        leaderId: ''
      });
      const divName = divisions.find(d => d.id === newTeamDivId)?.name || '알 수 없음';
      await logAction('CREATE_TEAM', docRef.id, newTeamName, `${divName} 소속 팀 생성`);
      setNewTeamName('');
      setNewTeamDivId('');
      setShowTeamModal(false);
    } catch (err) {
      alert("팀 생성 실패: " + (err as Error).message);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalEmail = newEmp.email.trim();
      if (!finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@internal.com`;
      }

      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, 'UserProfile', tempId), {
        name: newEmp.name,
        email: finalEmail,
        role: 'EMPLOYEE',
        teamId: newEmp.teamId || '',
        teamHistory: [],
        joinDate: newEmp.joinDate,
        mustChangePassword: true, // 최초 로그인 시 비밀번호 변경 필수
        createdAt: new Date().toISOString()
      });
      
      await logAction('CREATE_EMPLOYEE', tempId, newEmp.name, `직원 등록 (${finalEmail}) / 임비 123456`);
      alert(`[안내] 신규 직원 데이터가 등록되었습니다.\n아이디: ${newEmp.email}\n임시 비밀번호: 123456\n로그인 시 비밀번호 변경이 필요합니다.`);
      setShowEmployeeModal(false);
      setNewEmp({ name: '', email: '', teamId: '', joinDate: new Date().toISOString().split('T')[0] });
    } catch (err) {
      alert("직원 등록 실패: " + (err as Error).message);
    }
  };

  const handleDeleteEmployee = async (uid: string, name: string) => {
    if (!window.confirm(`'${name}' 직원을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.`)) return;
    try {
      await deleteDoc(doc(db, 'UserProfile', uid));
      await logAction('DELETE_EMPLOYEE', uid, name, '직원 삭제(영구)');
      alert("삭제되었습니다.");
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  };

  const handleUpdateRole = async (emp: Employee, newTeamId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'UserProfile', emp.uid);
      const teamName = teams.find(t => t.id === newTeamId)?.name || '미배정';
      
      const newHistory = [...(emp.teamHistory || []), {
        teamId: newTeamId,
        teamName,
        joinedAt: new Date().toISOString(),
        role: newRole
      }];

      await setDoc(userRef, {
        ...emp,
        uid: emp.uid, 
        teamId: newTeamId,
        role: newRole,
        teamHistory: newHistory
      }, { merge: true });

      await logAction('UPDATE_EMPLOYEE', emp.uid, emp.name, `${teamName} 로 이동 / 역할: ${newRole}`);
      alert(`${emp.name}님의 소속/역할이 변경되었습니다.`);
      setShowEditModal(false);
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
      alert("소속된 팀이 있는 본부는 삭제할 수 없습니다. 팀을 먼저 이동하거나 삭제하세요.");
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
      alert("이 팀에 소속된 직원이 있습니다. 직원을 먼저 이동시킨 후 삭제하세요.");
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-medium">조직 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col items-start gap-8 min-h-screen">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-500" />
          조직 관리
        </h1>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowEmployeeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all font-semibold"
          >
            <UserPlus className="w-5 h-5" />
            신규 직원 등록
          </button>
        </div>
      </div>

      {isMasterAdmin && (
        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-bold text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> 마스터 관리자 전용</h3>
              <p className="text-red-600 text-sm mt-1">시스템을 보조할 수 있는 최고 권한의 Sub-관리자를 지정할 수 있습니다.</p>
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow font-medium transition">
              Sub-관리자 생성/변경
            </button>
          </div>
        </div>
      )}

      <div className="flex w-full gap-8">
        {/* 본부 리스트 */}
        <div className="flex-1 bg-white shadow-xl rounded-2xl border border-gray-100 p-6 h-[fit-content]">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-4 flex justify-between items-center">
            본부 (Divisions)
            <PlusCircle 
              className="w-6 h-6 text-indigo-500 cursor-pointer hover:scale-110 transition-transform" 
              onClick={() => setShowDivisionModal(true)}
            />
          </h2>
          <ul className="space-y-3">
            {divisions.map((div) => (
              <li 
                key={div.id}
                onClick={() => setSelectedDivision(div.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer 
                  ${selectedDivision === div.id 
                    ? 'bg-indigo-50 border-indigo-400 shadow-md ring-2 ring-indigo-100' 
                    : 'border-gray-100 hover:border-indigo-200 bg-white hover:shadow-sm'}`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Building className={`w-4 h-4 ${selectedDivision === div.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`font-bold ${selectedDivision === div.id ? 'text-indigo-900' : 'text-gray-700'}`}>{div.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Trash2 
                        className="w-4 h-4 hover:text-red-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDivision(div.id, div.name); }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] text-gray-500 font-medium">본부장:</span>
                     <select 
                      className="text-[10px] bg-transparent border-none focus:ring-0 p-0 text-indigo-600 font-bold cursor-pointer"
                      value={div.headId || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleAppointHead(div.id, e.target.value)}
                     >
                       <option value="">미임명</option>
                       {employees.map(emp => (
                         <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                       ))}
                     </select>
                  </div>
                </div>
              </li>
            ))}
            {divisions.length === 0 && <li className="text-center py-4 text-gray-400 text-sm">등록된 본부가 없습니다.</li>}
          </ul>
        </div>

        {/* 팀 리스트 */}
        <div className="flex-[1.5] bg-white shadow-xl rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-4 flex items-center justify-between">
            팀 (Teams)
            <div className="flex items-center gap-4">
              {selectedDivision && (
                <span className="text-sm font-medium text-indigo-600 cursor-pointer hover:underline" onClick={() => setSelectedDivision(null)}>
                  전체 보기
                </span>
              )}
              <PlusCircle 
                className="w-6 h-6 text-emerald-500 cursor-pointer hover:scale-110 transition-transform"
                onClick={() => {
                  if (selectedDivision) setNewTeamDivId(selectedDivision);
                  setShowTeamModal(true);
                }}
              />
            </div>
          </h2>
          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeams.map((team) => (
                <div key={team.id} className="p-5 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 text-lg">{team.name}</span>
                      <p className="text-xs text-indigo-500 font-medium mt-1 uppercase tracking-wider">
                        {divisions.find(d => d.id === team.divisionId)?.name} 소속
                      </p>
                    </div>
                    <Trash2 
                      className="w-4 h-4 text-gray-200 hover:text-red-500 cursor-pointer"
                      onClick={() => handleDeleteTeam(team.id, team.name)}
                    />
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase">
                        소속 직원 <span>({getEmployeesInTeam(team.id).length}명)</span>
                      </h4>
                      <select 
                        className="text-[10px] bg-transparent border-none focus:ring-0 p-0 text-emerald-600 font-bold cursor-pointer"
                        value={team.leaderId || ''}
                        onChange={(e) => handleAppointLeader(team.id, e.target.value)}
                      >
                        <option value="">팀장 선택</option>
                        {getEmployeesInTeam(team.id).map(emp => (
                          <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    {getEmployeesInTeam(team.id).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getEmployeesInTeam(team.id).map(emp => (
                          <div 
                            key={emp.uid} 
                            className="group flex items-center gap-1 text-xs font-medium bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full shadow-sm hover:border-indigo-400 transition-colors"
                          >
                            <span className="cursor-pointer" onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }}>
                              {emp.name} {team.leaderId === emp.uid && <span className="text-[10px] text-emerald-600 ml-1">(팀장)</span>}
                            </span>
                            <X 
                              className="w-3 h-3 text-gray-300 hover:text-red-500 cursor-pointer hidden group-hover:block" 
                              onClick={() => handleDeleteEmployee(emp.uid, emp.name)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">배정된 인원 없음</p>
                    )}
                  </div>

                  <button 
                    onClick={() => { setEditingEmployee(null); /* logic to trigger some focus if needed */ }}
                    className="mt-2 text-indigo-600 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-50 p-2 rounded-lg transition-all w-fit"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5"/>
                    인사 이동 / 정보 수정
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Building className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">해당 조건에 등록된 팀이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 작업 이력 (Audit Logs) 섹션 */}
      <div className="w-full bg-white shadow-xl rounded-2xl border border-gray-100 p-6 mt-4">
        <h2 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-indigo-500" />
          최근 작업 이력 (Audit Logs)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">시간</th>
                <th className="px-4 py-3">수행자</th>
                <th className="px-4 py-3">분류</th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">상세 내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{log.performedBy}</td>
                  <td className="px-4 py-3 text-indigo-600 font-medium">{log.actionType}</td>
                  <td className="px-4 py-3 text-gray-600">{log.targetName}</td>
                  <td className="px-4 py-3 text-gray-500">{log.details}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 italic">기록된 이력이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 본부 생성 모달 */}
      {showDivisionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">새 본부 추가</h2>
            <form onSubmit={handleCreateDivision} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">본부 이름</label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  value={newDivName}
                  onChange={(e) => setNewDivName(e.target.value)}
                  placeholder="예: 전략기획본부"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDivisionModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">취소</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 팀 생성 모달 */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">새 팀 추가</h2>
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">소속 본부</label>
                <select 
                  required 
                  value={newTeamDivId}
                  onChange={(e) => setNewTeamDivId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- 본부 선택 --</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">팀 이름</label>
                <input 
                  type="text" 
                  required 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="예: 마케팅 팀"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">취소</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직원 생성 모달 */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <UserPlus className="text-indigo-600" />
              신규 직원 등록
            </h2>
            <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">이름</label>
                  <input type="text" required value={newEmp.name} onChange={(e) => setNewEmp({...newEmp, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">입사일</label>
                  <input type="date" required value={newEmp.joinDate} onChange={(e) => setNewEmp({...newEmp, joinDate: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">아이디 (ID)</label>
                  <input type="text" placeholder="예: user123" required value={newEmp.email} onChange={(e) => setNewEmp({...newEmp, email: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">초기 팀 배정</label>
                  <select value={newEmp.teamId} onChange={(e) => setNewEmp({...newEmp, teamId: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                    <option value="">-- 미지정 --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-6 flex gap-3 border-t">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">취소</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 rounded-xl shadow-lg">DB 등록</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 직원 수정(이동/임명) 모달 */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">인사 정보 수정</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">대상: {editingEmployee.name}</label>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">팀 변경</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  value={editingEmployee.teamId || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, teamId: e.target.value })}
                >
                  <option value="">미배정</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">역할(Role) 변경</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  value={editingEmployee.role}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                >
                  <option value="EMPLOYEE">직원 (EMPLOYEE)</option>
                  <option value="SUB_ADMIN">부관리자 (SUB_ADMIN)</option>
                  <option value="ADMIN">관리자 (ADMIN)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">취소</button>
                <button 
                  onClick={() => handleUpdateRole(editingEmployee!, editingEmployee?.teamId || '', editingEmployee?.role || 'EMPLOYEE')} 
                  className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 rounded-xl"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
