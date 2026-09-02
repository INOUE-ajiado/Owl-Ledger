import type { Project, Client } from '../../types';

const companyLogoUrl = '/assets/company-logo.png';

interface ShippingSlipTemplateProps {
    project: Project;
    client: Client;
}

const ShippingSlipTemplate = ({ project, client }: ShippingSlipTemplateProps) => {
    const issueDateStr = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const breakdown = project.breakdown || [];

    return (
        <div className="p-8 font-sans text-sm leading-snug text-gray-800 bg-white shadow-2xl print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="w-full max-w-4xl mx-auto">

                <header className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-widest border-b-2 border-black pb-2 inline-block px-12">発送伝票</h1>
                </header>

                <div className="flex items-start justify-between mb-12">
                    <div className="w-1/2">
                        <p className="text-lg font-semibold">{client.name} 御中</p>
                        <div className="mt-4 space-y-1">
                            <p>〒{client.postalCode}</p>
                            <p>{client.address}</p>
                            <p>{client.building}</p>
                            <p className="mt-2">{client.department}</p>
                            <p>{client.contactPerson && `${client.contactPerson} 様`}</p>
                        </div>
                    </div>

                    <div className="w-1/2 text-right">
                        <div className="inline-block text-left border-l-2 border-gray-300 pl-6">
                            <p className="font-bold text-lg mb-2">株式会社亜細亜堂</p>
                            <p>〒338-0012</p>
                            <p>埼玉県さいたま市中央区大戸2丁目11-7</p>
                            <p>TEL: 048-855-3388</p>
                            <div className="mt-4 flex items-center justify-end">
                                <div className="mr-4 text-right">
                                    <p>発行元: 井上 賢治</p>
                                    <p>発行日: {issueDateStr}</p>
                                </div>
                                <img src={companyLogoUrl} alt="会社ロゴ" className="w-auto h-16" />
                            </div>
                        </div>
                    </div>
                </div>

                <section className="mb-8">
                    <h2 className="text-lg font-bold mb-4 border-b border-gray-400 pb-1">発送内容</h2>
                    <div className="mb-4">
                        <p className="text-base font-medium">案件名: {project.title}</p>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-t border-b border-black">
                                <th className="py-2 px-4 text-left font-semibold">品名 / 項目</th>
                                <th className="py-2 px-4 text-center font-semibold w-24">数量</th>
                                <th className="py-2 px-4 text-left font-semibold">摘要</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breakdown.length > 0 ? (
                                breakdown.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-300">
                                        <td className="py-3 px-4">{item.name}</td>
                                        <td className="py-3 px-4 text-center">{item.quantity}</td>
                                        <td className="py-3 px-4 text-gray-600">{item.content || '-'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="border-b border-gray-300">
                                    <td className="py-3 px-4">{project.category}</td>
                                    <td className="py-3 px-4 text-center">1</td>
                                    <td className="py-3 px-4 text-gray-600">-</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="mt-12">
                    <h2 className="text-lg font-bold mb-4 border-b border-gray-400 pb-1">備考</h2>
                    <div className="min-h-[100px] p-4 border border-gray-300 rounded whitespace-pre-wrap text-gray-700">
                        {project.remarks || '特記事項なし'}
                    </div>
                </section>

                <footer className="mt-20 text-center text-gray-500 text-xs">
                    <p>毎度ありがとうございます。内容をご確認ください。</p>
                </footer>
            </div>
        </div>
    );
};

export default ShippingSlipTemplate;
