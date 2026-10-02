import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useWork } from '../../hooks/useWorks';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { parseYmd } from '../../utils/money';
import type { BudgetSection } from '../../types';
import { budgetSummary, sectionSubtotal, seriesMultiplier, splitColumns } from './budgetSheet';

const num = (n: number) => (n ? n.toLocaleString('ja-JP') : '');
const yenText = (n: number) => `${n < 0 ? '-' : ''}¥${Math.abs(Math.round(n)).toLocaleString('ja-JP')}`;
const pct = (rate: number | null) => (rate === null ? '—' : `${(rate * 100).toFixed(1)}%`);

const dateText = (value: string) => {
  const d = parseYmd(value);
  return d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日作成` : '';
};

const cell = 'border border-black px-1 h-[4.6mm] align-middle';
const SUMMARY_ROWS = 10; // 右段の集計欄の行数 (段組みの釣り合いに使う)

const SectionRows = ({ section }: { section: BudgetSection }) => (
  <>
    <tr><td colSpan={3} className={`${cell} text-center bg-[#c8c8c8]`}>{section.name}</td></tr>
    {section.lines.map(line => (
      <tr key={line.id}>
        <td className={`${cell} whitespace-nowrap overflow-hidden ${line.name.length > 10 ? 'text-[6.5pt]' : ''}`}>{line.name}</td>
        <td className={`${cell} text-[#c0392b] whitespace-nowrap overflow-hidden ${line.calc.length > 12 ? 'text-[6.5pt]' : ''}`}>{line.calc}</td>
        <td className={`${cell} text-right tabular-nums`}>{num(line.amount)}</td>
      </tr>
    ))}
    <tr>
      <td className={`${cell} border-r-0`} />
      <td className={`${cell} text-right border-l-0`}>小計</td>
      <td className={`${cell} text-right tabular-nums`}>{yenText(sectionSubtotal(section))}</td>
    </tr>
  </>
);

/** 作品の予算表 (A4 縦)。ブラウザの印刷から PDF に保存する */
const WorkBudgetPrintPage = () => {
  const { workId } = useParams<{ workId: string }>();
  const { work, loading } = useWork(workId);
  const { settings } = useCompanySettings();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (work) document.title = `【予算表】${work.title}`;
  }, [work]);

  // 行が多いときは A4 1枚に収まるよう縮小する
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const available = 297 * 3.78 - 2 * 12 * 3.78; // A4 高さ - 上下余白 (px)
    setZoom(Math.min(1, available / el.scrollHeight));
  }, [work]);

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!work) return <div className="p-10 text-center text-red-500">作品が見つかりません。</div>;

  const sheet = work.budgetSheet;
  const s = budgetSummary(sheet);
  const [left, right] = splitColumns(sheet.sections, SUMMARY_ROWS);
  const multiplier = seriesMultiplier(work);

  const column = (sections: BudgetSection[], summary: boolean) => (
    <table className="w-full border-collapse table-fixed">
      <colgroup><col className="w-[34%]" /><col className="w-[34%]" /><col className="w-[32%]" /></colgroup>
      <tbody>
        {sections.map(section => <SectionRows key={section.id} section={section} />)}
        {summary && (
          <>
            <tr>
              <td colSpan={2} className={`${cell} text-center bg-[#c8c8c8]`}>直接費合計</td>
              <td className={`${cell} text-right tabular-nums`}>{yenText(s.direct)}</td>
            </tr>
            <tr><td colSpan={3} className={`${cell} text-center bg-[#c8c8c8]`}>間接費</td></tr>
            <tr>
              <td colSpan={2} className={`${cell} font-bold`}>管理費{'\u3000'}直接費合計×{sheet.managementRate}%(A)</td>
              <td className={`${cell} text-right tabular-nums`}>{num(s.management)}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} font-bold pl-6`}>粗利（C）<span className="ml-2 font-normal text-[#c0392b]">{sheet.targetTotal > 0 && `粗利率 ${pct(s.profitRate)}`}</span></td>
              <td className={`${cell} text-right tabular-nums`}>{num(s.profit)}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} pl-4`}>グロス管理費（B）</td>
              <td className={`${cell} text-right tabular-nums`}>{num(sheet.grossManagementFee)}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} text-[#c0392b]`}>グロス使用時の粗利{'\u3000'}A-B+C＝</td>
              <td className={`${cell} text-right tabular-nums`}>{num(s.grossProfit)}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} text-center`}>管理費 +粗利（＝{pct(s.managementProfitRate)}）</td>
              <td className={`${cell} text-right tabular-nums`}>{num(s.managementProfit)}</td>
            </tr>
            <tr>
              <td colSpan={2} className={`${cell} text-center bg-[#c8c8c8]`}>総合計</td>
              <td className={`${cell} text-right tabular-nums font-bold`}>{yenText(s.grandTotal)}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 text-white bg-gray-800 shadow-md no-print">
        <h1 className="text-lg font-semibold">予算表プレビュー: {work.title}</h1>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 font-bold text-gray-800 bg-white rounded hover:bg-gray-200">
          <Printer size={20} />印刷 / PDF保存
        </button>
      </div>

      <div className="flex justify-center py-8 print:py-0">
        <div className="bg-white shadow-lg print:shadow-none w-[210mm] min-h-[297mm] px-[12mm] py-[12mm] text-black">
          <div ref={sheetRef} style={{ zoom }} className="text-[8.5pt] leading-tight" >
            <div className="flex items-start justify-between mb-3">
              <h2 className="pt-6 text-[13pt] font-bold text-[#c0392b]">「{work.title}」{sheet.title}</h2>
              <div className="text-[9pt] text-right">
                <p>{settings.companyName}{settings.tel && <span className="ml-4">{settings.tel}</span>}</p>
                <p>（単位{'\u3000'}：円{sheet.basis === 'episode' ? '・1話あたり' : ''}）</p>
                <p>{dateText(sheet.createdDate)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 border-2 border-black">
              <div className="border-r-2 border-black">{column(left, false)}</div>
              <div>{column(right, true)}</div>
            </div>

            <div className="grid grid-cols-2 mt-1">
              <div />
              <table className="w-full table-fixed text-[8.5pt]">
                <colgroup><col className="w-[68%]" /><col className="w-[32%]" /></colgroup>
                <tbody>
                  <tr><td className="pr-2 text-right">（出資額）{sheet.investmentRate}％</td><td className="pr-1 text-right tabular-nums">{yenText(s.investment)}</td></tr>
                  <tr><td className="pr-2 text-right">出資額を含む総合計額</td><td className="pr-1 text-right tabular-nums">{yenText(s.target)}</td></tr>
                  {sheet.basis === 'episode' && (
                    <tr><td className="pr-2 text-right">シリーズ総合計 (× {multiplier}話)</td><td className="pr-1 font-bold text-right tabular-nums">{yenText(s.target * multiplier)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default WorkBudgetPrintPage;
