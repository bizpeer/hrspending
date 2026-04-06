import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, Clock, FileText, Calendar, Filter, User, ArrowRight, MoreHorizontal, Check, X, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  requestDays: number;
}

interface ExpenseRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  amount: string;
  date: string;
  category: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const AdminApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LEAVE' | 'EXPENSE'>('LEAVE');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
    const qLeave = query(collection(db, 'leaves'), orderBy('createdAt', 'desc'));
    const unsubLeave = onSnapshot(qLeave, (snap) => {
      setLeaveRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    });

    const qExpense = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    const unsubExpense = onSnapshot(qExpense, (snap) => {
      setExpenseRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseRequest)));
    });

    return () => { unsubLeave(); unsubExpense(); };
  }, []);

  const handleUpdateStatus = async (collectionName: string, id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      if (!window.confirm(`이 승인 요청을 ${newStatus === 'APPROVED' ? '승인' : '반려'} 처리하시겠습니까?`)) return;
      await updateDoc(doc(db, collectionName, id), { status: newStatus });
    } catch (err: any) {
      alert('상태 업데이트 실패: ' + err.message);
    }
  };

  const filteredLeaves = leaveRequests.filter(req => filter === 'ALL' || req.status === filter);
  const filteredExpenses = expenseRequests.filter(req => filter === 'ALL' || req.status === filter);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">전자결재/승인 관리</h1>
            </div>
            <p className="text-slate-500 font-medium">휴가 및 지출결의 승인 대기 건을 처리합니다.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-[2rem] premium-shadow border border-slate-100">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all tracking-tight ${
                  filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {f === 'PENDING' ? '대기' : f === 'APPROVED' ? '승인' : f === 'REJECTED' ? '반려' : '전체'}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1.5 bg-slate-200/50 rounded-3xl w-fit premium-shadow border border-slate-100">
          <button 
            onClick={() => setActiveTab('LEAVE')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-300 ${activeTab === 'LEAVE' ? 'bg-white text-indigo-700 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Calendar className={`w-4.5 h-4.5 ${activeTab === 'LEAVE' ? 'text-indigo-600' : 'text-slate-400'}`} />
            휴가 신청 건
          </button>
          <button 
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-black text-sm transition-all duration-300 ${activeTab === 'EXPENSE' ? 'bg-white text-emerald-700 shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className={`w-4.5 h-4.5 ${activeTab === 'EXPENSE' ? 'text-emerald-600' : 'text-slate-400'}`} />
            지출결의 건
          </button>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                 <thead>
                    <tr className="bg-slate-50/50">
                       <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">요청 일자 / 신청자</th>
                       <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab === 'LEAVE' ? '유형 / 사유' : '분류 / 항목'}</th>
                       <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab === 'LEAVE' ? '기간 및 소진일' : '청구 금액'}</th>
                       <th className="px-8 py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">처리 상태</th>
                       <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">관리 액션</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 font-sans">
                    {(activeTab === 'LEAVE' ? filteredLeaves : filteredExpenses).map((req: any) => (
                       <tr key={req.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                          <td className="px-8 py-8">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                   <User className="w-5 h-5" />
                                </div>
                                <div>
                                   <div className="text-sm font-black text-slate-800">{req.userName}</div>
                                   <div className="text-[10px] font-bold text-slate-400 mt-1">
                                      {req.createdAt ? format(new Date(req.createdAt), 'yyyy. MM. dd HH:mm') : '-'}
                                   </div>
                                </div>
                             </div>
                          </td>

                          <td className="px-8 py-8">
                             <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase mb-2 bg-slate-100 text-slate-600">
                                {activeTab === 'LEAVE' ? (req.type === 'annual' ? '연차' : req.type === 'half' ? '반차' : '기타') : req.category}
                             </div>
                             <div className="text-sm font-bold text-slate-600 line-clamp-1 max-w-[200px]">
                                {activeTab === 'LEAVE' ? req.reason : req.title}
                             </div>
                          </td>

                          <td className="px-8 py-8">
                             {activeTab === 'LEAVE' ? (
                                <>
                                   <div className="text-sm font-black text-slate-800">{req.startDate} ~ {req.endDate}</div>
                                   <div className="text-[11px] font-bold text-rose-500 mt-1 italic">계산된 소진일: {req.requestDays}일</div>
                                </>
                             ) : (
                                <>
                                   <div className="text-lg font-black text-slate-900 italic">₩ {Number(req.amount).toLocaleString()}</div>
                                   <div className="text-[10px] font-bold text-slate-400 mt-1">{req.date} 결제분</div>
                                </>
                             )}
                          </td>

                          <td className="px-8 py-8">
                             <div className="flex justify-center">
                                <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black border ${getStatusStyle(req.status)}`}>
                                   {req.status === 'APPROVED' ? <CheckCircle className="w-3.5 h-3.5 animate-pulse-slow" /> : 
                                    req.status === 'REJECTED' ? <XCircle className="w-3.5 h-3.5" /> : 
                                    <Clock className="w-3.5 h-3.5 animate-spin-slow" />}
                                   {req.status === 'APPROVED' ? '최종승인' : req.status === 'REJECTED' ? '반려처리' : '결재대기'}
                                </span>
                             </div>
                          </td>

                          <td className="px-8 py-8">
                             <div className="flex items-center justify-end gap-2">
                                {req.status === 'PENDING' ? (
                                   <>
                                      <button 
                                         onClick={() => handleUpdateStatus(activeTab === 'LEAVE' ? 'leaves' : 'expenses', req.id, 'APPROVED')}
                                         className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-sm border border-emerald-100"
                                         title="승인"
                                      >
                                         <Check className="w-5 h-5" />
                                      </button>
                                      <button 
                                         onClick={() => handleUpdateStatus(activeTab === 'LEAVE' ? 'leaves' : 'expenses', req.id, 'REJECTED')}
                                         className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-sm border border-rose-100"
                                         title="반려"
                                      >
                                         <X className="w-5 h-5" />
                                      </button>
                                   </>
                                ) : (
                                   <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 py-2">
                                      {req.status === 'APPROVED' ? 'Finished' : 'Rejected'}
                                   </div>
                                )}
                             </div>
                          </td>
                       </tr>
                    ))}
                    {(activeTab === 'LEAVE' ? filteredLeaves : filteredExpenses).length === 0 && (
                       <tr>
                          <td colSpan={5} className="py-40 text-center">
                             <div className="flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-white shadow-inner">
                                   <Filter className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-slate-400 font-black tracking-tight">해당하는 결재 안건이 없습니다.</p>
                             </div>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Stats Footer Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { label: 'Today Action Required', count: (leaveRequests.length + expenseRequests.length), icon: Clock, color: 'bg-amber-600' },
             { label: 'Weekly Approval Rate', count: '94%', icon: CheckCircle, color: 'bg-indigo-600' },
             { label: 'Average Processing Time', count: '2.4h', icon: ArrowRight, color: 'bg-slate-900' }
           ].map((card, i) => (
             <div key={i} className={`${card.color} p-8 rounded-[2rem] text-white premium-shadow flex items-center justify-between group overflow-hidden relative`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                <div className="relative z-10">
                   <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{card.label}</div>
                   <div className="text-3xl font-black">{card.count}</div>
                </div>
                <card.icon className="w-10 h-10 opacity-20 relative z-10" />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
