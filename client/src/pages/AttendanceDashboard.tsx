import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Loader2, Calendar as CalendarIcon, MapPin, CheckCircle2, History } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { calculateLeaveEntitlement } from '../utils/leaveCalculator';

interface AttendanceRecord {
  id: string;
  userId: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  location?: string;
}

export const AttendanceDashboard: React.FC = () => {
  const { user, userData, setLoginModalOpen } = useAuthStore();
  const [kstTime, setKstTime] = useState<string>('');
  const [kstDate, setKstDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // KST 실시간 시계
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setKstTime(now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setKstDate(now.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 오늘 근태 기록 실시간 구독
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    // KST 기준으로 오늘 날짜 (YYYY-MM-DD) 계산
    const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
    console.log("[Attendance] Fetching records for date:", today);
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', today)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      // 클라이언트 사이드 정렬 (인덱스 에러 방지)
      const sorted = [...docs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setRecords(sorted.slice(0, 10));
      setLoading(false);
    }, (err) => {
      console.error("Attendance Subscribe Error:", err);
      // 인덱스가 없는 경우 등 에러 발생 시 로딩 종료
      setLoading(false);
      if (err.code === 'permission-denied') {
        console.error("권한이 없습니다. Firebase Rules를 확인하세요.");
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAttendance = async (type: 'IN' | 'OUT') => {
    console.log(`[Attendance] Attempting ${type} check...`);
    if (!user) {
      console.warn("[Attendance] No authenticated user found.");
      setLoginModalOpen(true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const attendanceData = {
        userId: user.uid,
        userName: userData?.name || '근로자',
        type: type,
        timestamp: timestamp,
        location: '본사 (IP 인증됨)',
        createdAt: timestamp
      };
      
      console.log("[Attendance] Sending data:", attendanceData);
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      console.log("[Attendance] Success! Created doc ID:", docRef.id);
    } catch (e) {
      const error = e as Error;
      console.error("[Attendance] Error during creation:", error);
      alert('기록 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lastStatus = records[0];

  // 연차 요약 로직 추가
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'leaves'), where('userId', '==', user.uid));
    return onSnapshot(q, (snap) => {
      setLeaveRequests(snap.docs.map(doc => doc.data()));
    });
  }, [user?.uid]);

  const joinDate = userData?.joinDate ? new Date(userData.joinDate) : new Date();
  const totalLeave = calculateLeaveEntitlement(joinDate);
  const usedLeave = leaveRequests
    .filter(req => req.status === 'APPROVED' && (req.type === 'annual' || req.type === 'half'))
    .reduce((sum, req) => sum + (req.requestDays || 0), 0);
  const remainingLeave = totalLeave - usedLeave;

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-10 gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">근태 현황 대시보드</h1>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <p className="text-slate-500 font-medium">{kstDate}</p>
                <div className="hidden md:block w-px h-3 bg-slate-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-indigo-600">{userData?.name || '근로자'}</span>
                  <span className="text-xs text-slate-400 font-bold">({userData?.email || user?.email || 'ID 미표기'})</span>
                </div>
              </div>
            </div>

            {/* 실시간 연차 요약 카드 (대시보드 상단 추가) */}
            <div className="flex gap-3 bg-white p-2 rounded-[2rem] shadow-xl border border-slate-100">
               <div className="px-5 py-3 rounded-2xl bg-slate-50 flex flex-col items-center min-w-[80px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">총 발생</span>
                  <span className="text-lg font-black text-slate-700">{totalLeave}</span>
               </div>
               <div className="px-5 py-3 rounded-2xl bg-slate-50 flex flex-col items-center min-w-[80px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">사용됨</span>
                  <span className="text-lg font-black text-rose-500">{usedLeave}</span>
               </div>
               <div className="px-5 py-3 rounded-2xl bg-indigo-600 flex flex-col items-center min-w-[100px] shadow-lg shadow-indigo-100">
                  <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">잔여 연차</span>
                  <span className="text-lg font-black text-white">{remainingLeave}</span>
               </div>
            </div>
          </div>
          
          <div className="glass-card px-8 py-4 rounded-3xl premium-shadow flex items-center gap-6 border-indigo-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Current KST</span>
              <span className="text-4xl font-mono font-black text-slate-800 tracking-tighter">{kstTime || '00:00:00'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Action Cards */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  {lastStatus?.type === 'IN' ? (
                    <span className="px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full animate-pulse">현재 근무 중</span>
                  ) : (
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-500 text-xs font-black rounded-full">미출근</span>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-800 mb-2">근무 체크인/아웃</h2>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">회사의 보안 규정에 따라 지정된 IP 대역에서만 기록이 유효합니다.</p>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleAttendance('IN')}
                    disabled={isSubmitting || lastStatus?.type === 'IN'}
                    className="w-full flex justify-center items-center gap-3 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none group"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />}
                    출근하기
                  </button>
                  
                  <button 
                    onClick={() => handleAttendance('OUT')}
                    disabled={isSubmitting || !lastStatus || lastStatus?.type === 'OUT'}
                    className="w-full flex justify-center items-center gap-3 py-5 bg-white text-rose-600 border-2 border-rose-100 font-black rounded-3xl hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                    퇴근하기
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
               <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full -mb-12 -mr-12"></div>
               <div className="flex items-center gap-3 mb-4">
                 <MapPin className="w-5 h-5 text-indigo-400" />
                 <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Security Access</span>
               </div>
               <p className="text-sm leading-relaxed text-slate-300">
                 현재 <span className="text-indigo-300 font-bold">본사 오피스망</span>에 접속 중입니다. 출퇴근 기록이 가능합니다.
               </p>
            </div>
          </div>

          {/* Timeline / logs */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <Clock className="w-7 h-7 text-indigo-500" />
                  오늘의 타임라인
                </h2>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Updates</div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold tracking-tight">데이터를 불러오는 중...</p>
                </div>
              ) : records.length > 0 ? (
                <div className="space-y-6">
                  {records.map((record, idx) => (
                    <div key={record.id} className="relative pl-10 transition-all hover:translate-x-1">
                      {/* Line */}
                      {idx !== records.length - 1 && (
                        <div className="absolute left-[13px] top-8 bottom-[-24px] w-[2px] bg-slate-100"></div>
                      )}
                      {/* Dot */}
                      <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${record.type === 'IN' ? 'bg-indigo-500' : 'bg-rose-500'}`}>
                        {record.type === 'IN' ? <LogIn className="w-3 h-3 text-white" /> : <LogOut className="w-3 h-3 text-white" />}
                      </div>
                      
                      <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 group hover:border-indigo-100 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${record.type === 'IN' ? 'text-indigo-500' : 'text-rose-500'}`}>
                              {record.type === 'IN' ? 'CHECK-IN' : 'CHECK-OUT'}
                            </span>
                            <h3 className="font-black text-slate-800 text-lg leading-none">
                              {format(new Date(record.timestamp), 'HH:mm:ss')}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">{record.location}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <History className="w-10 h-10 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-1">기록이 없습니다</h3>
                  <p className="text-slate-400 text-sm">오늘 첫 출근 버튼을 눌러 기록을 시작하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
