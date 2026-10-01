import type { Project, Client, InvoiceRecord } from '../../types';
import { useCompanySettings } from '../../hooks/useCompanySettings';
import { formatYen } from '../../utils/money';
import { CompanyAddress } from './CompanyInfo';

interface CreditNoteTemplateProps {
  project: Project;
  client: Client;
  record: InvoiceRecord;
}

const negative = (amount: number) => `-¥${formatYen(amount)}`;

/** 赤伝 (取消した請求書を打ち消すマイナスの請求書) */
const CreditNoteTemplate = ({ project, client, record }: CreditNoteTemplateProps) => {
  const { settings } = useCompanySettings();
  const originalNumber = record.invoiceNumber ?? project.projectId;
  const taxRate = record.taxRate ?? 10;

  return (
    <div className="p-8 font-sans text-sm leading-snug text-gray-800 bg-white shadow-2xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
      <div className="w-full max-w-4xl mx-auto">
        <header>
          <h1 className="mb-2 text-3xl font-bold text-center text-red-700">請求書（赤伝）</h1>
          <p className="mb-8 text-center text-red-700">下記請求書の取消につき、ご請求金額を差し引かせていただきます。</p>
          <div className="flex items-start justify-between leading-normal">
            <div className="w-1/2">
              <p className="text-lg">{client.name} 御中</p>
              <p className="mt-2">〒{client.postalCode}</p>
              <p>{client.address}</p>
              <p>{client.building}</p>
              <p className="mt-1">{client.department}</p>
              <p className="mt-1">{client.contactPerson && `${client.contactPerson} 様`}</p>
            </div>
            <div className="flex justify-end w-1/2">
              <div className="text-left w-[350px] pl-4">
                <div className="relative">
                  <CompanyAddress settings={settings} showRegistrationNumber />
                  {settings.sealUrl && <img src={settings.sealUrl} alt="角印" className="absolute top-[-10px] right-0 w-20 h-20 opacity-90" />}
                </div>
                <div className="mt-4">
                  <p>赤伝番号: {record.creditNoteNumber}</p>
                  <p>発行日: {record.creditNoteIssueDate}</p>
                  <p>版権担当者: {project.copyrightManager || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 mb-6">
          <p className="mb-4 text-lg">件名: {project.title}</p>
          <div className="flex items-center px-4 py-3 border-2 border-red-700">
            <p className="w-1/3 text-lg font-bold">差引金額</p>
            <div className="w-2/3 text-center text-red-700">
              <span className="text-3xl font-bold">{negative(record.total)}</span>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-black"><th className="w-1/3 py-2 font-normal text-left">取消対象の請求書番号</th><td className="py-2">{originalNumber}</td></tr>
              <tr className="border-b border-black"><th className="py-2 font-normal text-left">取消対象の請求日</th><td className="py-2">{record.issueDate}</td></tr>
              <tr className="border-b border-black"><th className="py-2 font-normal text-left">取消理由</th><td className="py-2 whitespace-pre-wrap">{record.cancelReason}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="flex items-end justify-between">
          <table className="text-xs border-b border-black">
            <thead>
              <tr className="border-b border-black"><th className="p-1 font-normal text-left" colSpan={4}>税率別内訳</th></tr>
              <tr className="border-b border-black">
                <th className="w-16 p-1 font-normal text-left border-r border-black"></th>
                <th className="w-24 p-1 font-normal text-right">税抜金額</th>
                <th className="w-24 p-1 font-normal text-right">消費税額</th>
                <th className="w-24 p-1 font-normal text-right">税込金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-1 text-center border-r border-black">{taxRate}%</td>
                <td className="p-1 text-right">{negative(record.subtotal)}</td>
                <td className="p-1 text-right">{negative(record.tax)}</td>
                <td className="p-1 text-right">{negative(record.total)}</td>
              </tr>
            </tbody>
          </table>
          <div className="w-[280px]">
            <div className="flex justify-between py-1 border-t border-black"><span>小計</span><span>{negative(record.subtotal)}</span></div>
            <div className="flex justify-between py-1 border-b border-black"><span>消費税額合計</span><span>{negative(record.tax)}</span></div>
            <div className="flex justify-between py-2 text-lg font-bold text-red-700 border-b border-black"><span>合計</span><span>{negative(record.total)}</span></div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CreditNoteTemplate;
