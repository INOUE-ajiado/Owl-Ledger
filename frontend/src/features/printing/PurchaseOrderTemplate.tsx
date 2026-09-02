import type { Project, BreakdownItem } from '../../types';

const companyLogoUrl = '/assets/company-logo.png';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

interface PurchaseOrderTemplateProps {  
  project: Project;
  items: BreakdownItem[];
}

const PurchaseOrderTemplate = ({ project, items }: PurchaseOrderTemplateProps) => {
  if (items.length === 0) return null;

  const issueDate = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/-/g, '/');
  
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
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
                  <span className="flex-1 text-center">{representativeItem.name} 様</span>
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
                    <td className="border border-black px-8 py-1 text-center">{project.projectId}-PO</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-4 py-1 bg-gray-100 font-semibold">発注日</td>
                    <td className="border border-black px-8 py-1 text-center">{issueDate}</td>
                  </tr>
                </tbody>
              </table>
              
              <div className="pt-4 self-auto">
                <div className="relative">
                    <img src={companyLogoUrl} alt="会社印" className="absolute -top-4 right-0 w-14 h-14 opacity-90" />
                    <div className="text-left mt-12">
                      <p className="font-bold">株式会社亜細亜堂</p>
                      <p>〒338-0012</p>
                      <p>埼玉県さいたま市中央区大戸 2-11-7</p>
                      <p>TEL: 048-855-3388</p>
                      <p className="mt-2">担当: 井上 賢治</p>
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
                    <td className="border border-black px-4 py-2 text-center">月末締め翌月末払い</td>
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

      </div>
    </div>
  );
};

export default PurchaseOrderTemplate;