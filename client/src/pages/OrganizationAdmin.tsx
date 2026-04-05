import React, { useState, useEffect } from 'react';
import { PlusCircle, Users, ShieldAlert, UserPlus, ArrowRightLeft, Trash2, Loader2, Building } from 'lucide-react';
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
}

export const OrganizationAdmin: React.FC = () => {
  const { userData } = useAuthStore();
  const isMasterAdmin = userData?.role === 'ADMIN';

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
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
  const [newEmp, setNewEmp] = useState({ name: '', email: '', teamId: '' });

  // Firestore 데이터 실시간 구독
  useEffect(() => {
    setLoading(true);
    const unsubDivs = onSnapshot(collection(db, 'divisions'), (snap) => {
      setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Division)));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Employee)));
      setLoading(false);
    });

    return () => {
      unsubDivs();
      unsubTeams();
      unsubUsers();
    };
  }, []);

  const filteredTeams = selectedDivision
    ? teams.filter((team) => team.divisionId === selectedDivision)
    : teams;

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivName.trim()) return;
    try {
      await addDoc(collection(db, 'divisions'), {
        name: newDivName,
        headId: ''
      });
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
      await addDoc(collection(db, 'teams'), {
        divisionId: newTeamDivId,
        name: newTeamName,
        leaderId: ''
      });
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
      // 주의: 클라이언트 쪽에서는 현재 로그인된 관리자 세션을 유지하면서 
      // 새로운 Auth 계정을 생성할 수 없습니다 (Firebase Auth 제약).
      // 따라서 여기서는 Firestore 'users' 문서만 먼저 생성하거나 
      // 별도의 가입 안내 로직이 필요합니다. 
      // 일단 'users' 문서 생성 로직을 먼저 태웁니다.
      
      const tempId = `temp_${Date.now()}`;
      await setDoc(doc(db, 'users', tempId), {
        name: newEmp.name,
        email: newEmp.email,
        role: 'EMPLOYEE',
        teamId: newEmp.teamId || '',
        teamHistory: [],
        createdAt: new Date().toISOString()
      });
      
      alert(`[안내] 신규 직원 데이터가 등록되었습니다.\n이메일: ${newEmp.email}\n(실제 로그인을 위해서는 해당 이메일로 가입 절차가 필요합니다.)`);
      setShowEmployeeModal(false);
    } catch (err) {
      alert("직원 등록 실패: " + (err as Error).message);
    }
  };

  const handleDeleteDivision = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 본부를 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'divisions', id));
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  }

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 팀을 삭제하시겠습니까?`)) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
    } catch (err) {
      alert("삭제 실패: " + (err as Error).message);
    }
  }

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
        <div className="flex-1 bg-white shadow-xl rounded-2xl border border-gray-100 p-6">
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
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Building className={`w-4 h-4 ${selectedDivision === div.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-bold ${selectedDivision === div.id ? 'text-indigo-900' : 'text-gray-700'}`}>{div.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trash2 
                      className="w-4 h-4 text-gray-300 hover:text-red-500 transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleDeleteDivision(div.id, div.name); }}
                    />
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
                onClick={() => setShowTeamModal(true)}
              />
            </div>
          </h2>
          {filteredTeams.length > 0 ? (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTeams.map((team) => (
                <li key={team.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition-all flex flex-col gap-4">
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
                    <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase flex justify-between">
                      소속 직원 <span>{getEmployeesInTeam(team.id).length}명</span>
                    </h4>
                    {getEmployeesInTeam(team.id).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {getEmployeesInTeam(team.id).map(emp => (
                          <div key={emp.uid} className="text-xs font-medium bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full shadow-sm">
                            {emp.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">배정된 인원 없음</p>
                    )}
                  </div>

                  <button className="mt-2 text-indigo-600 text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-50 p-2 rounded-lg transition-all w-fit">
                    <ArrowRightLeft className="w-3.5 h-3.5"/>
                    멤버 관리 / 이동
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Building className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">해당 조건에 등록된 팀이 없습니다.</p>
            </div>
          )}
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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">팀 배정</label>
                  <select value={newEmp.teamId} onChange={(e) => setNewEmp({...newEmp, teamId: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                    <option value="">-- 미지정 --</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">이메일 (ID로 사용됨)</label>
                <input type="email" required value={newEmp.email} onChange={(e) => setNewEmp({...newEmp, email: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <div className="pt-6 flex gap-3 border-t">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="flex-1 px-4 py-3 text-gray-500 font-bold bg-gray-100 rounded-xl">취소</button>
                <button type="submit" className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 rounded-xl shadow-lg">DB 등록</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
