import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, CheckCircle, FileText, History, AlertCircle, Send, Loader2, DollarSign, X, Trash2, Edit, Clock, Calendar 
} from 'lucide-react';
import { addDoc, collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';

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
  attachmentName?: string;
  attachmentUrl?: string;
}

export const ExpenseForm: React.FC = () => {
  const { userData, user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('식비/회식대');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // 상세 보기 및 수정 관련 상태
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<ExpenseRequest | null>(null); // 현재 수정 중인 원본 데이터
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const allReqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseRequest));
      // 클라이언트 사이드에서 생성일 기준 내림차순 정렬 (인덱스 에러 방지)
      const sorted = [...allReqs].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRequests(sorted);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Subscribe Error:", error);
      setLoading(false);
      // 권한이나 색인 문제가 있을 경우 alert로 안내
      if (error.code === 'permission-denied') {
        alert("데이터 조회 권한이 없습니다. 관리자에게 문의해 주세요.");
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let attachmentUrl = editingRequest?.attachmentUrl || '';
      let attachmentName = fileName || editingRequest?.attachmentName || '';
      
      // 0. 파일 업로드 로직 (새 파일이 선택된 경우에만)
      if (selectedFile) {
        const fileRef = ref(storage, `expenses/${user?.uid || 'anonymous'}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        attachmentUrl = await getDownloadURL(uploadResult.ref);
        attachmentName = selectedFile.name;
      }

      const payload = {
        userId: user?.uid || userData?.uid || 'UNKNOWN',
        userName: userData?.name || '가입대기(직원)',
        teamId: userData?.teamId || '',
        title,
        amount: Number(amount) || 0,
        date,
        category,
        description,
        attachmentName,
        attachmentUrl,
        status: isEditing ? (editingRequest?.status || 'PENDING') : 'PENDING',
        updatedAt: new Date().toISOString()
      };

      if (isEditing && editingId) {
        // 기존 문서 업데이트
        await updateDoc(doc(db, 'expenses', editingId), payload);
        alert('지출결의서 수정이 완료되었습니다.');
        setIsEditing(false);
        setEditingId(null);
        setEditingRequest(null);
        setSelectedRequest(null); // 수정 성공 후 상세 모달 닫기
      } else {
        // 신규 등록
        await addDoc(collection(db, 'expenses'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setIsSuccess(true);
      }
      
      // 폼 초기화 (수정/신규 공통)
      setTitle('');
      setAmount('');
      setDate('');
      setDescription('');
      setFileName('');
      setSelectedFile(null);
      // selectedRequest는 위에서 이미 처리함
      
    } catch (error) {
      console.error('Submit/Update Error:', error);
      alert('처리 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false); // 로딩 상태 확실히 해제
    }
  };

  const handleEdit = (req: ExpenseRequest) => {
    if (req.status !== 'PENDING') {
      alert('승인 대기 중인 안건만 수정할 수 있습니다.');
      return;
    }
    
    // 수정을 위해 폼 데이터 채우기
    setIsEditing(true);
    setEditingId(req.id);
    setEditingRequest(req); // 원본 데이터 보관
    
    setTitle(req.title);
    setAmount(req.amount.toString());
    setDate(req.date);
    setCategory(req.category);
    setDescription(req.description);
    setFileName(req.attachmentName || '');
    setSelectedFile(null); // 기존 파일은 URL로 유지
    
    // 모달 닫기 (모달을 통해 진입했을 경우)
    setSelectedRequest(null);
    
    // 페이지 상단 폼으로 스크롤 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setEditingRequest(null);
    setTitle('');
    setAmount('');
    setDate('');
    setDescription('');
    setFileName('');
    setSelectedFile(null);
    setSelectedRequest(null);
  };

  const handleDelete = async (id: string, status: string) => {
    if (status !== 'PENDING') {
      alert('승인 대기 중인 안건만 삭제할 수 있습니다.');
      return;
    }
    
    if (!window.confirm('이 신청 건을 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, 'expenses', id));
      alert('삭제되었습니다.');
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (err) {
      alert('삭제 실패: ' + (err as Error).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-600 rounded-lg text-white">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">지출결의 신청</h1>
            </div>
            <p className="text-slate-500 font-medium">증빙 자료(영수증) 업로드가 필수입니다.</p>
          </div>
          
          <div className="glass-card px-8 py-4 rounded-3xl premium-shadow flex items-center gap-6 border-emerald-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Pending</span>
              <span className="text-3xl font-black text-slate-800 tracking-tighter">
                {requests.filter(r => r.status === 'PENDING').length} <span className="text-sm text-slate-400">건</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 신청 폼 */}
          <div className="lg:col-span-12 xl:col-span-5">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -mr-20 -mt-20 transition-transform group-hover:scale-110 duration-700"></div>
              
              {isSuccess ? (
                <div className="py-12 flex flex-col items-center text-center relative z-10">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">신청 완료!</h2>
                  <p className="text-slate-500 mb-8 font-medium">재무 담당자가 확인 후 승인 처리됩니다.</p>
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
                  >
                    추가 신청하기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10 font-sans">
                  <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Send className={`w-5 h-5 ${isEditing ? 'text-indigo-500' : 'text-emerald-500'}`} />
                      {isEditing ? '지출 결의서 수정' : '새 결의서 작성'}
                    </div>
                    {isEditing && (
                      <button 
                         type="button"
                         onClick={handleCancelEdit}
                         className="text-xs font-black text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                      >
                         <X className="w-3.5 h-3.5" /> 수정 취소
                      </button>
                    )}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">지출 항목명</label>
                      <input 
                        type="text" required
                        value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 3월 본부 회식비"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">분류</label>
                      <select 
                        value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      >
                        <option value="식비/회식대">식비/회식대</option>
                        <option value="교통/출장비">교통/출장비</option>
                        <option value="비품/소모품">비품/소모품</option>
                        <option value="접대/미팅비">접대/미팅비</option>
                        <option value="기타">기타 비용</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">금액 (원)</label>
                      <div className="relative">
                        <input 
                          type="number" required min="1"
                          value={amount} onChange={(e) => setAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-black text-slate-800 text-lg"
                        />
                        <DollarSign className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">결제일</label>
                      <input 
                        type="date" required
                        value={date} onChange={(e) => setDate(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">상세 내역</label>
                    <textarea 
                      required rows={3}
                      value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="참여자 및 목적을 간단히 적어주세요."
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-semibold text-slate-700 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">증빙 자료</label>
                     <label className="flex items-center justify-center w-full h-32 px-4 transition-all bg-slate-50 border-2 border-slate-100 border-dashed rounded-[2rem] cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 group/upload">
                        <div className="flex flex-col items-center gap-2">
                           <UploadCloud className="w-8 h-8 text-slate-300 group-hover/upload:text-emerald-500 transition-colors" />
                           <span className="text-xs font-black text-slate-400 group-hover/upload:text-emerald-600">
                             {fileName ? fileName : '영수증 이미지 또는 PDF 파일 업로드'}
                           </span>
                        </div>
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                     </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full py-5 text-white font-black rounded-3xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 ${
                       isEditing ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : (
                      <>
                        <span>{isEditing ? '결의서 수정 완료' : '지출결의 제출'}</span>
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* 신청 내역 */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 h-full overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    <History className="w-7 h-7 text-emerald-500" />
                    나의 신청 내역
                  </h2>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Updates</div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full min-w-[600px]">
                    <thead>
                       <tr className="text-left">
                          <th className="pb-6 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] px-4">분류 / 날짜</th>
                          <th className="pb-6 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] px-4">항목명 / 상세</th>
                          <th className="pb-6 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] px-4 text-right">청구 금액</th>
                          <th className="pb-6 font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] px-4 text-center">상태</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-sans">
                       {requests.map((req) => (
                          <tr 
                            key={req.id} 
                            onClick={() => setSelectedRequest(req)}
                            className="group hover:bg-slate-50/80 transition-all duration-300 cursor-pointer"
                          >
                             <td className="py-6 px-4">
                                <div className="text-xs font-black text-emerald-600 mb-1">{req.category}</div>
                                <div className="text-[10px] font-bold text-slate-400">{req.date}</div>
                             </td>
                             <td className="py-6 px-4">
                                <div className="text-sm font-black text-slate-800">{req.title}</div>
                                <div className="text-[10px] font-medium text-slate-400 mt-1 line-clamp-1">{req.description}</div>
                             </td>
                             <td className="py-6 px-4 text-right">
                                <span className="text-sm font-black text-slate-900 italic">₩ {req.amount.toLocaleString()}</span>
                             </td>
                             <td className="py-6 px-4">
                                <div className="flex justify-center">
                                   <span className={`flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-full ${
                                      req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                                      req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                                      'bg-amber-50 text-amber-600'
                                   }`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                         req.status === 'APPROVED' ? 'bg-emerald-500' :
                                         req.status === 'REJECTED' ? 'bg-rose-500' :
                                         'bg-amber-500 animate-pulse'
                                      }`} />
                                      {req.status === 'APPROVED' ? '승인' : 
                                       req.status === 'REJECTED' ? '반려' : '대기'}
                                   </span>
                                </div>
                             </td>
                          </tr>
                       ))}
                       {requests.length === 0 && !loading && (
                          <tr>
                             <td colSpan={4} className="py-32 text-center">
                                <div className="flex flex-col items-center gap-3">
                                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                      <History className="w-8 h-8 text-slate-200" />
                                   </div>
                                   <p className="text-slate-400 text-sm font-black">신청 내역이 없습니다.</p>
                                </div>
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>

        {/* 안내 배너 */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden premium-shadow">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="flex flex-col md:flex-row gap-8 relative z-10">
             <div className="w-16 h-16 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center shrink-0 border border-emerald-500/30">
               <AlertCircle className="w-8 h-8 text-emerald-400" />
             </div>
             <div>
               <h3 className="text-xl font-black mb-3 tracking-tight">지출결의 보안 및 규정 안내</h3>
               <p className="text-slate-400 leading-relaxed font-medium max-w-3xl">
                 모든 지출 결의는 전자증빙(영수증) 첨부가 원칙이며, 허위 신청 시 징계 조치의 대상이 될 수 있습니다. 
                 결제 후 7일 이내 신청을 권장하며, 개인 용도의 지출은 승인을 거부당할 수 있음을 유의하시기 바랍니다.
               </p>
             </div>
          </div>
        </div>

      </div>

      {/* 나의 신청 상세 정보 모달 */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
              {/* Modal Header */}
              <div className="p-10 border-b border-slate-50 flex justify-between items-start">
                 <div className="space-y-4">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                       Expense Application Detail
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">지출결의 상세서</h2>
                    <div className="flex items-center gap-4 text-slate-400">
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold">
                          <Calendar className="w-3.5 h-3.5" /> {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), 'yyyy.MM.dd') : '-'}
                       </div>
                    </div>
                 </div>
                 <button 
                  onClick={() => setSelectedRequest(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-900 transition-all"
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>

              {/* Modal Body */}
              <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto premium-scrollbar">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">신청 분류</span>
                       <div className="p-4 bg-slate-50 rounded-2xl font-black text-slate-700 border border-slate-100">
                          {selectedRequest.category}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">최종 결제 금액</span>
                       <div className="p-4 rounded-2xl font-black border bg-emerald-50 text-emerald-600 border-emerald-100">
                          ₩ {Number(selectedRequest.amount).toLocaleString()}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">상세 내역</span>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 min-h-[100px]">
                       <p className="text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">{selectedRequest.description || selectedRequest.title}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <Clock className="w-5 h-5 text-amber-500 animate-spin-slow" />
                    <div>
                       <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Status</p>
                       <p className="text-xs font-bold text-amber-600">이 건은 현재 <span className="underline">{selectedRequest.status === 'PENDING' ? '검토 중' : selectedRequest.status === 'APPROVED' ? '최종 승인' : '반려'}</span> 상태입니다.</p>
                    </div>
                 </div>

                 {/* 첨부파일 섹션 */}
                 <div className="space-y-4 pt-6 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">첨부 증빙 자료 (Attachments)</span>
                    
                    {selectedRequest.attachmentUrl ? (
                       <>
                          {(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => selectedRequest.attachmentUrl?.toLowerCase().includes(ext)) || 
                            selectedRequest.attachmentUrl?.includes('image%2F')) && (
                             <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                                <img 
                                   src={selectedRequest.attachmentUrl} 
                                   alt="Attachment Preview" 
                                   className="w-full h-auto max-h-[300px] object-contain cursor-pointer"
                                   onClick={() => window.open(selectedRequest.attachmentUrl, '_blank')}
                                />
                             </div>
                          )}

                          <div className="flex items-center justify-between p-5 bg-white border-2 border-emerald-50 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group/file">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover/file:bg-emerald-600 group-hover/file:text-white transition-all">
                                   <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="text-sm font-black text-slate-800 truncate">{selectedRequest.attachmentName || '첨부 파일'}</p>
                                </div>
                             </div>
                             <button 
                                onClick={() => window.open(selectedRequest.attachmentUrl, '_blank')}
                                className="px-5 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 shrink-0 ml-4"
                             >
                                Download / View
                             </button>
                          </div>
                       </>
                    ) : (
                       <div className="p-10 border-2 border-slate-100 border-dashed rounded-3xl flex flex-col items-center gap-3 text-slate-300 bg-slate-50/30">
                          <AlertCircle className="w-8 h-8 opacity-20" />
                          <p className="text-xs font-bold italic">첨부된 증빙 서류가 없습니다.</p>
                       </div>
                    )}
                 </div>
              </div>

              {/* Modal Footer */}
              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                 <button 
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-[0.2em] text-xs"
                 >
                    Close
                 </button>
                 {selectedRequest.status === 'PENDING' && (
                    <>
                       <button 
                        onClick={() => handleDelete(selectedRequest.id, selectedRequest.status)}
                        className="p-5 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                        title="신청 취소"
                       >
                          <Trash2 className="w-6 h-6" />
                       </button>
                       <button 
                        onClick={() => handleEdit(selectedRequest)}
                        className="flex-[1.5] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                       >
                          <Edit className="w-4 h-4" />
                          <span>Modify Record</span>
                       </button>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
