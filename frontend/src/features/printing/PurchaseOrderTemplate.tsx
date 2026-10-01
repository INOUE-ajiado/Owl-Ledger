import type { Project, BreakdownItem, PurchaseOrder } from '../../types';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { formatYen, formatYmdSlash } from '../../utils/money';

const formatCurrency = formatYen;

interface PurchaseOrderTemplateProps {
  project: Project;
  items: BreakdownItem[];
  po: PurchaseOrder;
}

const PurchaseOrderTemplate = ({ project, items, po }: PurchaseOrderTemplateProps) => {
  const { settings } = useCompanySettings();
  if (items.length === 0) return null;

  // 発注日は発行した日 (印刷した日ではない)
  const issueDate = po.issueDate || formatYmdSlash(new Date(po.issuedAt.seconds * 1000));
  const poNumber = po.poNumber ?? `${project.projectId}-PO`;
  const staffName = po.staffName ?? project.copyrightManager ?? '';

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  // 源泉徴収などの支払内訳は、発行時に外注先マスタから計算して発注書に保存している (旧データにはない)
  const hasPaymentBreakdown = po.withholdingTax !== undefined;
  const taxRate = po.taxRate ?? settings.taxRate;
  const tax = po.tax ?? 0;
  const withholdingTax = po.withholdingTax ?? 0;
  const paymentAmount = po.paymentAmount ?? totalAmount + tax - withholdingTax;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const representativeItem = items[0];

  const formattedDueDate = project.dueDate ? project.dueDate.replace(/-/g, '/') : '未定';

  return (
    <div className="bg-white p-12 print:shadow-none font-sans text-gray-800 w-[210mm] min-h-[297mm]">
      <div className="w-full max-w-4xl mx-auto text-sm">
        
        <header>
          <h1 className="text-center text-4xl font-bold mb-8">発注書</h1>
          
          <div className="flex justify-between items-start">
            <div className="w-[55%]">
              <div className="flex justify-between items-baseline border-b-2 border-black text-lg font-bold">
                  <span className="flex-1"></span>
                  <span className="flex-1 text-center">{po.workerName || representativeItem.name} 様</span>
                  <span className="flex-1 text-right"></span>
              </div>
              <div className="border border-black p-3 mt-6 text-center">
                  <p className="text-lg font-semibold">{project.title}</p>
                  <p>{project.category}</p>
              </div>
            </div>
            
            <div className="w-[40%] flex flex-col items-end space-y-4">
              <table className="border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-black px-4 py-1 bg-gray-100 font-semibold">発注No.</td>
                    <td className="border border-black px-8 py-1 text-center">{poNumber}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-4 py-1 bg-gray-100 font-semibold">発注日</td>
                    <td className="border border-black px-8 py-1 text-center">{issueDate}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="pt-4 self-auto">
                <div className="relative">
                    {settings.logoUrl && <img src={settings.logoUrl} alt="会社印" className="absolute -top-4 right-0 w-14 h-14 opacity-90" />}
                    <div className="text-left mt-12">
                      <p className="font-bold">{settings.companyName}</p>
                      {settings.postalCode && <p>〒{settings.postalCode}</p>}
                      <p>{settings.address}</p>
                      {settings.tel && <p>TEL: {settings.tel}</p>}
                      <p className="mt-2">担当: {staffName}</p>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <p className="pb-4 mt-4">下記のとおり発注いたします。</p>

        <section className="mb-8">
          <table className="border-collapse w-96 text-left">
              <tbody>
                  <tr>
                    <td className="border border-black px-4 py-2 bg-gray-100 font-semibold w-1/3 text-center">合計金額</td>
                    <td className="border border-black px-4 py-2 text-center text-lg font-bold">¥{formatCurrency(totalAmount)}(税抜)</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-4 py-2 bg-gray-100 font-semibold text-center">支払条件</td>
                    <td className="border border-black px-4 py-2 text-center">{settings.paymentTerms}</td>
                  </tr>
                    <tr>
                    <td className="border border-black px-4 py-2 bg-gray-100 font-semibold text-center">納期</td>
                    <td className="border border-black px-4 py-2 text-center">{formattedDueDate}</td>
                  </tr>
              </tbody>
          </table>
        </section>

        <section>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse text-xs table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-black p-2 w-[60%] font-semibold">内容</th>
                  <th className="border border-black p-2 font-semibold">数量</th>
                  <th className="border border-black p-2 font-semibold">単価</th>
                  <th className="border border-black p-2 font-semibold">金額</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                   const unitPrice = item.quantity > 0 ? item.amount / item.quantity : 0;
                   return (
                    <tr key={index}>
                      <td className="border border-black p-2 text-center whitespace-pre-wrap">{item.content}</td>
                      <td className="border border-black p-2 text-center">{item.quantity}</td>
                      <td className="border border-black p-2 text-right">¥{formatCurrency(unitPrice)}</td>
                      <td className="border border-black p-2 text-right">¥{formatCurrency(item.amount)}</td>
                    </tr>
                   )
                })}
                {Array.from({ length: Math.max(0, 11 - items.length) }).map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td className="border-x border-black p-4"></td>
                    <td className="border-x border-black p-4"></td>
                    <td className="border-x border-black p-4"></td>
                    <td className="border-x border-black p-4"></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-semibold text-right">計</td>
                  <td className="border border-black p-2 font-semibold text-center">{totalQuantity}</td>
                  <td className="border border-black p-2 font-semibold text-right">小計</td>
                  <td className="border border-black p-2 font-semibold text-right">¥{formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {hasPaymentBreakdown && (
          <section className="flex justify-end mt-6">
            <table className="text-xs border-collapse w-80">
              <caption className="mb-1 font-semibold text-left">お支払額の内訳</caption>
              <tbody>
                <tr><td className="px-3 py-1 border border-black bg-gray-100">税抜金額</td><td className="px-3 py-1 text-right border border-black">¥{formatCurrency(totalAmount)}</td></tr>
                <tr><td className="px-3 py-1 border border-black bg-gray-100">消費税 ({taxRate}%)</td><td className="px-3 py-1 text-right border border-black">¥{formatCurrency(tax)}</td></tr>
                <tr><td className="px-3 py-1 border border-black bg-gray-100">源泉徴収税額</td><td className="px-3 py-1 text-right border border-black">{withholdingTax > 0 ? `-¥${formatCurrency(withholdingTax)}` : '対象外'}</td></tr>
                <tr className="font-bold"><td className="px-3 py-1 border border-black bg-gray-100">差引お支払額</td><td className="px-3 py-1 text-right border border-black">¥{formatCurrency(paymentAmount)}</td></tr>
              </tbody>
            </table>
          </section>
        )}
        {po.invoiceRegistrationNumber && (
          <p className="mt-2 text-xs text-right">貴社登録番号: {po.invoiceRegistrationNumber}</p>
        )}

      </div>
    </div>
  );
};

export default PurchaseOrderTemplate;