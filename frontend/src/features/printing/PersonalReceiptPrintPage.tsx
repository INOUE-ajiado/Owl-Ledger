import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Project } from '../../types';
import ReceiptTemplate from './ReceiptTemplate';
import { Printer } from 'lucide-react';

const PersonalReceiptPrintPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const targetIndex = parseInt(searchParams.get('index') || '-1', 10);

  const [project, setProject] = useState<Project | null>(null);
  // targetItemからcontentは引き続き取得しますが、テンプレートには渡しません。
  const [targetItem, setTargetItem] = useState<{ name: string; amount: number; content: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || targetIndex === -1) return;

      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
          const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
          setProject(projectData);

          const item = projectData.breakdown[targetIndex];
          if (item) {
            setTargetItem({
              name: item.name,
              amount: Number(item.amount) || 0,
              // contentは取得したまま保持します (今後の拡張に備えて)
              content: item.content || projectData.title || ''
            });
          }
        }
      } catch (error) {
        console.error("Error fetching receipt data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, targetIndex]);

  useEffect(() => {
    if (project) {
      const subName = project.title.split(/[\s　]+/).pop() || project.title;
      document.title = `【領収書】${subName}`;
    }
  }, [project]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-10 text-center">読み込み中...</div>;
  if (!project || !targetItem) return <div className="p-10 text-center text-red-500">データが見つかりません。</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 印刷用ヘッダー */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 text-white bg-gray-800 shadow-md no-print">
        <h1 className="text-lg font-semibold">
          領収書プレビュー: {targetItem.name} 様
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
        <ReceiptTemplate 
          project={project} 
          recipientName={targetItem.name}
          amount={targetItem.amount}
          // ★修正: content={targetItem.content} を削除しました
        />
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

export default PersonalReceiptPrintPage;