import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Loader2, Calendar as CalendarIcon, MapPin, CheckCircle2, History } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isSameMonth } from 'date-fns';
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

  // 캘린더 및 관리자 조회용 상태
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // 초기 selectedUserId 설정
  useEffect(() => {
    if (user?.uid && !selectedUserId) {
      setSelectedUserId(user.uid);
    }
  }, [user?.uid, selectedUserId]);

  // 관리자일 경우 전체 사용자 목록 페칭
  useEffect(() => {
    if (userData?.role === 'ADMIN') {
      const q = query(collection(db, 'UserProfile'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [userData?.role]);

  // 선택된 사용자의 월별 근태 기록 구독
  useEffect(() => {
    if (!selectedUserId) return;

    setMonthlyLoading(true);
    // KST 기준 월 시작/종료 계산
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();

    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', selectedUserId),
      where('timestamp', '>=', start),
      where('timestamp', '<=', end)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setMonthlyRecords(docs);
      setMonthlyLoading(false);
    }, (err) => {
      console.error("Monthly Attendance Error:", err);
      setMonthlyLoading(false);
    });

    return () => unsubscribe();
  }, [selectedUserId, currentMonth]);

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

    // [수정] KST 기준 오늘의 시작 시각(00:00:00)을 UTC ISO 문자열로 변환
    // 한국 시간 00:00:00은 UTC 시간으로 전일 15:00:00입니다.
    const now = new Date();
    const kstDateStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(now);
    const kstStartOfDay = new Date(`${kstDateStr}T00:00:00+09:00`);
    const startOfKstDayISO = kstStartOfDay.toISOString();
    
    console.log("[Attendance] Fetching records starting from KST 00:00 (UTC):", startOfKstDayISO);
    
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', startOfKstDayISO)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      // 클라이언트 사이드 정렬
      const sorted = [...docs].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setRecords(sorted.slice(0, 10));
      setLoading(false);
    }, (err) => {
      console.error("Attendance Subscribe Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, userData]); // userData를 추가하여 권한 변경 시 재로드 유도

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
        location: '본사',
        createdAt: timestamp
      };
      
      console.log("[Attendance] Sending data:", attendanceData);
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      console.log("[Attendance] Success! Created doc ID:", docRef.id);

      // 낙관적 업데이트: Firestore 리스너가 트리거되기 전에 UI에 즉시 반영
      const newRecord: AttendanceRecord = {
        id: docRef.id,
        ...attendanceData
      };
      setRecords(prev => {
        // 이미 리스너에 의해 추가되었을 수도 있으므로 ID 중복 체크
        if (prev.some(r => r.id === docRef.id)) return prev;
        const updated = [newRecord, ...prev];
        return updated.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
      });
    } catch (e) {
      const error = e as Error;
      console.error("[Attendance] Error during creation:", error);
      alert('기록 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lastStatus = records[0];
  const hasCheckedInToday = records.some(r => r.type === 'IN');
  const hasCheckedOutToday = records.some(r => r.type === 'OUT');

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
    <div className="flex-1 p-2 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-6 gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Action Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100 relative overflow-hidden group flex-1">
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
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">회사의 보안 규정에 따라 지정된 구역에서만 기록이 유효합니다.</p>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleAttendance('IN')}
                    disabled={isSubmitting || hasCheckedInToday}
                    className="w-full flex justify-center items-center gap-3 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:pointer-events-none group"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />}
                    {hasCheckedInToday ? '출근 완료' : '출근하기'}
                  </button>
                  
                  <button 
                    onClick={() => handleAttendance('OUT')}
                    disabled={isSubmitting || !hasCheckedInToday || hasCheckedOutToday}
                    className="w-full flex justify-center items-center gap-3 py-5 bg-white text-rose-600 border-2 border-rose-100 font-black rounded-3xl hover:bg-rose-50 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none group"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                    {hasCheckedOutToday ? '퇴근 완료' : '퇴근하기'}
                  </button>
                </div>
              </div>
            </div>

            {/* Security Access 박스 제거됨 */}
          </div>

          {/* Timeline / logs */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-5 border border-slate-100 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                  <Clock className="w-7 h-7 text-indigo-500" />
                  오늘의 타임라인
                </h2>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Updates</div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300">
                  <Loader2 className="w-10 h-10 animate-spin mb-3" />
                  <p className="font-bold tracking-tight text-sm">데이터를 불러오는 중...</p>
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

            {/* [NEW] 월별 근태 캘린더 (Red Box 영역) */}
            <div className="mt-4 bg-white rounded-[2.5rem] shadow-xl p-5 border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <CalendarIcon className="w-6 h-6 text-indigo-500" />
                    월별 근태 현황
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                    Monthly Performance
                  </p>
                  {monthlyLoading && (
                    <div className="flex items-center gap-2 mt-2 text-indigo-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[10px] font-bold">로딩 중...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* 관리자 전용 사용자 선택 */}
                  {userData?.role === 'ADMIN' && (
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {allUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  )}

                  {/* 월 이동 네비게이션 */}
                  <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    >
                      <History className="w-4 h-4 text-slate-600 rotate-180" />
                    </button>
                    <span className="px-4 text-sm font-black text-slate-800 min-w-[90px] text-center">
                      {format(currentMonth, 'yyyy. MM')}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    >
                      <History className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 캘린더 그리드 */}
              <div className="mb-6">
                <div className="grid grid-cols-7 mb-2 border-b border-slate-50 pb-2">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* 시작 요일 맞추기 위한 빈 공간 */}
                  {Array.from({ length: startOfWeek(startOfMonth(currentMonth)).getDay() === 0 ? startOfWeek(startOfMonth(currentMonth)).getDay() : startOfWeek(startOfMonth(currentMonth)).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  ))}
                  
                  {eachDayOfInterval({
                    start: startOfMonth(currentMonth),
                    end: endOfMonth(currentMonth)
                  }).map((day) => {
                    const dayRecords = monthlyRecords.filter(r => isSameDay(new Date(r.timestamp), day));
                    const hasCheckIn = dayRecords.some(r => r.type === 'IN');
                    const hasCheckOut = dayRecords.some(r => r.type === 'OUT');
                    const isTodayLocal = isToday(day);
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <div 
                        key={day.toString()}
                        className={`aspect-square relative flex items-center justify-center rounded-2xl transition-all border ${
                          isTodayLocal ? 'border-indigo-200 bg-indigo-50' : 'border-transparent hover:bg-slate-50'
                        } ${!isCurrentMonth ? 'opacity-20' : ''}`}
                      >
                        <span className={`text-sm font-bold ${
                          isTodayLocal ? 'text-indigo-600' : 'text-slate-700'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        
                        {/* 출근 인디케이터 (파란색) */}
                        {hasCheckIn && (
                          <div className="absolute top-1.5 right-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-200"></div>
                          </div>
                        )}
                        {/* 퇴근 인디케이터 */}
                        {hasCheckOut && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <div className="w-1.5 h-1.5 bg-rose-400 rounded-full shadow-sm shadow-rose-100"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 월별 통계 요약 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="text-center md:border-r border-slate-200 last:border-0 px-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">근무일수</p>
                  <p className="text-lg font-black text-slate-700">
                    {new Set(monthlyRecords.filter(r => r.type === 'IN').map(r => format(new Date(r.timestamp), 'yyyy-MM-dd'))).size}일
                  </p>
                </div>
                <div className="text-center md:border-r border-slate-200 last:border-0 px-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">정시퇴근</p>
                  <p className="text-lg font-black text-emerald-500">
                    {monthlyRecords.filter(r => r.type === 'OUT').length}회
                  </p>
                </div>
                <div className="text-center md:border-r border-slate-200 last:border-0 px-2">
                  <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">연차사용</p>
                  <p className="text-lg font-black text-indigo-600">0일</p>
                </div>
                <div className="text-center px-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">지각</p>
                  <p className="text-lg font-black text-rose-500">0회</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
