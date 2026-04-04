import React, { useState, useEffect } from 'react';
import { Settings, Database, Lock, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export const AdminSettings: React.FC = () => {
  // Supabase Config State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'supabase');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSupabaseUrl(data.url || '');
          setSupabaseAnonKey(data.anonKey || '');
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await setDoc(doc(db, 'config', 'supabase'), {
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
        updatedAt: new Date().toISOString()
      });
      setMessage({ type: 'success', text: '데이터베이스 연결 설정이 저장되었습니다.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: '저장 실패: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: '비밀번호는 최소 4자 이상이어야 합니다.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage({ type: 'success', text: '비밀번호가 성공적으로 변경되었습니다.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: '로그인 세션이 만료되었습니다.' });
      }
    } catch (err: any) {
      // Re-authentication may be required for password update in Firebase
      if (err.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: '보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.' });
      } else {
        setMessage({ type: 'error', text: '비밀번호 변경 실패: ' + err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 bg-gray-50 flex flex-col items-start gap-8 min-h-screen">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-500" />
          시스템 설정
        </h1>
      </div>

      {message.text && (
        <div className={`w-full max-w-2xl p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        {/* 외부 데이터베이스 설정 */}
        <div className="bg-white shadow-md rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-800">외부 데이터베이스 연동 (Supabase)</h2>
          </div>
          <form onSubmit={handleSaveDbConfig} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Supabase URL</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anon Public Key</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                placeholder="eyJhbG..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              *여기에 입력된 정보는 시스템 내에서 외부 DB 연동 및 확장에 사용됩니다.
            </p>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
              >
                <Save className="w-4 h-4" />
                설정 저장
              </button>
            </div>
          </form>
        </div>

        {/* 비밀번호 변경 */}
        <div className="bg-white shadow-md rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">관리자 계정 보안</h2>
          </div>
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">새 비밀번호</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="최소 4자 이상"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                placeholder="비밀번호 재입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md"
              >
                <Lock className="w-4 h-4" />
                비밀번호 변경
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
