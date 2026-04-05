import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';
import { 
  doc, setDoc, collection, getDocs, query, limit, updateDoc, addDoc, where, deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, X, Settings, Loader2, KeyRound, CheckCircle2, UserPlus } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setLoginModalOpen, userData } = useAuthStore();
  
  // 로그인 관련
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'IDLE' | 'CHECKING' | 'RECOVERING'>('IDLE');

  // 비밀번호 변경 관련
  const [isChangeMode, setIsChangeMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  // 마스터 어드민 자동 시딩 및 비밀번호 변경 체크
  useEffect(() => {
    const checkStatus = async () => {
      if (!isLoginModalOpen) return;
      
      try {
        setIsInitializing(true);
        const q = query(collection(db, 'UserProfile'), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log("No users found. Seeding master admin...");
          await handleSeedMasterAdmin(true); 
        }
      } catch (err) {
        console.error("Initialization check failed:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    checkStatus();
  }, [isLoginModalOpen]);

  // 로그인 성공 후 mustChangePassword 상태 감시
  useEffect(() => {
    if (userData?.mustChangePassword) {
      setIsChangeMode(true);
    } else {
      setIsChangeMode(false);
    }
  }, [userData]);

  if (!isLoginModalOpen) return null;

  // 자동 계정 생성 로직 (관리자 사전 등록 직원)
  const handleAutoRegistration = async (loginEmail: string, loginPass: string) => {
    setAuthStatus('RECOVERING');
    try {
      // 1. UserProfile에서 해당 이메일의 유저 검색 (이미 소문자화됨)
      const q = query(collection(db, 'UserProfile'), where('email', '==', loginEmail), limit(1));
      const snaps = await getDocs(q);

      if (snaps.empty) {
        throw new Error("가입되지 않은 이메일입니다. 관리자에게 문의하세요.");
      }

      const preRegisteredUser = snaps.docs[0].data();
      const oldDocId = snaps.docs[0].id;

      // 2. 초기 비밀번호가 123456인지 확인 (보안)
      if (loginPass !== '123456') {
        throw new Error("계정 활성화를 위해 초기 비밀번호(123456)를 입력해주세요.");
      }

      // 3. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPass);
      const newUid = userCredential.user.uid;

      // 4. 데이터 이전 (임시 문서 -> 실제 UID 문서)
      await setDoc(doc(db, 'UserProfile', newUid), {
        ...preRegisteredUser,
        uid: newUid,
        email: loginEmail, // 확실히 소문자로 저장
        mustChangePassword: true,
        activatedAt: new Date().toISOString()
      });

      // 5. 이전 임시 문서 삭제 (ID가 실제 UID와 다를 경우만)
      if (oldDocId !== newUid) {
        await deleteDoc(doc(db, 'UserProfile', oldDocId));
      }

      console.log("Auto-registration success for:", loginEmail);
    } catch (err: any) {
      setError(err.message);
      console.error("Auto-registration failed:", err);
      setLoading(false);
    } finally {
      setAuthStatus('IDLE');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let loginEmail = email.trim().toLowerCase(); // 소문자 표준화
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@internal.com`;
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail, password);
      
      // 로그인 성공 시 로딩 해제 (비밀번호 변경이 필요 없는 경우 모달 닫기)
      setLoading(false);
      const user = auth.currentUser;
      if (user) {
        setTimeout(() => {
          const currentData = useAuthStore.getState().userData;
          if (currentData && !currentData.mustChangePassword) {
            setLoginModalOpen(false);
          }
        }, 500);
      }
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.error("Critical Permission Denied - check firestore.rules for UserProfile list access.");
        setError('시스템 권한 설정 문제로 인해 본인 인증을 수행할 수 없습니다. 관리자에게 문의해 주세요.');
        setLoading(false);
        return;
      }
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        console.log("Account not found in Auth. Checking DB for pre-registration...");
        await handleAutoRegistration(loginEmail, password);
      } else {
        setError('로그인 실패: 아이디 혹은 비밀번호를 확인해 주세요.');
        console.error(err);
        setLoading(false);
      }
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("인증 세션이 만료되었습니다.");

      await updatePassword(user, newPassword);

      await updateDoc(doc(db, 'UserProfile', user.uid), {
        mustChangePassword: false,
        lastPasswordChange: new Date().toISOString()
      });

      await addDoc(collection(db, 'AuditLogs'), {
        timestamp: new Date().toISOString(),
        actionType: 'UPDATE_PASSWORD',
        performedBy: userData?.name || '시스템',
        targetId: user.uid,
        targetName: userData?.name || '',
        details: '최초 로그인 비밀번호 변경 완료 (계정 활성화)'
      });

      setChangeSuccess(true);
      setTimeout(() => {
        setLoginModalOpen(false);
        setChangeSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError('비밀번호 변경 실패: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMasterAdmin = async (isAuto = false) => {
    const adminEmail = "bizpeer@internal.com";
    const adminPassword = "123456";

    try {
      if (!isAuto) setLoading(true);
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const uid = userCredential.user.uid;
      
      await setDoc(doc(db, 'UserProfile', uid), {
        uid,
        email: adminEmail,
        name: '최고 관리자',
        role: 'ADMIN',
        teamHistory: [],
        mustChangePassword: true,
        createdAt: new Date().toISOString()
      });
      
      if (isAuto) {
        alert(`[시스템 초기설정 완료] 마스터 관리자 계정이 생성되었습니다.\nID: bizpeer\nPW: ${adminPassword}`);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        if (!isAuto) console.log("Master Admin already exists.");
      }
    } finally {
      if (!isAuto) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-300">
        {!isChangeMode && (
          <button 
            onClick={() => setLoginModalOpen(false)}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-8">
          {authStatus !== 'IDLE' ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-indigo-600">
              <UserPlus className="w-12 h-12 animate-pulse" />
              <div className="text-center">
                <p className="font-bold text-lg">계정을 활성화하는 중입니다</p>
                <p className="text-sm text-gray-400">최초 로그인 시 1회 진행됩니다.</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin mt-2" />
            </div>
          ) : isChangeMode ? (
            <div className="text-center">
              {changeSuccess ? (
                <div className="py-10 flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">환영합니다!</h3>
                  <p className="text-gray-500">계정이 활성화되었습니다.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-indigo-50 rounded-2xl">
                      <KeyRound className="w-10 h-10 text-indigo-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">비밀번호 변경</h2>
                  <p className="text-gray-500 text-sm mb-8">보안을 위해 초기 비밀번호를<br/>반드시 변경해 주세요.</p>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-xs font-medium border border-red-100">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </div>
                    )}
                    <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1.5">새 비밀번호</label>
                      <input
                        type="password"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="최소 6자 이상"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1.5">비밀번호 확인</label>
                      <input
                        type="password"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="새 비밀번호 다시 입력"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 mt-4"
                    >
                      {loading ? '변경 중...' : '비밀번호 저장 및 시작'}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  <span className="text-indigo-600">HR Flow</span> 로그인
                </h2>
                <p className="text-gray-500">계속하시려면 로그인해주세요</p>
              </div>

              {isInitializing ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-indigo-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="font-medium">시스템 최적화 중...</p>
                </div>
              ) : (
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
              )}
              
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  최초 로그인 시 비밀번호 변경 요망
                </p>
                <button 
                  onClick={() => handleSeedMasterAdmin(false)}
                  className="text-xs text-indigo-400 hover:text-indigo-600 flex items-center gap-1.5 px-2 py-1 hover:bg-indigo-50 rounded-lg transition-all font-medium"
                  title="마스터 계정 초기화"
                >
                  <Settings className="w-4 h-4" />
                  마스터 설정
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
