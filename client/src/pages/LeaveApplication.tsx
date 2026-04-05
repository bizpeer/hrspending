import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Send, Loader2, History } from 'lucide-react';
import { collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { calculateLeaveEntitlement } from '../utils/leaveCalculator';
import { format, parseISO, differenceInDays } from 'date-fns';

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'annual' | 'half' | 'sick' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  requestDays: number;
}

export const LeaveApplication: React.FC = () => {
  const { userData, user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<{
    type: 'annual' | 'half' | 'sick' | 'other';
    startDate: string;
    endDate: string;
    reason: string;
  }>({
    type: 'annual',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  // 연차 계산
  const joinDate = userData?.joinDate ? new Date(userData.joinDate) : new Date();
  const totalLeave = calculateLeaveEntitlement(joinDate);
  const usedLeave = userData?.usedLeave || 0;
  const remainingLeave = totalLeave - usedLeave;

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'leaves'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
      // 클라이언트 사이드 필터링 (Firestore 인덱스 에러 방지)
      setRequests(allReqs.filter(req => req.userId === (user?.uid || userData?.uid)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setLoading(false);
      alert("휴가 정보를 불러오는 데 권한/인덱스 에러가 발생했습니다. 로그아웃 후 다시 접속해 주세요.");
    });

    return () => unsubscribe();
  }, [user?.uid, userData?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    // 날짜 차이 계산 (연차 일수)
    const start = parseISO(formData.startDate);
    const end = parseISO(formData.endDate);
    const days = formData.type === 'half' ? 0.5 : differenceInDays(end, start) + 1;

    if (days <= 0) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    if ((formData.type === 'annual' || formData.type === 'half') && days > remainingLeave) {
      alert("잔여 연차가 부족합니다.");
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, 'leaves'), {
        userId: user?.uid || userData?.uid || 'UNKNOWN',
        userName: userData?.name || '가입대기(직원)',
        type: formData.type || 'annual',
        startDate: formData.startDate || '',
        endDate: formData.endDate || '',
        reason: formData.reason || '',
        status: 'PENDING',
        requestDays: days || 0,
        createdAt: new Date().toISOString()
      });
      
      alert("휴가 신청이 완료되었습니다.");
      setFormData({
        ...formData,
        reason: ''
      });
    } catch (err) {
      alert("신청 실패: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-indigo-600" />
              내 휴가 및 근태 관리
            </h1>
            <p className="text-gray-500 mt-1">대한민국 근로기준법에 따른 연차 산정 및 신청</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-gray-400 uppercase mb-1">총 발생</span>
              <span className="text-xl font-black text-gray-800">{totalLeave} <span className="text-sm font-normal">일</span></span>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-gray-400 uppercase mb-1">사용 완료</span>
              <span className="text-xl font-black text-rose-500">{usedLeave} <span className="text-sm font-normal">일</span></span>
            </div>
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg border border-indigo-500 flex flex-col items-center min-w-[100px]">
              <span className="text-xs font-bold text-indigo-200 uppercase mb-1">잔여 연차</span>
              <span className="text-xl font-black text-white">{remainingLeave} <span className="text-sm font-normal">일</span></span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 신청 폼 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 relative z-10">
                <Send className="w-5 h-5 text-indigo-500" />
                휴가 신청하기
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">휴가 종류</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="annual">연차 휴가</option>
                    <option value="half">반차 (0.5일)</option>
                    <option value="sick">병가</option>
                    <option value="other">기타 (경조사 등)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">시작일</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">종료일</label>
                    <input 
                      type="date" 
                      disabled={formData.type === 'half'}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                      value={formData.type === 'half' ? formData.startDate : formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">사유</label>
                  <textarea 
                    rows={3}
                    placeholder="휴가 사유를 입력하세요"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    value={formData.reason}
                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "신청서 제출"}
                </button>
              </form>
            </div>
          </div>

          {/* 신청 내역 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                최근 신청 내역
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-gray-50">
                      <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">종류</th>
                      <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">기간</th>
                      <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">일수</th>
                      <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {requests.map((req) => (
                      <tr key={req.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            req.type === 'annual' ? 'bg-indigo-50 text-indigo-600' :
                            req.type === 'half' ? 'bg-amber-50 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {req.type === 'annual' ? '연차' :
                             req.type === 'half' ? '반차' :
                             req.type === 'sick' ? '병가' : '기타'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="text-sm font-medium text-gray-700">
                            {req.startDate} {req.type !== 'half' && `~ ${req.endDate}`}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{req.reason}</div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm font-bold text-gray-900">{req.requestDays}일</span>
                        </td>
                        <td className="py-4">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${
                            req.status === 'APPROVED' ? 'text-emerald-500' :
                            req.status === 'REJECTED' ? 'text-rose-500' :
                            'text-amber-500'
                          }`}>
                            {req.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                             req.status === 'REJECTED' ? <AlertCircle className="w-3.5 h-3.5" /> : 
                             <Clock className="w-3.5 h-3.5" />}
                            {req.status === 'APPROVED' ? '승인완료' : 
                             req.status === 'REJECTED' ? '반려' : '대기중'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-gray-400 text-sm">
                          최근 신청 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 안내 배너 */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">💡 연차 산정 기준 안내</p>
                <p className="opacity-90">당사 근태 규정은 대한민국 근로기준법을 준수합니다. 1년 미만 근속자는 매월 개근 시 1일이 발생하며, 1년 이상 근속 시 연 15일의 연차가 발생합니다. (매 2년 근속 시 1일 가산)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
