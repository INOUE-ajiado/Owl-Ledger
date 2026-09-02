import type { Project, BreakdownItem } from '../../types';

const companyLogoUrl = '/assets/company-logo.png';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

interface PersonalInvoiceTemplateProps {
  project: Project;
  item: BreakdownItem; // 内訳の1行（購入者情報）
}

const PersonalInvoiceTemplate = ({ project, item }: PersonalInvoiceTemplateProps) => {
  const issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
  // 支払期限（例：翌月末）
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 2, 0); 
  const dueDate = nextMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // 内訳の金額を請求総額とします
  const totalAmount = item.amount;
  // 内税計算（消費税10%）
  const subtotal = Math.round(totalAmount / 1.1);
  const tax = totalAmount - subtotal;

  return (
    <div className="bg-white p-12 font-sans text-gray-800 text-sm leading-snug w-[210mm] min-h-[297mm]">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="inline-block pb-2 text-3xl font-bold border-b-4 border-gray-800">請求書</h1>
        </header>

        <div className="flex items-start justify-between mb-8">
          <div className="w-1/2">
            <h2 className="mb-2 text-xl font-bold border-b border-black">{item.name} 様</h2>
            <p>下記の通りご請求申し上げます。</p>
          </div>

          <div className="flex justify-end w-1/2 text-right">
            <div className="relative">
               <p className="text-lg font-bold">株式会社亜細亜堂</p>
               <p>〒338-0012</p>
               <p>埼玉県さいたま市中央区大戸2丁目11-7</p>
               <p>TEL: 048-855-3388</p>
               <p className="mt-2">発行日: {issueDate}</p>
               <p>管理ID: {project.projectId}-{String(project.breakdown.indexOf(item) + 1).padStart(2, '0')}</p>
               <img src={companyLogoUrl} alt="Logo" className="absolute top-0 right-[-60px] w-12 opacity-80" />
            </div>
          </div>
        </div>

        <div className="mb-8">
           <div className="flex items-center justify-between p-4 bg-gray-100 border border-black">
              <span className="text-lg font-bold">ご請求金額</span>
              <span className="text-2xl font-bold">¥ {formatCurrency(totalAmount)} <span className="text-sm font-normal">-</span></span>
           </div>
           <p className="mt-1 text-xs text-right">お支払期限: {dueDate}</p>
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="text-center bg-gray-200 border border-black">
              <th className="w-1/2 p-2 border border-black">品名</th>
              <th className="p-2 border border-black">数量</th>
              <th className="p-2 border border-black">単価</th>
              <th className="p-2 border border-black">金額</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className="p-2 text-left border border-black">{project.title} ({item.content || '物品購入'})</td>
              <td className="p-2 border border-black">{item.quantity}</td>
              <td className="p-2 border border-black">¥{formatCurrency(item.quantity > 0 ? item.amount / item.quantity : 0)}</td>
              <td className="p-2 border border-black">¥{formatCurrency(item.amount)}</td>
            </tr>
            {/* 空行 */}
            {[...Array(3)].map((_, i) => (
                <tr key={i}><td className="p-4 border border-black" colSpan={4}></td></tr>
            ))}
          </tbody>
          <tfoot>
             <tr>
                <td colSpan={2} className="border-none"></td>
                <td className="p-2 text-center bg-gray-100 border border-black">小計</td>
                <td className="p-2 text-right border border-black">¥{formatCurrency(subtotal)}</td>
             </tr>
             <tr>
                <td colSpan={2} className="border-none"></td>
                <td className="p-2 text-center bg-gray-100 border border-black">消費税(10%)</td>
                <td className="p-2 text-right border border-black">¥{formatCurrency(tax)}</td>
             </tr>
             <tr>
                <td colSpan={2} className="border-none"></td>
                <td className="p-2 font-bold text-center bg-gray-100 border border-black">合計</td>
                <td className="p-2 font-bold text-right border border-black">¥{formatCurrency(totalAmount)}</td>
             </tr>
          </tfoot>
        </table>

        <div className="p-4 border border-black">
          <p className="mb-2 font-bold">【お振込先】</p>
          <p>みずほ銀行 浦和支店</p>
          <p>普通預金 1097361</p>
          <p>カ)アジアドウ</p>
          <p className="mt-2 text-xs text-gray-600">※ 振込手数料はご負担願います。</p>
        </div>
      </div>
    </div>
  );
};

export default PersonalInvoiceTemplate;