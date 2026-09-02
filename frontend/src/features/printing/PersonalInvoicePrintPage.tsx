import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project, Client } from '../../types';
import InvoiceTemplate from './InvoiceTemplate';
import { Printer } from 'lucide-react';

const PersonalInvoicePrintPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const targetIndex = parseInt(searchParams.get('index') || '-1', 10);

  const [mockClient, setMockClient] = useState<Client | null>(null);
  const [mockProject, setMockProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || targetIndex === -1) return;

      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;

          const targetItem = projectData.breakdown[targetIndex];

          if (targetItem) {
            // ダミーのクライアントデータ作成
            // types.ts の定義(Client)に合わせて必須項目を埋めます
            const clientData: Client = {
              id: 'personal-temp',
              clientCode: 'PERSONAL',
              name: targetItem.name,
              nameAbbr: targetItem.name,
              // 個人宛なので住所は空文字で設定
              // InvoiceTemplate側で isPersonal=true なので、値が入っていても表示はされません
              postalCode: '', 
              address: '',
            };
            
            setMockClient(clientData);

            // ダミーのプロジェクトデータ作成
            const itemAmount = Number(targetItem.amount) || 0;
            const tempProject: Project = {
              ...projectData,
              breakdown: [targetItem],
              gloss: itemAmount,
            };
            setMockProject(tempProject);
          }
        }
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, targetIndex]);

  useEffect(() => {
    if (mockProject) {
      const subName = mockProject.title.split(/[\s　]+/).pop() || mockProject.title;
      document.title = `【請求書】${subName}`;
    }
  }, [mockProject]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!mockProject || !mockClient) return <div className="p-10 text-center text-red-500">データが見つかりません。</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 text-white bg-gray-800 shadow-md no-print">
        <h1 className="text-lg font-semibold">
          個人宛請求書プレビュー: {mockClient.name} 様
        </h1>
        <button 
          onClick={handlePrint} 
          className="flex items-center gap-2 px-4 py-2 font-bold text-gray-800 transition-colors bg-white rounded hover:bg-gray-200"
        >
          <Printer size={20} />
          印刷する
        </button>
      </div>

      <div className="flex justify-center w-full py-8 print:py-0 print:bg-white">
        {/* isPersonal={true} で「様」表記・住所なしにする */}
        <InvoiceTemplate project={mockProject} client={mockClient} isPersonal={true} />
      </div>
      
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; background-color: white; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default PersonalInvoicePrintPage;