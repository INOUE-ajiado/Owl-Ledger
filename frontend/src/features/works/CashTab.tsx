import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Chart } from 'react-chartjs-2';
import { BarController, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { Panel, StatCard } from '../../components/DetailParts';
import { formatYmdDash } from '../../utils/money';
import type { CashFlow } from './workMetrics';
import { EmptyRow } from './parts';
import { td, th, yen } from './ui';

ChartJS.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

// 入金・出金は検証済みの2色 (色覚の違いでも区別できる)。残高は線の形で区別する
const IN_COLOR = '#2a78d6';
const OUT_COLOR = '#eb6834';
const BALANCE_COLOR = '#4b3f36';

const monthLabel = (month: string) => `${month.slice(2, 4)}/${month.slice(5)}`;

/** 制作キャッシュギャップ警告 (資金繰り) */
const CashTab = ({ flow, openingBalance }: { flow: CashFlow; openingBalance: number }) => {
  const { months, peak } = flow;
  const short = peak && peak.balance < 0 ? peak : null;
  const thisMonth = formatYmdDash(new Date()).slice(0, 7);
  // 持ち出しのピーク以降、残高がプラスに戻る最初の月
  const recovery = short ? months.find(m => m.month > short.month && m.balance >= 0) : undefined;
  const upcomingShort = months.find(m => m.month >= thisMonth && m.balance < 0);

  const data = {
    labels: months.map(m => monthLabel(m.month)),
    datasets: [
      { type: 'line' as const, label: '作品残高 (累計)', data: months.map(m => m.balance), borderColor: BALANCE_COLOR, backgroundColor: BALANCE_COLOR, borderWidth: 2, tension: 0.2,
        pointRadius: months.map(m => (short && m.month === short.month ? 6 : 3)), pointBackgroundColor: months.map(m => (m.balance < 0 ? '#ffffff' : BALANCE_COLOR)), order: 0 },
      { type: 'bar' as const, label: 'キャッシュイン', data: months.map(m => m.cashIn), backgroundColor: IN_COLOR, borderRadius: 4, borderSkipped: 'bottom' as const, order: 1 },
      { type: 'bar' as const, label: 'キャッシュアウト', data: months.map(m => -m.cashOut), backgroundColor: OUT_COLOR, borderRadius: 4, borderSkipped: 'top' as const, order: 1 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, align: 'start' as const, labels: { boxWidth: 12, color: '#5c4d42' } },
      tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) => `${ctx.dataset.label}: ${yen(ctx.parsed.y)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#846f5f' } },
      y: { stacked: false, grid: { color: 'rgba(147,123,105,0.15)' }, ticks: { color: '#846f5f', callback: (v: number | string) => `${Number(v) / 10000}万` } },
    },
  };

  return (
    <div className="space-y-4">
      {short ? (
        <div className="flex items-start gap-3 px-4 py-3 text-sm text-red-800 border-y sm:border border-red-200 sm:rounded-xl bg-red-50/80">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{short.month.replace('-', '年')}月に自己資金の持ち出しが最大 {yen(-short.balance)} になります。</p>
            <p className="mt-0.5 text-xs">
              {recovery ? `${recovery.month.replace('-', '年')}月に回収してプラスに戻る見込みです。` : '期間内にプラスへ戻りません。'}
              {upcomingShort && upcomingShort.month !== short.month && ` 直近では ${upcomingShort.month.replace('-', '年')}月から残高がマイナスになります。`}
              {' '}入金予定日の前倒し (着手金の増額・分割回数の見直し) や外注支払いのタイミングを検討してください。
            </p>
          </div>
        </div>
      ) : months.length > 0 && (
        <p className="px-4 py-3 text-sm text-green-800 border-y sm:border border-green-200 sm:rounded-xl bg-green-50/70">現在の予定では、作品単体の残高がマイナスになる月はありません。</p>
      )}

      <div className="grid grid-cols-2 gap-px lg:grid-cols-4 sm:gap-3">
        <StatCard label="手元資金 (起点)" value={yen(openingBalance)} />
        <StatCard label="持ち出しのピーク" value={short ? yen(-short.balance) : '—'} sub={short ? `${short.month} の残高 ${yen(short.balance)}` : 'マイナスなし'} />
        <StatCard label="累計キャッシュイン" value={yen(months.reduce((s, m) => s + m.cashIn, 0))} />
        <StatCard label="累計キャッシュアウト" value={yen(months.reduce((s, m) => s + m.cashOut, 0))} />
      </div>

      <Panel title={<span className="inline-flex items-center gap-1.5"><TrendingDown size={15} />作品単体の月次キャッシュイン/アウト</span>}>
        {months.length === 0 ? (
          <p className="px-4 py-10 text-sm text-center text-earth-500">資金回収の予定日・原価の支払日を入力すると、月次の資金繰りが表示されます。</p>
        ) : (
          <div className="h-80 px-2 py-3 sm:px-4">
            <Chart type="bar" data={data} options={options} />
          </div>
        )}
      </Panel>

      <Panel title="月次の明細">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-left text-earth-500">
              <tr><th className={th}>月</th><th className={`${th} text-right`}>キャッシュイン</th><th className={`${th} text-right`}>キャッシュアウト</th><th className={`${th} text-right`}>月次収支</th><th className={`${th} text-right`}>作品残高</th></tr>
            </thead>
            <tbody className="divide-y divide-white/40 tabular-nums">
              {months.length === 0 && <EmptyRow colSpan={5}>データがありません。</EmptyRow>}
              {months.map(m => (
                <tr key={m.month} className={short && m.month === short.month ? 'bg-red-50/70' : m.month === thisMonth ? 'bg-white/50' : ''}>
                  <td className={td}>{m.month}{m.month === thisMonth && <span className="ml-1 text-xs text-earth-500">(今月)</span>}</td>
                  <td className={`${td} text-right`}>{yen(m.cashIn)}</td>
                  <td className={`${td} text-right`}>{yen(m.cashOut)}</td>
                  <td className={`${td} text-right ${m.cashIn - m.cashOut < 0 ? 'text-red-700' : ''}`}>{yen(m.cashIn - m.cashOut)}</td>
                  <td className={`${td} text-right font-semibold ${m.balance < 0 ? 'text-red-700' : 'text-earth-900'}`}>{yen(m.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-xs border-t text-earth-500 border-white/40">
          入金: 節目の請求 (入金済は入金日、未入金は入金予定日。未起票は予定日の翌月末と仮定)・MG・MG超過のロイヤリティ・出納帳の入金。出金: 原価明細の支払日・出納帳の出金。
        </p>
      </Panel>
    </div>
  );
};

export default CashTab;
