import React, { useState, useEffect } from 'react';
import { 
  Banknote, Search, Building, Filter, Calculator, 
  Loader2, Save, PieChart, Info, AlertCircle
} from 'lucide-react';
import { 
  collection, query, onSnapshot, doc, updateDoc, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import type { UserData } from '../store/authStore';

const MEAL_ALLOWANCE = 200000; // 비과세 식대 20만원

const calculateNetPay = (annualSalary: number) => {
  if (!annualSalary || annualSalary < 0) return null;

  const monthlyGross = Math.floor(annualSalary / 12);
  const taxableIncome = Math.max(0, monthlyGross - MEAL_ALLOWANCE);

  // 1. 국민연금 (4.5%, 상한액 265,500원 적용 예시)
  let pension = Math.floor(taxableIncome * 0.045);
  if (pension > 265500) pension = 265500;

  // 2. 건강보험 (3.545%)
  const health = Math.floor(taxableIncome * 0.03545);

  // 3. 장기요양보험 (건강보험의 12.95%)
  const longTerm = Math.floor(health * 0.1295);

  // 4. 고용보험 (0.9%)
  const employment = Math.floor(taxableIncome * 0.009);

  const totalInsurance = pension + health + longTerm + employment;

  // 5. 소득세 (간이세액표 근사치 로직 - 부양가족 1인 기준)
  // taxBase = 과세대상액 - 4대보험
  const taxBase = taxableIncome - totalInsurance;
  let incomeTax = 0;
  if (taxBase <= 1200000) {
    incomeTax = 0;
  } else if (taxBase <= 4600000) {
    incomeTax = Math.floor(taxBase * 0.06);
  } else if (taxBase <= 8800000) {
    incomeTax = Math.floor(taxBase * 0.15 - 108000);
  } else {
    incomeTax = Math.floor(taxBase * 0.24 - 522000);
  }

  // 6. 지방소득세 (소득세의 10%)
  const localTax = Math.floor(incomeTax * 0.1);

  const totalDeductions = totalInsurance + incomeTax + localTax;
  const netPay = monthlyGross - totalDeductions;

  return {
    monthlyGross,
    pension,
    health,
    longTerm,
    employment,
    totalInsurance,
    incomeTax,
    localTax,
    totalDeductions,
    netPay
  };
};

export const SalaryManagement: React.FC = () => {
  const { } = useAuthStore();
  const [employees, setEmployees] = useState<UserData[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingSalaries, setEditingSalaries] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<UserData | null>(null);

  useEffect(() => {
    // Fetch Organization Data
    const unsubDivs = onSnapshot(collection(db, 'divisions'), (snap) => {
      setDivisions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Subscribe to Employees
    const q = query(collection(db, 'UserProfile'), orderBy('name', 'asc'));
    const unsubEmployees = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData));
      setEmployees(data);
      
      // Initialize editing salaries map
      const initialMap: Record<string, number> = {};
      data.forEach(emp => {
        if (emp.annualSalary) initialMap[emp.uid] = emp.annualSalary;
      });
      setEditingSalaries(initialMap);
      
      setLoading(false);
    });

    return () => { unsubDivs(); unsubTeams(); unsubEmployees(); };
  }, []);

  const handleSalaryChange = (uid: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
    setEditingSalaries(prev => ({ ...prev, [uid]: numValue }));
  };

  const handleSaveSalary = async (uid: string) => {
    const salary = editingSalaries[uid];
    if (salary === undefined) return;

    setIsSaving(uid);
    try {
      await updateDoc(doc(db, 'UserProfile', uid), { annualSalary: salary });
      // updateDoc is real-time, so the list will update via onSnapshot
    } catch (e) {
      alert('저장 실패: ' + (e as Error).message);
    } finally {
      setIsSaving(null);
    }
  };

  const filteredEmployees = employees
    .filter(emp => {
      if (emp.status === 'RESIGNED') return false; // 퇴사자 제외
      const matchesDiv = selectedDivision === 'ALL' || emp.divisionId === selectedDivision;
      const matchesTeam = selectedTeam === 'ALL' || emp.teamId === selectedTeam;
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDiv && matchesTeam && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                <Banknote className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">급여 및 연봉 관리</h1>
            </div>
            <p className="text-slate-500 font-medium whitespace-pre-wrap">구성원별 연봉 데이터를 관리하고 2025년 기준 월간 예상 실수령액을 산출합니다.</p>
          </div>

          <div className="relative group w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Building className="w-5 h-5" /></div>
            <select 
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setSelectedTeam('ALL'); }}
              className="flex-1 bg-transparent border-none outline-none font-black text-slate-700 text-sm appearance-none cursor-pointer"
            >
              <option value="ALL">전체 본부</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Filter className="w-5 h-5" /></div>
            <select 
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={selectedDivision === 'ALL'}
              className="flex-1 bg-transparent border-none outline-none font-black text-slate-700 text-sm appearance-none cursor-pointer disabled:opacity-30"
            >
              <option value="ALL">본부 내 전체 팀</option>
              {teams.filter(t => t.divisionId === selectedDivision).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-xl flex items-center justify-between px-6">
             <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 opacity-70" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">2025 Standard</span>
             </div>
             <span className="text-sm font-black">4대보험 및 간이세액 적용</span>
          </div>
        </div>

        {/* List Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">구성원 정보</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">현재 연봉 (원)</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">월 예상 지급액</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => {
                  const currentSalary = editingSalaries[emp.uid] || 0;
                  const result = calculateNetPay(currentSalary);
                  const isModified = currentSalary !== (emp.annualSalary || 0);

                  return (
                    <tr key={emp.uid} className="group hover:bg-slate-50/80 transition-all">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm group-hover:rotate-6 transition-all bg-indigo-100 text-indigo-600`}>
                            {emp.name[0]}
                          </div>
                          <div>
                            <div className="text-md font-black tracking-tight text-slate-800">{emp.name}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{emp.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <input 
                            type="text"
                            value={currentSalary ? currentSalary.toLocaleString() : ''}
                            onChange={(e) => handleSalaryChange(emp.uid, e.target.value)}
                            placeholder="연봉 입력"
                            className={`w-40 px-4 py-3 bg-slate-50 rounded-xl border-2 outline-none transition-all font-black text-slate-700 ${isModified ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100 focus:border-indigo-500'}`}
                          />
                          {isModified && (
                            <button 
                              onClick={() => handleSaveSalary(emp.uid)}
                              disabled={isSaving === emp.uid}
                              className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                            >
                              {isSaving === emp.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {result ? (
                          <div className="flex items-center gap-6">
                            <div className="space-y-1">
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Expected Net Pay</div>
                               <div className="text-xl font-black text-emerald-600 tracking-tighter">
                                 {result.netPay.toLocaleString()} <span className="text-xs font-bold text-slate-400 ml-1">원</span>
                               </div>
                            </div>
                            <div className="h-8 w-px bg-slate-100"></div>
                            <div className="space-y-1">
                               <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Monthly Gross</div>
                               <div className="text-md font-bold text-slate-600">
                                 {result.monthlyGross.toLocaleString()} <span className="text-[9px] font-medium text-slate-400">원</span>
                               </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-300 italic">연봉을 입력해주세요</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <button 
                          onClick={() => setSelectedDetails(emp)}
                          disabled={!result}
                          className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-30 flex items-center gap-2 ml-auto"
                         >
                           <Calculator className="w-3 h-3" />
                           상세 산출 내역
                         </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                 <Calculator className="w-6 h-6 text-indigo-400" />
                 <h2 className="text-xl font-black tracking-tight">{selectedDetails.name}님 급여 산출 상세</h2>
              </div>
              <button 
                onClick={() => setSelectedDetails(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {(() => {
                const res = calculateNetPay(editingSalaries[selectedDetails.uid] || 0);
                if (!res) return null;
                return (
                  <>
                    {/* Summary Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">월 환산 급여</div>
                        <div className="text-lg font-black text-slate-800">{res.monthlyGross.toLocaleString()}원</div>
                      </div>
                      <div className="p-5 bg-indigo-600 rounded-2xl shadow-lg ring-4 ring-indigo-50">
                        <div className="text-[10px] font-black text-indigo-200 uppercase mb-1">실수령 예상액</div>
                        <div className="text-xl font-black text-white">{res.netPay.toLocaleString()}원</div>
                      </div>
                    </div>

                    {/* Breakdown Sections */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                           <Info className="w-4 h-4 text-emerald-500" />
                           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">4대 보험 공제액</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-sm">
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">국민연금</span>
                              <span className="font-black text-slate-700">{res.pension.toLocaleString()}원</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">건강보험</span>
                              <span className="font-black text-slate-700">{res.health.toLocaleString()}원</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">장기요양</span>
                              <span className="font-black text-slate-700">{res.longTerm.toLocaleString()}원</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">고용보험</span>
                              <span className="font-black text-slate-700">{res.employment.toLocaleString()}원</span>
                           </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                           <PieChart className="w-4 h-4 text-sky-500" />
                           <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">소득세 및 지방세</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 text-sm">
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">근로소득세</span>
                              <span className="font-black text-slate-700">{res.incomeTax.toLocaleString()}원</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-500 font-bold">지방소득세</span>
                              <span className="font-black text-slate-700">{res.localTax.toLocaleString()}원</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                       <span className="text-[10px] font-bold italic leading-tight">본 산출 내역은 2025년 기준 간이 계산이며,<br/>부양가족 1인(본인) 기준 근사치입니다.</span>
                       <div className="text-right">
                          <div className="text-[10px] font-black uppercase mb-1">Total Deduction</div>
                          <div className="text-lg font-black text-rose-500">-{res.totalDeductions.toLocaleString()}원</div>
                       </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
