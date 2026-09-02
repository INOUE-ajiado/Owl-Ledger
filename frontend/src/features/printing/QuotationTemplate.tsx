import type { Project, Client } from '../../types';

const companyLogoUrl = '/assets/company-logo.png';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

interface QuotationTemplateProps {
  project: Project;
  client: Client;
}

const QuotationTemplate = ({ project, client }: QuotationTemplateProps) => {

  const issueDateStr = project.firstQuotationDate || new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

  let subtotal: number;
  let tax: number;
  let total: number;

  if (project.taxType === 'inclusive') {
    total = project.gloss;
    subtotal = total / 1.1;
    tax = total - subtotal;
  } else {
    subtotal = project.gloss;
    tax = subtotal * 0.1;
    total = subtotal + tax;
  }

  const unitPrice = project.characterCount > 0 ? subtotal / project.characterCount : 0;

  const quotationNumber = project.projectId;
  const personInCharge = '井上 賢治';

  // --- 修正箇所：納品日の表示優先ロジック ---
  // dueDate（納期）があれば優先、なければ registrationDate（登録日）を使用
  const deliveryDateDisplay = (project.dueDate || project.registrationDate).replace(/-/g, '/');

  return (
    <div className="p-8 font-sans text-sm leading-snug text-gray-800 bg-white shadow-2xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="w-full max-w-4xl mx-auto">

        <header>
          <h1 className="mb-10 text-3xl font-bold text-center">御見積書</h1>
          <div className="flex items-start justify-between leading-normal">
            <div className="w-1/2">
              <p className="text-lg">{client.name} 御中</p>
              <p className="mt-2">〒{client.postalCode}</p>
              <p>{client.address}</p>
              <p>{client.building}</p>
              <p className="mt-1">{client.department}</p>
              <p className="mt-1">{client.contactPerson} 様</p>
            </div>

            <div className="flex justify-end w-1/2">
              <div className="text-left w-[350px]">
                <div className="relative">
                  <div className="pl-4">
                    <p className="font-bold">株式会社亜細亜堂</p>
                    <p className="mt-2">〒338-0012</p>
                    <p>埼玉県さいたま市中央区大戸2丁目11-7</p>
                    <p>TEL: 048-855-3388</p>
                  </div>
                </div>

                <div className="flex items-center justify-start mt-4">
                  <div className="pl-4">
                    <p>見積書番号: {quotationNumber}</p>
                    <p>発行日: {issueDateStr}</p>
                    <p>版権担当者: {personInCharge}</p>
                  </div>
                  <div className="ml-4">
                    <img src={companyLogoUrl} alt="会社ロゴ" className="w-auto h-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 mb-8">
          <p className="mb-4 text-lg">件名: {project.title}</p>
          <div className="flex items-center px-4 py-3 border-2 border-black">
            <p className="w-1/3 text-lg font-bold">お見積金額</p>
            <div className="w-2/3 text-center">
              <span className="text-3xl font-bold">{formatCurrency(total)}</span>
              <span className="ml-2">円</span>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-black">
                <th className="font-normal py-2 w-[15%]">納品日</th>
                <th className="font-normal py-2 w-[40%]">品目</th>
                <th className="py-2 font-normal text-right">単価 (外税)</th>
                <th className="py-2 font-normal text-right">数量</th>
                <th className="py-2 font-normal text-right">価格 (外税)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* --- 修正箇所：変数を registrationDate から deliveryDateDisplay に変更 --- */}
                <td className="py-2">{deliveryDateDisplay}</td>
                <td className="py-2">{project.category}</td>
                <td className="py-2 text-right">¥{formatCurrency(unitPrice)}</td>
                <td className="py-2 text-right">{project.characterCount}</td>
                <td className="py-2 text-right">¥{formatCurrency(subtotal)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="flex items-end justify-between mt-4">
          <div>
            <table className="text-xs border-b border-black">
              <thead>
                <tr className="border-b border-black">
                  <th className="p-1 font-normal text-left" colSpan={4}>税率別内訳</th>
                </tr>
                <tr className="border-b border-black">
                  <th className="w-16 p-1 font-normal text-left border-r border-black"></th>
                  <th className="w-24 p-1 font-normal text-right">税抜金額</th>
                  <th className="w-24 p-1 font-normal text-right">消費税額</th>
                  <th className="w-24 p-1 font-normal text-right">税込金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1 text-center border-r border-black">10%</td>
                  <td className="p-1 text-right">¥{formatCurrency(subtotal)}</td>
                  <td className="p-1 text-right">¥{formatCurrency(tax)}</td>
                  <td className="p-1 text-right">¥{formatCurrency(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="w-[280px]">
            <div className="flex justify-between py-1 border-t border-black">
              <span>小計</span>
              <span>¥{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-black">
              <span>消費税額合計</span>
              <span>¥{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between py-2 text-lg font-bold border-b border-black">
              <span>合計</span>
              <span>¥{formatCurrency(total)}</span>
            </div>
          </div>
        </section>

        <footer className="mt-8 space-y-4">
          <div>
            <p className="mb-1 font-bold">備考</p>
            <div className="h-24 p-3 whitespace-pre-wrap border border-black">{project.remarks}</div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default QuotationTemplate;