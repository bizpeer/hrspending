import React, { useState } from 'react';
import { Megaphone, Plus, Search, ChevronDown, List } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  isGlobal: boolean;
  readBy: string[]; // 현재 사용자 uid가 이 배열에 없으면 새로 등록된 알람으로 취급됨
}

// 목업 데이터
const MOCK_NOTICES: Notice[] = [
  { 
    id: 'n1', title: '[필독] 3월 전사 회식 및 워크샵 안내', 
    content: '금월 마지막 주 금요일에 전사 워크샵이 진행됩니다. 참석 여부를 HR로 회신 바랍니다.',
    authorId: 'HR_ADMIN', createdAt: '2026-03-30', isGlobal: true, readBy: ['uid1', 'uid2'] 
  },
  { 
    id: 'n2', title: '지출결의 양식 변경 공지', 
    content: '본부장 2단계 승인을 위해 지출결의 폼에 신규 카테고리가 추가되었습니다.',
    authorId: 'FINANCE_DIRECTOR', createdAt: '2026-03-29', isGlobal: true, readBy: ['uid1'] 
  },
  { 
    id: 'n3', title: '신규 임직원 휴가 규정 안내 (개정판)', 
    content: '한국 근로기준법 통과에 따른 1년 미만 입사자 연차 적용 방식 변경 안내문입니다.',
    authorId: 'DIRECTOR', createdAt: '2026-03-25', isGlobal: true, readBy: [] 
  }
];

interface NoticeBoardProps {
  userRole: 'ADMIN' | 'SUB_ADMIN' | 'EMPLOYEE' | string;
  currentUserId: string;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ userRole, currentUserId }) => {
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUB_ADMIN';

  const handleNoticeClick = (noticeId: string) => {
    // 세부 내용 토글
    setExpandedNoticeId(prev => prev === noticeId ? null : noticeId);
    
    // TODO: 만약 클릭한 게시물이 아직 읽지 않은(readBy에 내 uid가 없는) 것이라면
    // Firestore 트랜잭션을 통해 readBy 배열에 currentUserId를 추가(arrayUnion)하는 업데이트 함수를 실행합니다.
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col items-center min-h-screen">
      <div className="w-full max-w-4xl">
        <div className="flex w-full items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-rose-500" />
            사내 공지 및 알림판
          </h1>
          {isAdmin && (
            <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg shadow hover:bg-rose-700 transition">
              <Plus className="w-5 h-5" />
              새 공지 작성
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden relative">
          
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold">
                <List className="w-4 h-4"/>
                <span>전체 공지 {MOCK_NOTICES.length}건</span>
             </div>
             <div className="relative">
                <input 
                  type="text" 
                  placeholder="제목 또는 내용 검색..." 
                  className="pl-8 pr-4 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
             </div>
          </div>

          <div className="divide-y divide-gray-100">
            {MOCK_NOTICES.map((notice) => {
              const isUnread = !notice.readBy.includes(currentUserId);
              const isExpanded = expandedNoticeId === notice.id;

              return (
                <div key={notice.id} className="transition-colors hover:bg-gray-50/50">
                  <div 
                    onClick={() => handleNoticeClick(notice.id)}
                    className="p-5 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {isUnread ? (
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      ) : (
                        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-gray-300" />
                      )}
                      <div>
                        <h3 className={`text-base font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
                          {notice.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          작성자: {notice.authorId} &nbsp;|&nbsp; {notice.createdAt}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="px-11 pb-6 pt-2 text-sm text-gray-700 bg-gray-50/30">
                      {/* 여기에 이미지나 마크다운 변환기를 넣을 수도 있습니다. */}
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {notice.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
