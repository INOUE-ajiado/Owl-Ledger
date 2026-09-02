import type { Project, Client } from '../../types';

const companySealUrl = '/assets/company-seal.png';
const companyLogoUrl = '/assets/company-logo.png';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

interface InvoiceTemplateProps {
  project: Project;
  client: Client;
  // ★ 追加: 個人宛モードフラグ (デフォルトは false)
  isPersonal?: boolean;
}

const InvoiceTemplate = ({ project, client, isPersonal = false }: InvoiceTemplateProps) => {
  
  let issueDateStr: string;
  let dueDate: string;
  let subtotal: number;
  let tax: number;
  let total: number;
  let unitPrice: number;

  if (project.isFixed && project.fixedInvoiceData) {
    const data = project.fixedInvoiceData;
    issueDateStr = data.issueDate;
    dueDate = data.dueDate;
    subtotal = data.subtotal;
    tax = data.tax;
    total = data.total;
    unitPrice = data.unitPrice;
  } else {
    const issueDate = new Date();
    const twoMonthsAhead = new Date(issueDate.getFullYear(), issueDate.getMonth() + 2, 1);
    const lastDayOfNextMonth = new Date(twoMonthsAhead.getTime() - (24 * 60 * 60 * 1000));
    
    issueDateStr = issueDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
    dueDate = lastDayOfNextMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

    if (project.taxType === 'inclusive') {
      total = project.gloss;
      subtotal = total / 1.1;
      tax = total - subtotal;
    } else {
      subtotal = project.gloss;
      tax = subtotal * 0.1;
      total = subtotal + tax;
    }
    unitPrice = project.characterCount > 0 ? subtotal / project.characterCount : 0;
  }
  
  const invoiceNumber = project.projectId;
  const personInCharge = '井上 賢治';

  return (
    <div className="p-8 font-sans text-sm leading-snug text-gray-800 bg-white shadow-2xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="w-full max-w-4xl mx-auto">
        
        <header>
          <h1 className="mb-10 text-3xl font-bold text-center">請求書</h1>
          <div className="flex items-start justify-between leading-normal">
            <div className="w-1/2">
              
              {/* ★ 修正: 個人宛なら「様」、通常なら「御中」 */}
              <p className="text-lg">{client.name} {isPersonal ? '様' : '御中'}</p>

              {/* ★ 修正: 個人宛でない場合のみ住所情報を表示 */}
              {!isPersonal && (
                <>
                  <p className="mt-2">〒{client.postalCode}</p>
                  <p>{client.address}</p>
                  <p>{client.building}</p>
                  <p className="mt-1">{client.department}</p>
                  <p className="mt-1">{client.contactPerson && `${client.contactPerson} 様`}</p>
                </>
              )}
            </div>
            
            <div className="flex justify-end w-1/2">
              <div className="text-left w-[350px]">
                <div className="relative">
                  <div className="pl-4">
                    <p className="font-bold">株式会社亜細亜堂</p>
                    <p>登録番号: T9030001000285</p>
                    <p className="mt-2">〒338-0012</p>
                    <p>埼玉県さいたま市中央区大戸2丁目11-7</p>
                    <p>TEL: 048-855-3388</p>
                  </div>
                  <img src={companySealUrl} alt="角印" className="absolute top-[-10px] right-0 w-20 h-20 opacity-90" />
                </div>

                <div className="flex items-center justify-start mt-4">
                  <div className="pl-4">
                    <p>請求書番号: {invoiceNumber}</p>
                    <p>請求日: {issueDateStr}</p>
                    <p>お支払期限: {dueDate}</p>
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
            <p className="w-1/3 text-lg font-bold">ご請求金額</p>
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
                <td className="py-2">{(project.dueDate || project.registrationDate || '').replace(/-/g, '/')}</td>
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
            <p className="mb-1 font-bold">振込先</p>
            <div className="p-3 border border-black">
              <p>みずほ銀行 浦和支店</p>
              <p>普通預金 1097361</p>
              <p>株式会社 亜細亜堂</p>
              <p>カ)アジアドウ</p>
            </div>
          </div>
          <div>
            <p className="mb-1 font-bold">備考</p>
            <div className="h-24 p-3 whitespace-pre-wrap border border-black">{project.remarks}</div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default InvoiceTemplate;