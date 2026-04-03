import React, { useState } from 'react';
import { PlusCircle, Users, ShieldAlert, UserPlus, ArrowRightLeft } from 'lucide-react';
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

// 목업 데이터
const MOCK_DIVISIONS: Division[] = [
  { id: 'd1', name: '경영지원본부', headId: 'u1' },
  { id: 'd2', name: '개발본부', headId: 'u2' },
];

const MOCK_TEAMS: Team[] = [
  { id: 't1', divisionId: 'd1', name: '인사협력팀', leaderId: 'u3' },
  { id: 't2', divisionId: 'd2', name: '프론트엔드 파트', leaderId: 'u4' },
  { id: 't3', divisionId: 'd2', name: '백엔드 파트', leaderId: 'u5' },
];

const MOCK_EMPLOYEES = [
  { 
    id: 'e1', name: '김민수', email: 'minsoo@hrflow.com', teamId: 't2', role: 'EMPLOYEE',
    teamHistory: [
      { teamId: 't3', teamName: '백엔드 파트', joinedAt: '2025-01-10', leftAt: '2026-02-15' }
    ]
  },
  { 
    id: 'e2', name: '이영희', email: 'younghee@hrflow.com', teamId: 't1', role: 'EMPLOYEE',
    teamHistory: []
  }
];

export const OrganizationAdmin: React.FC = () => {
  const { userData } = useAuthStore();
  const isMasterAdmin = userData?.role === 'ADMIN';

  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  
  // 모달(상태) 제어용
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  const filteredTeams = selectedDivision
    ? MOCK_TEAMS.filter((team) => team.divisionId === selectedDivision)
    : MOCK_TEAMS;

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    alert("직원용 Firebase 계정이 생성되고 users 컬렉션에 등록됩니다. (구현 필요)");
    setShowEmployeeModal(false);
  };

  const handleSubAdminAction = () => {
    // 서브 관리자가 없을 때 생성, 있을 때 권한해제 프롬프트
    alert("Sub-관리자 계정을 생성/삭제하는 Firestore 권한 승격 로직이 실행됩니다.");
  }

  // 모의: 특정 팀의 소속 직원 필터
  const getEmployeesInTeam = (teamId: string) => {
    return MOCK_EMPLOYEES.filter(emp => emp.teamId === teamId);
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
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
              <p className="text-red-600 text-sm mt-1">시스템을 보조할 수 있는 최고 권한의 Sub-관리자를 단 1명 배정할 수 있습니다.</p>
            </div>
            <button 
              onClick={handleSubAdminAction}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow font-medium transition"
            >
              Sub-관리자 생성/변경
            </button>
          </div>
        </div>
      )}

      <div className="flex w-full gap-8">
        {/* 본부 리스트 (조직도 1차) */}
        <div className="flex-1 bg-white shadow-md rounded border p-5">
          <h2 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex justify-between items-center">
            본부 (Divisions)
            <PlusCircle className="w-5 h-5 text-gray-400 cursor-pointer hover:text-indigo-600" />
          </h2>
          <ul className="space-y-2">
            {MOCK_DIVISIONS.map((div) => (
              <li 
                key={div.id}
                onClick={() => setSelectedDivision(div.id)}
                className={`p-3 rounded border cursor-pointer hover:border-indigo-500 transition-colors 
                  ${selectedDivision === div.id ? 'bg-indigo-50 border-indigo-500' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">{div.name}</span>
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full border border-indigo-200">
                    본부장 ID: {div.headId || '미지정'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 팀 리스트 (조건부 디스플레이 - 조직도 2차) */}
        <div className="flex-1 bg-white shadow-md rounded border p-5">
          <h2 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2 flex items-center justify-between">
            팀 (Teams)
            <div className="flex items-center gap-3">
              {selectedDivision && (
                <span className="text-sm font-normal text-gray-500 cursor-pointer hover:underline" onClick={() => setSelectedDivision(null)}>
                  전체 보기
                </span>
              )}
              <PlusCircle className="w-5 h-5 text-gray-400 cursor-pointer hover:text-emerald-600" />
            </div>
          </h2>
          {filteredTeams.length > 0 ? (
            <ul className="space-y-3">
              {filteredTeams.map((team) => (
                <li key={team.id} className="p-4 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="font-semibold text-gray-800">{team.name}</span>
                      <p className="text-xs text-gray-500 mt-1">소속 본부: {MOCK_DIVISIONS.find(d => d.id === team.divisionId)?.name}</p>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                      팀장 ID: {team.leaderId || '미지정'}
                    </span>
                  </div>
                  
                  {/* 직원 배치/이동 버튼 구역 */}
                  <div className="border-t pt-3 flex flex-col">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">소속 직원 ({getEmployeesInTeam(team.id).length}명)</h4>
                      {getEmployeesInTeam(team.id).length > 0 ? (
                        <div className="space-y-2">
                          {getEmployeesInTeam(team.id).map(emp => (
                            <div key={emp.id} className="text-sm bg-white border border-gray-100 rounded p-2 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-800">{emp.name} ({emp.email})</span>
                              </div>
                              {emp.teamHistory && emp.teamHistory.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                  <p className="text-xs text-gray-400 mb-1">팀 소속 이력:</p>
                                  {emp.teamHistory.map((history, idx) => (
                                    <div key={idx} className="text-xs text-gray-500 bg-gray-50 p-1 rounded inline-block mr-2 mb-1 border border-gray-100">
                                      {history.teamName} ({history.joinedAt} ~ {history.leftAt})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">소속된 직원이 없습니다.</div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline">
                          <ArrowRightLeft className="w-4 h-4"/>
                          직원 배치 / 팀 이동
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 text-gray-500">
              해당 본부에 등록된 팀이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 직원 생성 모달 (간단한 오버레이 형태) */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">신규 직원 등록</h2>
            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input type="text" required className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">이메일</label>
                <input type="email" required className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">임시 비밀번호</label>
                <input type="password" required className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">소속 팀 (선택)</label>
                <select className="mt-1 block w-full px-3 py-2 border rounded-md bg-white">
                  <option value="">-- 배정 안함 --</option>
                  {MOCK_TEAMS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t">
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200">취소</button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">생성하기</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
