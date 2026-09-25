import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthOverview } from '../hooks/useLedgerOverview';
import { STATUS_STYLES, toMonthKey } from '../ledgerUtils';

interface LedgerMonthNavigatorProps {
  currentMonth: string;
  overview: MonthOverview;
  onSelectMonth: (month: string) => void;
}

const STATUS_ORDER = ['作成中', '承認待ち', '承認済み', '経理提出済み'] as const;

export const LedgerMonthNavigator = ({ currentMonth, overview, onSelectMonth }: LedgerMonthNavigatorProps) => {
  const year = Number(currentMonth.slice(0, 4));
  const thisMonth = toMonthKey(new Date());
  const selectedRef = useRef<HTMLButtonElement>(null);

  // スマホでは横スクロールになるため、選択中の月を常に見える位置へ
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [currentMonth]);

  const changeYear = (amount: number) => {
    onSelectMonth(`${year + amount}${currentMonth.slice(4)}`);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
      <div className="flex items-center flex-shrink-0">
        <button onClick={() => changeYear(-1)} className="p-1.5 text-earth-700 rounded-md hover:bg-white/60 transition-colors" title="前年">
          <ChevronLeft size={18} />
        </button>
        <span className="w-16 text-center font-bold text-earth-800 tabular-nums">{year}年</span>
        <button onClick={() => changeYear(1)} className="p-1.5 text-earth-700 rounded-md hover:bg-white/60 transition-colors" title="翌年">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex flex-1 gap-1 overflow-x-auto">
        {Array.from({ length: 12 }, (_, i) => {
          const month = `${year}-${String(i + 1).padStart(2, '0')}`;
          const statuses = overview[month] ?? [];
          const isSelected = month === currentMonth;
          const isThisMonth = month === thisMonth;
          const dots = STATUS_ORDER.filter(s => statuses.includes(s));
          return (
            <button
              key={month}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelectMonth(month)}
              title={statuses.length > 0 ? statuses.join(' / ') : 'データなし'}
              className={`flex flex-col items-center justify-center flex-1 min-w-[3.25rem] h-12 rounded-md text-sm transition-all ${
                isSelected
                  ? 'bg-earth-600 text-white shadow-md font-bold'
                  : `hover:bg-white/60 ${statuses.length > 0 ? 'text-earth-800 font-medium' : 'text-earth-400'}`
              } ${isThisMonth && !isSelected ? 'ring-1 ring-earth-400' : ''}`}
            >
              <span>{i + 1}月</span>
              <span className="flex gap-0.5 h-1.5 mt-1">
                {dots.map(s => (
                  <span key={s} className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[s].dot} ${isSelected ? 'ring-1 ring-white' : ''}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {currentMonth !== thisMonth && (
        <button
          onClick={() => onSelectMonth(thisMonth)}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-earth-800 bg-white/60 border border-white/40 rounded-md hover:bg-white transition-colors"
        >
          今月
        </button>
      )}
    </div>
  );
};
