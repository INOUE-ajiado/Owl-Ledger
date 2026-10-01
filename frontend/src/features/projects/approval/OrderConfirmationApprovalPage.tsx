import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProgressBar from '../../../components/ProgressBar';
import { useAuth } from '../../../contexts';

// Hooks & Components
import { useOrderApprovalData } from './hooks/useOrderApprovalData';
import { useOrderApprovalActions } from './hooks/useOrderApprovalActions';
import { ApprovalHeader } from './components/ApprovalHeader';
import { ApprovalSidebar } from './components/ApprovalSidebar';
import { ApprovalContent } from './components/ApprovalContent';
import { useCompanySettings } from '../../../hooks/useCompanySettings';
import { resolveStampName } from '../../../api/stampName';

const OrderConfirmationApprovalPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const { permissions } = useAuth();
  const { settings } = useCompanySettings();

  const { project, client, loading, error, isVerified } = useOrderApprovalData(projectId);
  const actions = useOrderApprovalActions();

  useEffect(() => {
    if (project) {
      const subName = project.title.split(/[\s\u3000]+/).pop() || project.title;
      document.title = `【受注伝票】${subName}`;
    }
  }, [project]);

  // 提出できるのは管理者、またはプロジェクトの編集権限を持つ社員
  const canWrite = !!permissions && (permissions.isAdmin === true || permissions.permissions?.projects === 'write');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-4">
          <p className="text-center text-gray-600">データを読み込んでいます...</p>
          <ProgressBar />
        </div>
      </div>
    );
  }

  if (error) return <div className="p-10 text-center text-red-500">エラー: {error}</div>;
  if (!project || !client) return <div className="p-10 text-center">プロジェクトまたはクライアントのデータが見つかりません。</div>;

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <p className="text-center text-gray-600">アクセス確認中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print { 
          .no-print { display: none; } 
          body { background-color: #fff; } 
          .scaled-for-screen { transform: none !important; box-shadow: none !important; }
        }
      `}</style>

      <ApprovalHeader
        project={project}
        canWrite={canWrite}
        onToggleStatus={() => setIsStatusOpen(!isStatusOpen)}
        onSubmit={async () => {
          const userName = await resolveStampName(settings.approverStampName);
          await actions.submitForApproval(project, userName);
          alert("承認依頼を提出しました。");
        }}
        onApprove={async () => {
          const userName = await resolveStampName(settings.approverStampName);
          await actions.approve(project, userName);
          alert("受注伝票を承認しました。");
        }}
        onCopyUrl={() => actions.copyUrlToClipboard(window.location.href)}
        onPrint={actions.printDocument}
      />

      <div className="relative p-4 md:flex md:justify-center sm:p-6 lg:p-8">
        <ApprovalSidebar
          project={project}
          isStatusOpen={isStatusOpen}
        />

        <ApprovalContent
          project={project}
          client={client}
        />
      </div>
    </div>
  );
};

export default OrderConfirmationApprovalPage;