import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import ProgressBar from '../../../components/ProgressBar';
import { useAuth } from '../../../contexts';

// Hooks & Components
import { useOrderApprovalData } from './hooks/useOrderApprovalData';
import { useOrderApprovalActions } from './hooks/useOrderApprovalActions';
import { ApprovalHeader } from './components/ApprovalHeader';
import { ApprovalSidebar } from './components/ApprovalSidebar';
import { ApprovalContent } from './components/ApprovalContent';
import type { UserPermissions } from '../../../types';

const OrderConfirmationApprovalPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const loggedInUser = useAuth();
  // このページで承認権限をローカルに保持します
  const [localCanWrite, setLocalCanWrite] = useState(false);

  const { project, client, loading, error, isVerified } = useOrderApprovalData(projectId);
  const actions = useOrderApprovalActions();

  // 承認権限をFirestoreから直接取得するロジック
  useEffect(() => {
    const checkMasterPermission = async () => {
      const currentUser = loggedInUser?.user;

      if (currentUser && currentUser.email) {
        // 1. マスター権限（inoue@ajiado.co.jp）は常に書き込み権限を持つ
        if (currentUser.email === 'inoue@ajiado.co.jp') {
          setLocalCanWrite(true);
          return;
        }

        // 2. 一般ユーザーの場合、Firestoreから権限ドキュメントを直接取得
        try {
          const permDoc = await getDoc(doc(db, 'permissions', currentUser.email));
          if (permDoc.exists()) {
            const permissionsData = permDoc.data() as UserPermissions;
            if (permissionsData.permissions.projects === 'write') {
              setLocalCanWrite(true);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to fetch permissions in ApprovalPage:", e);
        }
      }
      setLocalCanWrite(false);
    };

    // ユーザー認証が完了したら権限チェックを実行
    if (loggedInUser.user) {
      checkMasterPermission();
    }

  }, [loggedInUser.user]);

  useEffect(() => {
    if (project) {
      const subName = project.title.split(/[\s　]+/).pop() || project.title;
      document.title = `【受注伝票】${subName}`;
    }
  }, [project]);

  // Headerに渡す canWrite はこのローカルな値を参照
  const canWrite = localCanWrite;

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
          const userName = loggedInUser?.user?.email ? loggedInUser.user.email.split('@')[0] : (canWrite ? 'inoue' : 'anonymous');
          await actions.submitForApproval(project, userName);
          alert("承認依頼を提出しました。");
        }}
        onApprove={async () => {
          const userName = loggedInUser?.user?.email ? loggedInUser.user.email.split('@')[0] : (canWrite ? '小澤' : 'anonymous');
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