import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, FileText, History, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { addDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';

interface ExpenseRequest {
  id: string;
  userId: string;
  userName: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const ExpenseForm: React.FC = () => {
  const { userData, user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('식비');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'expenses'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const allReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseRequest));
      setRequests(allReqs.filter(req => req.userId === (user?.uid || userData?.uid)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, userData?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Firestore Document 생성 (expenses)
      await addDoc(collection(db, 'expenses'), {
        userId: user?.uid || userData?.uid || 'UNKNOWN',
        userName: userData?.name || '가입대기(직원)',
        title: title || '',
        amount: Number(amount) || 0,
        date: date || '',
        category: category || '',
        description: description || '',
        status: 'PENDING',
        createdAt: new Date().toISOString()
      });
      
      // API 콜 모방 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSuccess(true);
      
      // 폼 초기화
      setTitle('');
      setAmount('');
      setDate('');
      setDescription('');
      setFileName('');
      
    } catch (error) {
      console.error('Failed to submit expense request:', error);
      alert('제출 중 오류가 발생했습니다. 로그를 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col min-h-screen items-center">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl overflow-hidden mt-6">
        
        <div className="bg-emerald-600 p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileText className="w-7 h-7" />
            새 지출결의 신청
          </h1>
          <p className="text-emerald-100 text-sm">재무부서 확인 후 승인 처리됩니다.</p>
        </div>

        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">신청이 접수되었습니다!</h2>
            <p className="text-gray-500 mb-6">
              제출하신 지출결의(결재 대기: PENDING_FINANCE 상태)는 1차 재무담당자 검토 후 본부장 최종 승인을 거쳐 처리될 예정입니다.
            </p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
            >
              새로 신청하기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">지출 항목명 (Title) <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 3월 본부 회식비"
                  className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">결제일 (Date) <span className="text-red-500">*</span></label>
                <input 
                  type="date" required
                  value={date} onChange={(e) => setDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">지출 분류 (Category) <span className="text-red-500">*</span></label>
                <select 
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="식대">식비/회식대</option>
                  <option value="교통비">교통/출장비</option>
                  <option value="비품">소모품/비품 구매</option>
                  <option value="접대비">외부 미팅/접대비</option>
                  <option value="기타">기타 비용</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">청구 금액 (Amount) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input 
                    type="number" required min="1"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="예: 50000"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-2 text-gray-500 font-medium">원</span>
                </div>
              </div>

            </div>

            <div className="flex flex-col mt-4">
              <label className="text-sm font-semibold text-gray-700 mb-1">상세 내역 (1,000자 이내) <span className="text-red-500">*</span></label>
              <textarea 
                required rows={4} maxLength={1000}
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="지출 목적 및 참여자(있을 경우) 등 상세 내역을 적어주세요."
                className="px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-col mt-4">
              <label className="text-sm font-semibold text-gray-700 mb-1">영수증 첨부 (Attachment)</label>
              <label className="flex items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-emerald-500 focus:outline-none">
                <span className="flex items-center space-x-2">
                  <UploadCloud className="w-6 h-6 text-gray-400" />
                  <span className="font-medium text-gray-500">
                    {fileName ? fileName : '클릭하여 이미지 또는 PDF 업로드'}
                  </span>
                </span>
                <input type="file" name="file_upload" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t mt-6">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSubmitting ? '업로드 중...' : '지출결의 제출하기'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 신청 내역 */}
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl overflow-hidden mt-8 p-6 mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-500" />
          최근 신청 내역
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">분류</th>
                <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">항목명 / 내역</th>
                <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">금액</th>
                <th className="pb-4 font-bold text-gray-400 text-xs uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => (
                <tr key={req.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600">
                      {req.category}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="text-sm font-medium text-gray-700">
                      {req.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] line-clamp-1">{req.date} {req.description}</div>
                  </td>
                  <td className="py-4">
                    <span className="text-sm font-bold text-gray-900">{req.amount.toLocaleString()}원</span>
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
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-400 text-sm">
                    최근 신청 내역이 없습니다.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-gray-400 text-sm">
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
