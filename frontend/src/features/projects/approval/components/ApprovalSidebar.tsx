import type { Project } from '../../../../types';

interface ApprovalSidebarProps {
  project: Project;
  isStatusOpen: boolean; // この propはトグルに使用
}

const formatDate = (timestamp: { seconds: number; nanoseconds: number; } | undefined) => {
  if (!timestamp) return '---';
  return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

export const ApprovalSidebar = ({ project, isStatusOpen }: ApprovalSidebarProps) => {
  const statusHistory = [
    { label: '書類発行', date: formatDate(project.orderConfirmationSubmittedAt), completed: !!project.orderConfirmationSubmittedAt },
    { label: '代表承認', date: formatDate(project.orderConfirmationApprovedAt), completed: !!project.orderConfirmationApprovedAt },
  ];

  return (
    <aside className={`
      no-print flex-shrink-0 transition-all duration-300
      md:sticky md:top-8 md:mr-8
      
      // ★ 最終修正: デスクトップで表示を強制するロジック
      ${isStatusOpen
        ? 'block absolute top-0 left-4 right-4 z-20' // モバイル時に開く
        : 'hidden md:flex' // ★ MDサイズ以上では常にflexで表示を強制
      }
      
      md:relative md:w-64 // MDサイズ以上での相対配置と幅を維持
    `}>
      <div className="w-full p-4 bg-white rounded-lg shadow-md">
        <h2 className="pb-2 mb-4 font-semibold border-b">ステータス</h2>
        <div className="space-y-2">
          {statusHistory.map((item, index) => (
            <div key={index} className="flex items-start">
              <div className="flex flex-col items-center mt-1 mr-4">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
                  {item.completed && <span className="text-xs font-bold">✓</span>}
                </div>
                {index < statusHistory.length - 1 && <div className="w-px h-12 bg-gray-300"></div>}
              </div>
              <div>
                <p className={`font-medium text-sm ${item.completed ? 'text-black' : 'text-gray-500'}`}>{item.label}</p>
                <p className="text-xs text-gray-500">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};