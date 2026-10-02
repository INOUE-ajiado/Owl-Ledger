import { useState } from 'react';
import { DatabaseBackup, Download, ShieldCheck } from 'lucide-react';
import { buildBackup, downloadJson } from './backup';
import { recordLog } from '../../api/logging';
import { useModal } from '../../contexts';
import { formatYmdDash } from '../../utils/money';

/** バックアップ: 自動バックアップの状況と、全データの手動ダウンロード */
const BackupPanel = () => {
  const { showModal } = useModal();
  const [progress, setProgress] = useState<string | null>(null);

  const handleExport = async () => {
    setProgress('準備中');
    try {
      const backup = await buildBackup(setProgress);
      const count = Object.values(backup.collections).reduce((sum, docs) => sum + Object.keys(docs).length, 0) + Object.keys(backup.purchaseOrders).length + Object.keys(backup.workCosts ?? {}).length;
      downloadJson(backup, `owl-ledger-backup_${formatYmdDash(new Date())}.json`);
      await recordLog({ action: 'EXPORT_BACKUP', targetType: 'system', targetId: 'backup', summary: `全データをバックアップ出力 (${count}件)`, status: 'success' });
    } catch (error) {
      console.error('バックアップの作成に失敗しました:', error);
      await recordLog({ action: 'EXPORT_BACKUP', targetType: 'system', targetId: 'backup', summary: 'バックアップ出力に失敗', details: (error as Error).message, status: 'error' });
      showModal({ title: 'エラー', message: 'バックアップの作成に失敗しました。' });
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="p-4 bg-white border rounded-md">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800"><ShieldCheck size={18} className="text-green-600" />自動バックアップ (Google Cloud)</h3>
        <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
          <li>データベース全体を <strong>毎日</strong> バックアップし、<strong>7 日分</strong> 保存します。</li>
          <li>さらに <strong>毎週日曜</strong> のバックアップを <strong>14 週分</strong> 保存します。</li>
          <li>復元は Google Cloud コンソール (Firestore → 障害復旧) から管理者が行います。</li>
          <li>領収書などの添付ファイルは、削除できない設定で保存しています (電子帳簿保存法の保存期間 7 年)。</li>
        </ul>
      </section>

      <section className="p-4 bg-white border rounded-md">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800"><DatabaseBackup size={18} />全データのダウンロード</h3>
        <p className="mt-2 text-sm text-gray-600">
          プロジェクト・クライアント・外注先・出納帳・発注書・設定・変更履歴などを 1 つの JSON ファイルにまとめてダウンロードします。
          社外の保管場所にも控えを残したいときに使ってください (添付ファイルの画像そのものは含みません)。
        </p>
        <button type="button" onClick={handleExport} disabled={progress !== null}
          className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm text-white rounded-md shadow bg-earth-600 hover:bg-earth-700 disabled:bg-earth-300">
          <Download size={16} />
          {progress ? `作成中... (${progress})` : 'バックアップをダウンロード'}
        </button>
      </section>
    </div>
  );
};

export default BackupPanel;
