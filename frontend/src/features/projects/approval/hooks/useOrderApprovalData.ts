import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore'; // ★ onSnapshot を追加
import { db, auth } from '../../../../api/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { Project, Client } from '../../../../types';
import { recordLog } from '../../../../api/logging';

export const useOrderApprovalData = (projectId: string | undefined) => {
    const [project, setProject] = useState<Project | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let unsubscribeProject: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            console.log("【Debug】Auth state changed. User:", user ? user.uid : "No user");

            if (!user) {
                signInAnonymously(auth).then(() => startListening(true)).catch((e) => {
                    if (isMounted) setError(`認証エラー: ${e.message}`);
                });
            } else {
                startListening(true);
            }
        });

        const startListening = (userReady: boolean) => {
            if (!projectId || !userReady) return;

            // 以前のリスナーがあれば解除
            if (unsubscribeProject) unsubscribeProject();

            console.log("【Debug】Starting listener for project:", projectId);
            unsubscribeProject = onSnapshot(doc(db, 'projects', projectId), async (snapshot) => {
                if (!isMounted) return;

                if (!snapshot.exists()) {
                    setError("指定されたプロジェクトが見つかりません。");
                    setLoading(false);
                    return;
                }

                const projectData = { id: snapshot.id, ...snapshot.data() } as Project;
                setProject(projectData);

                // クライライアント情報の取得（基本1回で良いが、簡易化のためここで行う）
                if (projectData.clientId && !client) {
                    const clientDoc = await getDoc(doc(db, 'clients', projectData.clientId));
                    if (clientDoc.exists()) {
                        setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
                    }
                }

                // パスワード認証ロジック（ステータス変更時にも維持される必要があるが、初期化時のみ実行したい場合は工夫が必要）
                // ただし、現在の実装に合わせて簡素化
                handleVerification(projectData);
                setLoading(false);
            }, (err) => {
                if (isMounted) setError(`データ取得エラー: ${err.message}`);
                setLoading(false);
            });
        };

        const handleVerification = (projectData: Project) => {
            if (projectData.previewPassword) {
                // すでに検証済みならスキップ
                if (isVerified) return;

                const password = window.prompt("この受注伝票はロックされています。パスワードを入力してください:");
                if (password === projectData.previewPassword) {
                    setIsVerified(true);
                    setError(null);
                    recordLog({
                        action: 'VIEW_ORDER_CONFIRMATION',
                        targetType: 'project',
                        targetId: projectData.id,
                        summary: `受注伝票プレビュー表示成功: ${projectData.projectId} (認証解除)`,
                        status: 'success'
                    });
                } else {
                    setError("パスワードが正しくありません。");
                    setIsVerified(false);
                }
            } else {
                setIsVerified(true);
                setError(null);
            }
        };

        return () => {
            isMounted = false;
            unsubscribeAuth();
            if (unsubscribeProject) unsubscribeProject();
        };
    }, [projectId, isVerified]); // isVerified を依存関係に含めてパスワード入力を1回にする

    return { project, client, loading, error, isVerified };
};