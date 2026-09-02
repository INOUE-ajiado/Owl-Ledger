import type { Project } from '../../types';

const companySealUrl = '/assets/company-seal.png'; // 印影画像のパス

interface ReceiptTemplateProps {
  project: Project;      // プロジェクト情報
  recipientName: string; // 宛名
  amount: number;        // 金額
  // content は引数から削除済み
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

const formatDate = (dateString: string | undefined) => {
  const date = dateString ? new Date(dateString) : new Date();
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

const ReceiptTemplate = ({ project, recipientName, amount }: ReceiptTemplateProps) => {
  const issueDate = formatDate(new Date().toISOString());

  return (
    <div className="relative p-16 mx-auto font-sans text-gray-800 bg-white shadow-lg print:shadow-none" 
         style={{ width: '210mm', minHeight: '148mm' }}> {/* A5サイズ横、またはA4の半分を想定 */}
      
      <div className="relative h-full p-8 border-2 border-gray-800">
        
        {/* タイトル */}
        <h1 className="mb-12 font-serif text-3xl font-bold tracking-widest text-center">
          領収書
        </h1>

        {/* 宛名・日付行 */}
        <div className="flex items-end justify-between mb-10">
          <div className="w-7/12 pb-2 border-b border-gray-400">
            <span className="pr-4 text-2xl font-bold">{recipientName}</span>
            <span className="text-lg">様</span>
          </div>
          <div className="text-right">
            <p className="text-sm">発行日：{issueDate}</p>
            <p className="text-xs text-gray-500">管理ID: {project.projectId}</p>
          </div>
        </div>

        {/* 金額エリア */}
        <div className="px-6 py-4 mb-8 text-center bg-gray-100 border border-gray-300">
          <span className="mr-2 text-xl font-bold align-top">¥</span>
          <span className="text-4xl font-bold tracking-wider">{formatCurrency(amount)}</span>
          <span className="ml-2 text-xl font-bold align-baseline">-</span>
          <span className="ml-4 text-sm text-gray-600">(税込)</span>
        </div>

        {/* 本文・但し書き */}
        <div className="mb-16">
          <p className="mb-2 text-lg">上記正に領収いたしました。</p>
          
          {/* ★修正: 但し書き欄の幅を調整 (w-[60%] を追加して手書きスペースを制限) */}
          <div className="flex justify-start items-end mt-4 w-[60%]">
            
            {/* 1. 「但し」 */}
            <span className="flex-shrink-0 text-lg text-gray-600">但し</span> 
            
            {/* 2. 手書きスペース (横幅を制限し、中央に配置) */}
            <div className="flex-1 pb-1 mx-3 border-b border-gray-400 border-dashed">
              <span className="text-lg" style={{ visibility: 'hidden' }}>あ</span> 
            </div>

            {/* 3. 「として」 */}
            <span className="flex-shrink-0 text-lg text-gray-600">として</span>
            
          </div>
        </div>

        {/* 発行者情報 */}
        <div className="absolute bottom-8 right-8 text-right w-[300px]">
          <div className="relative inline-block text-left">
            <p className="mb-1 text-lg font-bold">株式会社亜細亜堂</p>
            <p className="text-xs leading-relaxed">
              〒338-0012<br/>
              埼玉県さいたま市中央区大戸2丁目11-7<br/>
              TEL: 048-855-3388
            </p>
            
            {/* 角印 (右上に配置) */}
            <img 
              src={companySealUrl} 
              alt="印" 
              className="absolute top-0 right-[-10px] w-20 h-20 opacity-80 mix-blend-multiply" 
            />
          </div>
        </div>

      </div>
      
      {/* 切り取り線（A4で印刷した場合の下部余白用ガイド） */}
      <div className="absolute bottom-0 left-0 hidden w-full pt-2 text-xs text-center text-gray-400 border-t border-gray-300 border-dashed print:block">
        (切り取り線)
      </div>
    </div>
  );
};

export default ReceiptTemplate;