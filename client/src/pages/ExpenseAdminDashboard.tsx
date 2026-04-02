import React, { useState } from 'react';
import { PieChart, DollarSign, Calendar, Filter, Printer } from 'lucide-react';
// import { format } from 'date-fns';

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  status: 'APPROVED' | 'PENDING_DIRECTOR' | 'PENDING_FINANCE';
  applicant: string;
}

// 목업 데이터
const MOCK_EXPENSES: Expense[] = [
  { id: '1', title: '팀 회식비', amount: 150000, date: '2026-03-25', category: '식비', status: 'APPROVED', applicant: '홍길동' },
  { id: '2', title: 'AWS 서버비', amount: 850000, date: '2026-03-26', category: '인프라', status: 'APPROVED', applicant: '김개발' },
  { id: '3', title: '사무용품 구매', amount: 45000, date: '2026-03-28', category: '비품', status: 'PENDING_DIRECTOR', applicant: '이인사' },
  { id: '4', title: '외부 미팅 커피', amount: 12000, date: '2026-03-29', category: '진행비', status: 'APPROVED', applicant: '박영업' },
];

export const ExpenseAdminDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('2026-03-01');
  const [endDate, setEndDate] = useState<string>('2026-03-31');

  // 승인된(APPROVED) 지출만 필터링 후 기간별 조회
  const filteredExpenses = MOCK_EXPENSES.filter((expense) => {
    if (expense.status !== 'APPROVED') return false;
    const expenseDate = new Date(expense.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return expenseDate >= start && expenseDate <= end;
  });

  // 합계 금액 연산
  const totalAmount = filteredExpenses.reduce((sum, curr) => sum + curr.amount, 0);

  return (
    <div className="flex-1 p-4 md:p-8 bg-gray-50 flex flex-col gap-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <PieChart className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
            지출결의 통합 조회
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">관리자/대표이사 통합 통계 대시보드</p>
        </div>
        
        {/* 인쇄 및 PDF 출력 기능을 호출하는 Print 버튼 (인쇄 화면에서는 안 보임) */}
        <button 
          onClick={() => window.print()}
          className="print:hidden px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>내역 인쇄 (PDF)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        {/* 날짜 필터 영역 (인쇄 시 감춤) */}
        <div className="print:hidden flex flex-wrap lg:flex-nowrap items-center gap-4 w-full xl:w-auto">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" /> 시작일
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <span className="text-gray-400 font-bold mt-4">~</span>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" /> 종료일
            </label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="mt-5 px-4 py-2 bg-gray-800 text-white text-sm rounded shadow hover:bg-gray-700 flex items-center gap-2">
            <Filter className="w-4 h-4" /> 조회
          </button>
        </div>

        {/* 합계 위젯 (인쇄 시 고대비 반영을 위한 텍스트 컬러 조정 가능) */}
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-4 w-full xl:w-auto min-w-[300px] print:bg-transparent print:border-gray-800">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full print:border print:border-gray-800">
            <DollarSign className="w-6 h-6 print:text-black" />
          </div>
          <div>
            <h3 className="text-emerald-800 text-sm font-semibold print:text-gray-900">총 승인 금액 (기간 내)</h3>
            <p className="text-2xl font-bold text-emerald-900 print:text-black">
              {totalAmount.toLocaleString()} <span className="text-emerald-700 text-lg">원</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden">
        <div className="bg-gray-50 text-gray-600 p-4 font-semibold text-sm border-b grid grid-cols-6 items-center">
          <span className="col-span-2">지출 항목</span>
          <span>부서 / 신청자</span>
          <span>카테고리</span>
          <span>사용 일자</span>
          <span className="text-right pr-4">결제 금액</span>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((expense) => (
              <div key={expense.id} className="grid grid-cols-6 p-4 text-sm items-center hover:bg-gray-50">
                <span className="col-span-2 font-medium text-gray-800">{expense.title}</span>
                <span className="text-gray-600">{expense.applicant}</span>
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs w-auto place-self-start">
                  {expense.category}
                </span>
                <span className="text-gray-500">{expense.date}</span>
                <span className="text-right font-bold text-gray-900 pr-4">{expense.amount.toLocaleString()}원</span>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-500">
              해당 기간에 승인 완료된 지출결의 건이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
