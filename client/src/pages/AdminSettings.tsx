import React, { useState, useEffect } from 'react';
import { Settings, Database, Lock, Save, AlertCircle, CheckCircle2, ShieldCheck, Key, Globe, Layout, ShieldAlert, Fingerprint } from 'lucide-react';
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
      setMessage({ type: 'success', text: '데이터베이스 연결 설정이 안전하게 저장되었습니다.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: '저장 실패: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '입력하신 두 비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: '보안을 위해 비밀번호는 최소 4자 이상이어야 합니다.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage({ type: 'success', text: '관리자 비밀번호가 성공적으로 변경되었습니다.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: '인증 세션이 만료되었습니다. 다시 로그인해주세요.' });
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: '보안 정책상 최근 로그인이 필요합니다. 로그아웃 후 다시 시도해주세요.' });
      } else {
        setMessage({ type: 'error', text: '비밀번호 변경 중 오류가 발생했습니다: ' + err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">시스템 환경 설정</h1>
          </div>
          <p className="text-slate-500 font-medium">데이터베이스 연동 및 관리자 보안 옵션을 구성합니다.</p>
        </div>

        {/* Status Message */}
        {message.text && (
          <div className={`w-full p-6 bg-white rounded-[2rem] flex items-center gap-4 shadow-xl border-l-8 animate-modal-pop transition-all ${
            message.type === 'success' ? 'border-emerald-500 shadow-emerald-50' : 'border-rose-500 shadow-rose-50'
          }`}>
            <div className={`p-2 rounded-full ${message.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <p className={`text-sm font-black tracking-tight ${message.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                {message.type === 'success' ? '환경 설정 업데이트 완료' : '시스템 경고'}
              </p>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Cloud Database Integration Section */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden group">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">외부 DB 연동 엔진</h2>
              </div>
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                Supabase
              </span>
            </div>

            <form onSubmit={handleSaveDbConfig} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-slate-800 ml-1">
                    <Globe className="w-4 h-4 text-indigo-500" /> API Endpoint URL
                  </label>
                  <input
                    type="text"
                    required
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://project.supabase.co"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-slate-800 ml-1">
                    <Key className="w-4 h-4 text-indigo-500" /> Anon Public API Key
                  </label>
                  <input
                    type="password"
                    required
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGc..."
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                 <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                   입력된 정보는 시스템 내에서 비동기 데이터 통합 및 확장에 사용됩니다. 
                   잘못된 접근 키를 입력할 경우 외부 API 요청 시 오류가 발생할 수 있습니다.
                 </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>엔진 설정 업데이트</span>
              </button>
            </form>
          </div>

          {/* Security & Access Protection Section */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden group">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">코어 보안 프로토콜</h2>
              </div>
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                Protected
              </span>
            </div>

            <form onSubmit={handleChangePassword} className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-slate-800 ml-1">
                    <Fingerprint className="w-4 h-4 text-emerald-500" /> 신규 마스터 비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="최소 4자 이상"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-slate-800 ml-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 비밀번호 재검증
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="재입력 확인"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Layout className="w-5 h-5 text-indigo-500" />
                    <div className="flex-1">
                       <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">자동 세션 보존</p>
                       <p className="text-[10px] text-slate-400 font-bold">변경 즉시 모든 활성 세션에 보안 정책이 적용됩니다.</p>
                    </div>
                    <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                       <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" />
                    </div>
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-5 h-5" />}
                <span>보안 키 업데이트 적용</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center py-10 opacity-30">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">System Version 2.0.4 Premium Core</p>
        </div>
      </div>
    </div>
  );
};
