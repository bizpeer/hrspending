import React, { useState } from 'react';
import { Megaphone, Plus, Search, ChevronDown, Bell, Clock, User, ArrowRight, ExternalLink } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
  category: string;
  isGlobal: boolean;
  readBy: string[];
}

const MOCK_NOTICES: Notice[] = [
  { 
    id: 'n1', title: '[필독] 3월 전사 회식 및 워크샵 안내', 
    category: '행사/워크샵',
    content: '금월 마지막 주 금요일에 전사 워크샵이 진행됩니다. 참석 여부를 HR로 회신 바랍니다. 행사장소는 가평 인근 리조트이며, 오전 10시 본사 앞에서 버스로 출발합니다.',
    authorId: 'HR_ADMIN', createdAt: '2026-03-30', isGlobal: true, readBy: ['uid1', 'uid2'] 
  },
  { 
    id: 'n2', title: '지출결의 양식 변경 공지', 
    category: '규정/절차',
    content: '본부장 2단계 승인을 위해 지출결의 폼에 신규 카테고리가 추가되었습니다. 4월 1일부터는 새로운 양식으로만 제출 가능하오니 참고 부탁드립니다.',
    authorId: 'FINANCE_DIRECTOR', createdAt: '2026-03-29', isGlobal: true, readBy: ['uid1'] 
  },
  { 
    id: 'n3', title: '신규 임직원 휴가 규정 안내 (개정판)', 
    category: '복리후생',
    content: '한국 근로기준법 통과에 따른 1년 미만 입사자 연차 적용 방식 변경 안내문입니다. 신입 사원분들께서는 변경된 연차 발생 기준을 확인하시어 휴가 계획에 차질 없으시길 바랍니다.',
    authorId: 'DIRECTOR', createdAt: '2026-03-25', isGlobal: true, readBy: [] 
  }
];

interface NoticeBoardProps {
  userRole: 'ADMIN' | 'SUB_ADMIN' | 'EMPLOYEE' | string;
  currentUserId: string;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ userRole, currentUserId }) => {
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUB_ADMIN';

  const handleNoticeClick = (noticeId: string) => {
    setExpandedNoticeId(prev => prev === noticeId ? null : noticeId);
  };

  const filteredNotices = MOCK_NOTICES.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                <Megaphone className="w-5 h-5 fill-current" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">전사 알림 및 공지</h1>
            </div>
            <p className="text-slate-500 font-medium">조직의 최신 뉴스와 중요한 업데이트를 확인하세요.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="공지 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all font-medium text-slate-700 premium-shadow"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            
            {isAdmin && (
              <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 shrink-0">
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">새 공지</span>
              </button>
            )}
          </div>
        </div>

        {/* Categories / Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {[
             { label: 'Unread', count: MOCK_NOTICES.filter(n => !n.readBy.includes(currentUserId)).length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
             { label: 'Total', count: MOCK_NOTICES.length, color: 'text-slate-600', bg: 'bg-slate-100' },
             { label: 'Events', count: 1, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             { label: 'Rules', count: 2, color: 'text-amber-600', bg: 'bg-amber-50' }
           ].map((stat, i) => (
             <div key={i} className={`p-4 rounded-3xl ${stat.bg} border border-white flex flex-col items-center justify-center space-y-1`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${stat.color} opacity-60`}>{stat.label}</span>
                <span className={`text-2xl font-black ${stat.color}`}>{stat.count}</span>
             </div>
           ))}
        </div>

        {/* Notice Timeline/List */}
        <div className="space-y-4">
           {filteredNotices.map((notice, idx) => {
             const isUnread = !notice.readBy.includes(currentUserId);
             const isExpanded = expandedNoticeId === notice.id;

             return (
               <div key={notice.id} className="relative group">
                 {/* Timeline Line */}
                 {idx !== filteredNotices.length - 1 && (
                   <div className="absolute left-[31px] top-16 bottom-0 w-0.5 bg-slate-200 hidden md:block" />
                 )}

                 <div className="flex gap-6 items-start">
                    {/* Date/Status Indicator */}
                    <div className="hidden md:flex flex-col items-center pt-2">
                       <div className={`w-[64px] h-[64px] rounded-2xl flex flex-col items-center justify-center transition-all duration-500 premium-shadow border-2 ${
                         isUnread ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white border-slate-100 text-slate-400'
                       }`}>
                          <span className="text-[10px] font-black leading-none mb-1 uppercase tracking-tighter">
                            {notice.createdAt.split('-')[1]}월
                          </span>
                          <span className="text-xl font-black leading-none">
                            {notice.createdAt.split('-')[2]}
                          </span>
                       </div>
                    </div>

                    {/* Main Content Card */}
                    <div className={`flex-1 glass-card rounded-[2.5rem] overflow-hidden transition-all duration-500 border border-white premium-shadow hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                      isExpanded ? 'bg-white' : 'hover:bg-white/80'
                    }`}
                    onClick={() => handleNoticeClick(notice.id)}
                    >
                       <div className="p-8">
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                             <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                    isUnread ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {notice.category}
                                  </span>
                                  {isUnread && (
                                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 animate-pulse">
                                      <Bell className="w-3 h-3 fill-current" />
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <h3 className={`text-xl font-black leading-tight tracking-tight mt-2 ${
                                  isUnread ? 'text-slate-900 font-black' : 'text-slate-600 font-bold'
                                }`}>
                                  {notice.title}
                                </h3>
                             </div>
                             
                             <div className="flex items-center gap-4 text-slate-400">
                                <div className="flex flex-col items-end">
                                   <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                      <User className="w-3.5 h-3.5" />
                                      {notice.authorId}
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 md:hidden">
                                      <Clock className="w-3 h-3" />
                                      {notice.createdAt}
                                   </div>
                                </div>
                                <div className={`p-2 rounded-full bg-slate-50 transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-300'}`}>
                                   <ChevronDown className="w-5 h-5" />
                                </div>
                             </div>
                          </div>

                          <div className={`transition-all duration-700 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                             <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {notice.content}
                                
                                <div className="mt-8 pt-6 border-t border-slate-200/50 flex flex-wrap gap-4">
                                   <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 text-indigo-600 text-xs font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all group">
                                      관련 문서 확인
                                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                   </button>
                                   <button className="flex items-center gap-2 px-4 py-2 text-slate-400 text-xs font-black rounded-xl hover:text-slate-600 transition-all">
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      외부 링크
                                   </button>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               </div>
             );
           })}

           {filteredNotices.length === 0 && (
             <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-inner">
                   <Search className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-black tracking-tight">검색 결과가 없습니다.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
