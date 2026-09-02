import { doc, updateDoc, Timestamp } from 'firebase/firestore'; // ★ 修正: Timestamp をインポート
import { db } from '../../../../api/firebase'; // ★ 修正: パスを4階層に戻す
import type { Project } from '../../../../types'; // ★ 修正: パスを4階層に戻す
import { recordLog } from '../../../../api/logging'; // ログ機能のために追加

export const useOrderApprovalActions = () => {

    const copyUrlToClipboard = (url: string) => {
        navigator.clipboard.writeText(url).then(() => {
            alert("承認URLをクリップボードにコピーしました。");
        }).catch(err => {
            console.error("Failed to copy URL: ", err);
            alert("URLのコピーに失敗しました。");
        });
    };

    const printDocument = () => {
        window.print();
    };


    const updateProjectStatus = async (project: Project, newStatus: '承認待ち' | '承認済み', userName?: string) => {
        const projectRef = doc(db, 'projects', project.id);
        const updateData: {
            orderConfirmationStatus: '承認待ち' | '承認済み';
            orderConfirmationSubmittedAt?: Timestamp;
            orderConfirmationSubmitterName?: string;
            orderConfirmationApprovedAt?: Timestamp;
            orderConfirmationApproverName?: string;
        } = {
            orderConfirmationStatus: newStatus
        };

        if (newStatus === '承認待ち') {
            updateData.orderConfirmationSubmittedAt = Timestamp.now();
            if (userName) updateData.orderConfirmationSubmitterName = userName;
        } else if (newStatus === '承認済み') {
            updateData.orderConfirmationApprovedAt = Timestamp.now();
            if (userName) updateData.orderConfirmationApproverName = userName;
        }

        try {
            await updateDoc(projectRef, updateData);

            // ★ ログ記録
            const actionType = newStatus === '承認済み' ? 'APPROVE_ORDER_CONFIRMATION' : 'SUBMIT_ORDER_CONFIRMATION';
            const summary = newStatus === '承認済み' ? '受注伝票を承認' : '受注伝票を提出';
            await recordLog({
                action: actionType,
                targetType: 'project',
                targetId: project.id,
                summary: `${summary}: ${project.projectId}`,
                status: 'success'
            });

        } catch (error) {
            console.error(`Error updating project status to ${newStatus}: `, error);
            await recordLog({
                action: newStatus === '承認済み' ? 'APPROVE_ORDER_CONFIRMATION' : 'SUBMIT_ORDER_CONFIRMATION',
                targetType: 'project',
                targetId: project.id,
                summary: `受注伝票${newStatus}処理中にエラー`,
                details: (error as Error).message,
                status: 'error'
            });
            throw new Error(`ステータス更新に失敗しました: ${(error as Error).message}`);
        }
    };

    return {
        // userId 引数を削除
        submitForApproval: (project: Project, userName?: string) => updateProjectStatus(project, '承認待ち', userName),
        approve: (project: Project, userName?: string) => updateProjectStatus(project, '承認済み', userName),
        copyUrlToClipboard,
        printDocument,
    };
};