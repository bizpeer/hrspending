import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
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
      alert('상태 업데이트 실패 (권한 또는 네트워크 오류): ' + err.message);
    }
  };

  const filteredLeaves = leaveRequests.filter(req => filter === 'ALL' || req.status === filter);
  const filteredExpenses = expenseRequests.filter(req => filter === 'ALL' || req.status === filter);

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col min-h-screen">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-indigo-600" />
            결재/승인 관리함
          </h1>
          <div className="flex bg-white rounded-lg p-1 border border-gray-200">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${
                  filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f === 'PENDING' ? '대기중' : f === 'APPROVED' ? '승인됨' : f === 'REJECTED' ? '반려됨' : '전체 보기'}
              </button>
            ))}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab('LEAVE')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'LEAVE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Calendar className="w-4 h-4" /> 휴가 결재
          </button>
          <button 
            onClick={() => setActiveTab('EXPENSE')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'EXPENSE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> 지출결의 내역
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">신청일</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">신청자</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'LEAVE' ? "휴가 구분" : "지출 분류"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'LEAVE' ? "기간/일수" : "청구금액 내역"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">상태</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTab === 'LEAVE' 
                ? filteredLeaves.map(req => (
                  <tr key={req.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.createdAt ? format(new Date(req.createdAt), 'yyyy-MM-dd') : '알 수 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{req.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg`}>
                        {req.type === 'annual' ? '연차' : req.type === 'half' ? '반차' : req.type === 'sick' ? '병가' : '기타'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-700">{req.startDate} ~ {req.endDate}</div>
                      <div className="text-xs text-rose-500 font-bold mt-1">총 {req.requestDays}일 소진</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'APPROVED' ? <CheckCircle className="w-4 h-4"/> : req.status === 'REJECTED' ? <XCircle className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
                        {req.status === 'APPROVED' ? '승인 완료' : req.status === 'REJECTED' ? '반려됨' : '결재 대기중'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleUpdateStatus('leaves', req.id, 'APPROVED')} className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200">
                          승인
                        </button>
                        <button onClick={() => handleUpdateStatus('leaves', req.id, 'REJECTED')} className="text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-200">
                          반려
                        </button>
                        </div>
                      ) : <span className="text-gray-400">처리 완료</span>}
                    </td>
                  </tr>
                ))
                : filteredExpenses.map(req => (
                  <tr key={req.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.createdAt ? format(new Date(req.createdAt), 'yyyy-MM-dd') : '알 수 없음'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{req.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg`}>
                        {req.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{Number(req.amount).toLocaleString()}원</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1 w-48">{req.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'APPROVED' ? <CheckCircle className="w-4 h-4"/> : req.status === 'REJECTED' ? <XCircle className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
                        {req.status === 'APPROVED' ? '승인 완료' : req.status === 'REJECTED' ? '반려됨' : '결재 대기중'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleUpdateStatus('expenses', req.id, 'APPROVED')} className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200">
                          승인
                        </button>
                        <button onClick={() => handleUpdateStatus('expenses', req.id, 'REJECTED')} className="text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-200">
                          반려
                        </button>
                        </div>
                      ) : <span className="text-gray-400">처리 완료</span>}
                    </td>
                  </tr>
                ))
              }
              
              {(activeTab === 'LEAVE' && filteredLeaves.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">조회된 휴가 안건이 없습니다.</td></tr>
              )}
              {(activeTab === 'EXPENSE' && filteredExpenses.length === 0) && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">조회된 지출결의 안건이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
