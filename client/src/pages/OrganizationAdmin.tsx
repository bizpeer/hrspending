import React, { useState } from 'react';
import { PlusCircle, Search, Users } from 'lucide-react';

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

export const OrganizationAdmin: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  const filteredTeams = selectedDivision
    ? MOCK_TEAMS.filter((team) => team.divisionId === selectedDivision)
    : MOCK_TEAMS;

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col items-start gap-8 min-h-screen">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-500" />
          조직 관리
        </h1>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition">
            <PlusCircle className="w-5 h-5" />
            본부 생성
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-700 transition">
            <PlusCircle className="w-5 h-5" />
            팀 생성
          </button>
        </div>
      </div>

      <div className="flex w-full gap-8">
        {/* 본부 리스트 (조직도 1차) */}
        <div className="flex-1 bg-white shadow-md rounded border p-5">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">본부 (Divisions)</h2>
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
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center justify-between">
            팀 (Teams)
            {selectedDivision && (
              <span className="text-sm font-normal text-gray-500 cursor-pointer hover:underline" onClick={() => setSelectedDivision(null)}>
                전체 보기
              </span>
            )}
          </h2>
          {filteredTeams.length > 0 ? (
            <ul className="space-y-2">
              {filteredTeams.map((team) => (
                <li key={team.id} className="p-3 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-gray-800">{team.name}</span>
                      <p className="text-xs text-gray-500 mt-1">소속 본부: {MOCK_DIVISIONS.find(d => d.id === team.divisionId)?.name}</p>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                      팀장 ID: {team.leaderId || '미지정'}
                    </span>
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
      
      {/* 권한 할당 안내 컨테이너 */}
      <div className="w-full bg-blue-50 border border-blue-200 rounded p-6 mt-4">
        <h3 className="font-bold text-blue-800 mb-2">리더 임명 프로세스</h3>
        <p className="text-blue-900 text-sm mb-4">
          본부장 및 팀장 임명은 본부/팀 우측의 '수정' 버튼을 클릭하여 임직원 목록에서 사용자를 검색해 `uid`를 매핑하는 형태로 구현됩니다.<br />
          리더로 임명된 사용자는 하위 직원들의 휴가 연차를 결재/승인할 수 있는 권한이 자동으로 부여됩니다.
        </p>
        <div className="relative max-w-sm">
          <input 
            type="text" 
            placeholder="임직원 이름 또는 이메일로 검색..." 
            className="w-full px-4 py-2 border rounded-md shadow-sm text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>
    </div>
  );
};
