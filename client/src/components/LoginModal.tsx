import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, X, Settings } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setLoginModalOpen } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 아이디를 이메일 형식으로 자동 변환 (가상 이메일 시스템)
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@internal.com`;
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      setLoginModalOpen(false); // 로그인 성공 시 모달 닫기
    } catch (err: any) {
      setError('아이디(이메일) 혹은 비밀번호가 틀렸거나 문제가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 마스터 어드민 시딩 (최초 1회용 자동생성)
  const handleSeedMasterAdmin = async () => {
    const adminEmail = "bizpeer@internal.com";
    const adminPassword = "123456";

    try {
      setLoading(true);
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const uid = userCredential.user.uid;
      
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: adminEmail,
        name: '최고 관리자',
        role: 'ADMIN',
        teamHistory: []
      });
      alert(`초기 마스터 관리자 계정이 생성되었습니다.\nID: bizpeer\nPW: ${adminPassword}`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        alert("이미 관리자 계정이 생성되어 있습니다.");
      } else {
        alert("생성 실패: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={() => setLoginModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              <span className="text-indigo-600">HR Flow</span> 로그인
            </h2>
            <p className="text-gray-500">계속하시려면 로그인해주세요</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">아이디 또는 이메일</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="아이디 또는 email@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? '인증 중...' : '로그인'}
            </button>
          </form>
          
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              최초 로그인 시 비밀번호 변경 요망
            </p>
            <button 
              onClick={handleSeedMasterAdmin}
              className="text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-1.5 px-2 py-1 hover:bg-indigo-50 rounded-lg transition-all font-medium"
              title="마스터 계정 초기화"
            >
              <Settings className="w-4 h-4" />
              마스터 설정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
