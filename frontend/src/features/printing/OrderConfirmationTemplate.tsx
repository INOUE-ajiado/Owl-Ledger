import type { Project, Client } from '../../types';

const formatCurrency = (amount: number) => {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

const formatStampDate = (timestamp: { seconds: number; nanoseconds: number; } | undefined) => {
  if (!timestamp) return '';
  const date = new Date(timestamp.seconds * 1000);
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  return `${Y}.${M}.${D}`;
};

import ApprovalStamp from '../ledger/ApprovalStamp';

interface OrderConfirmationTemplateProps {
  project: Project;
  client: Client;
}

const OrderConfirmationTemplate = ({ project, client }: OrderConfirmationTemplateProps) => {
  // プロジェクトタイプが 'sub' の場合は allocatedAmount (捻出額) をベースにする
  const glossInput = project.projectType === 'sub'
    ? (project.allocatedAmount || 0)
    : project.gloss;

  const taxType = project.taxType || 'exclusive';
  const glossTaxExclusive = taxType === 'inclusive' ? glossInput / 1.1 : glossInput;

  const initialMargin = glossTaxExclusive * (project.marginRate / 100);

  // 価格交渉料のロジック (GLOSS x negotiationFeeRate%、最低保証4000円、上限10000円)
  const MINIMUM_GUARANTEE_FEE = 4000;
  const MAXIMUM_GUARANTEE_FEE = 10000;
  const negotiationFeeRaw = glossTaxExclusive * (project.negotiationFeeRate / 100);
  const finalNegotiationFee = Math.max(MINIMUM_GUARANTEE_FEE, Math.min(MAXIMUM_GUARANTEE_FEE, negotiationFeeRaw));
  const isMinimumGuarantee = finalNegotiationFee === MINIMUM_GUARANTEE_FEE;
  const isMaximumGuarantee = finalNegotiationFee === MAXIMUM_GUARANTEE_FEE;

  const finalMargin = initialMargin - finalNegotiationFee;

  const net = glossTaxExclusive - initialMargin;
  const netRate = 100 - project.marginRate;

  // --- 日付表示ロジックの修正 ---
  // 納品日 (dueDate) があればそれを使い、なければ登録日 (registrationDate) を使用する
  const displayDateString = project.dueDate || project.registrationDate;
  const displayDate = new Date(displayDateString);

  const dYear = displayDate.getFullYear();
  const dMonth = displayDate.getMonth() + 1;
  const dDay = displayDate.getDate();

  // 完成日の表示用（納期）
  const completionDate = project.dueDate
    ? new Date(project.dueDate)
    : new Date(new Date(project.registrationDate).setMonth(new Date(project.registrationDate).getMonth() + 1));

  const completionYear = completionDate.getFullYear();
  const completionMonth = completionDate.getMonth() + 1;
  const completionDay = completionDate.getDate();

  const productionManager = '井上';

  const breakdown = project.breakdown || [];
  const totalBodyRows = 7;

  const borderStyle = { border: '1px solid black' };
  const borderRightStyle = { borderRight: '1px solid black' };

  return (
    <div className="p-8 font-sans text-gray-800 bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm', margin: 'auto' }}>
      <div className="w-full max-w-4xl mx-auto text-sm">

        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">受注伝票<span className="ml-2 text-lg">（少額用）</span></h1>
        </header>

        <section className="mb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center">
                <p className="w-24 font-semibold">納品日</p>
                <p>{`${dYear} 年 ${dMonth} 月 ${dDay} 日`}</p>
              </div>
              <div className="flex">
                <div className="p-2 w-[450px]" style={borderStyle}>
                  <div className="flex">
                    <p className="w-16">作品名</p>
                    <p>{project.title}</p>
                  </div>
                  <div className="flex mt-1">
                    <p className="w-16">品名</p>
                    <p>{project.category}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center">
                <p className="w-40">完成日 (もしくは予定日)</p>
                <p>{`${completionYear} 年 ${completionMonth} 月 ${completionDay} 日`}</p>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="flex items-start">
                <p className="w-20 text-left">発注元</p>
                <p className="flex-grow">{client.name}</p>
              </div>
              <div className="flex items-start">
                <p className="w-20 text-left">担当者</p>
                <p className="flex-grow">{client.contactPerson || 'ご担当者'} 様</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full" style={{ borderCollapse: 'collapse', ...borderStyle }}>
            <thead>
              <tr style={{ borderBottom: '1px solid black' }}>
                <th className="w-1/2 p-1 font-semibold text-center" style={borderRightStyle}>課目</th>
                <th className="w-1/4 p-1 font-semibold text-center" style={borderRightStyle}>金額</th>
                <th className="w-1/12 p-1 font-semibold text-center" style={borderRightStyle}>枚数</th>
                <th className="p-1 font-semibold text-center">分配率</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((item, index) => (
                <tr key={index} className="h-9" style={{ borderBottom: '1px solid black' }}>
                  <td className="p-1" style={borderRightStyle}>
                    {item.name} 様{item.content && `（${item.content}）`}
                  </td>
                  <td className="p-1 text-right tabular-nums" style={borderRightStyle}>¥ {formatCurrency(item.amount)}</td>
                  <td className="p-1 text-center" style={borderRightStyle}>{item.quantity}</td>
                  <td className="p-1 text-xs text-center">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
              {Array.from({ length: totalBodyRows - breakdown.length - 1 }).map((_, i) => (
                <tr key={`filler-${i}`} className="h-9" style={{ borderBottom: '1px solid black' }}>
                  <td style={borderRightStyle}></td>
                  <td style={borderRightStyle}></td>
                  <td style={borderRightStyle}></td>
                  <td></td>
                </tr>
              ))}
              <tr className="h-9" style={{ borderBottom: '1px solid black' }}>
                <td className="p-1" style={borderRightStyle}>
                  {isMinimumGuarantee ? '価格交渉料（最低保証料）' : (isMaximumGuarantee ? '価格交渉料（上限額）' : '価格交渉料')}
                </td>
                <td className="p-1 text-right tabular-nums" style={borderRightStyle}>¥ {formatCurrency(finalNegotiationFee)}</td>
                <td colSpan={2} className="p-1 text-xs text-center">
                  {isMinimumGuarantee
                    ? '最低保証料として適用'
                    : (isMaximumGuarantee
                      ? '上限額として適用'
                      : `GLOSSに対する ${project.negotiationFeeRate}%`
                    )
                  }
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '1px solid black' }}>
                <td className="p-1 font-semibold">NET (社外配分計)</td>
                <td className="p-1 font-semibold text-right tabular-nums" style={borderRightStyle}>¥ {formatCurrency(net)}</td>
                <td colSpan={2} className="p-1 text-lg text-center">{netRate.toFixed(2)}%</td>
              </tr>
              <tr style={{ borderTop: '1px solid black' }}>
                <td className="p-1 font-semibold">MARGIN (社内配分計)</td>
                <td className="p-1 font-semibold text-right tabular-nums" style={borderRightStyle}>¥ {formatCurrency(finalMargin)}</td>
                <td colSpan={2} className="p-1 text-lg text-center">{project.marginRate.toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="flex items-center justify-between p-2 mt-2" style={borderStyle}>
          <p className="font-semibold">請求額（受注額）</p>
          <p className="text-xl font-bold tabular-nums">¥{formatCurrency(glossTaxExclusive)}</p>
          <p>（税別）</p>
        </section>

        <footer className="flex items-end justify-between mt-4" style={{ minHeight: '120px' }}>
          <div className="space-y-4">
            <p>作業担当：{project.workerName} 様</p>
            <p>制作担当：{productionManager}</p>
            <div className="flex">
              <p className="w-12">備考：</p>
              <p className="flex-1 whitespace-pre-wrap">{project.remarks}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="text-center">
              <p className="text-xs mb-0.5">制作</p>
              <div className="flex items-center justify-center w-20 h-20" style={borderStyle}>
                {project.orderConfirmationSubmittedAt && project.orderConfirmationSubmitterName && (
                  <ApprovalStamp
                    status="提出"
                    name={project.orderConfirmationSubmitterName}
                    date={formatStampDate(project.orderConfirmationSubmittedAt)}
                  />
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs mb-0.5">代表印</p>
              <div className="flex items-center justify-center w-20 h-20" style={borderStyle}>
                {project.orderConfirmationApprovedAt && project.orderConfirmationApproverName && (
                  <ApprovalStamp
                    status="承認"
                    name={project.orderConfirmationApproverName}
                    date={formatStampDate(project.orderConfirmationApprovedAt)}
                  />
                )}
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default OrderConfirmationTemplate;