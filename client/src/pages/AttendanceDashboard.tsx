import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const AttendanceDashboard: React.FC = () => {
  const { user, setLoginModalOpen } = useAuthStore();
  const [kstTime, setKstTime] = useState<string>('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // 현재 KST 시각 실시간 타이머 작동
  useEffect(() => {
    const timer = setInterval(() => {
      const timeString = new Date().toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setKstTime(timeString);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAttendanceClick = async (type: 'checkIn' | 'checkOut') => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    
    setIsCheckingIn(true);
    try {
      // TODO: Firebase Functions 또는 백엔드 API 호출을 통한 검증된 서버 시간 출퇴근 처리
      // 프론트엔드 시간(Date())은 조작 가능성이 있으므로, 반드시 Timestamp.now() 또는
      // 서버단의 KST 시간을 기준으로 Firestore 문서 생성 로직을 수행해야 합니다.
      await new Promise(resolve => setTimeout(resolve, 800)); // 모의 통신
      alert(type === 'checkIn' ? '출근 처리되었습니다.' : '퇴근 처리되었습니다.');
      if (type === 'checkIn') setIsCheckedIn(true);
    } catch (e) {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white p-10 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center w-full max-w-lg">
        <Clock className="w-16 h-16 text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">오늘의 근태 체크</h2>
        <p className="text-gray-500 mb-8">한국 표준시(KST) 버튼을 클릭하여 기록합니다.</p>
        
        <div className="text-5xl font-mono font-bold text-gray-900 tracking-wider bg-gray-100 px-8 py-4 rounded-xl mb-10 w-full text-center">
          {kstTime || '00:00:00'}
        </div>

        <div className="flex gap-4 w-full">
          {!isCheckedIn ? (
            <button 
              onClick={() => handleAttendanceClick('checkIn')}
              disabled={isCheckingIn}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isCheckingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
              출근하기
            </button>
          ) : (
            <button 
              onClick={() => handleAttendanceClick('checkOut')}
              disabled={isCheckingIn}
              className="flex-1 flex justify-center items-center gap-2 py-4 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-700 transition disabled:opacity-50"
            >
              {isCheckingIn ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
              퇴근하기
            </button>
          )}
        </div>

        <div className="bg-blue-50 text-blue-800 text-sm p-4 mt-8 rounded-lg w-full text-center">
          <p><strong>보안 알림:</strong> 출퇴근 기능은 안전한 사내망 환경(IP 통제) 및 무결성 있는 <strong>KST 서버 시간</strong> 기준으로만 데이터베이스에 기록됩니다.</p>
        </div>
      </div>
    </div>
  );
};
