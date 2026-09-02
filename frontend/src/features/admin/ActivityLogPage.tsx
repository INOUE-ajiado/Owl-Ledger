import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { ActivityLog } from '../../types';
import { useAppOutletContext } from '../../contexts';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'success': return 'text-green-600 bg-green-50';
    case 'error': return 'text-red-600 bg-red-50';
    case 'info': return 'text-blue-600 bg-blue-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const ActivityLogPage = () => {
  const { setHeaderProps } = useAppOutletContext();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHeaderProps({ title: 'システム実行ログ', actions: undefined });
    
    // ログを最新のものから取得 (リアルタイムで監視)
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch activity logs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setHeaderProps]);

  if (loading) {
    return <div className="p-10 text-center"><Loader2 className="w-6 h-6 mx-auto mb-4 animate-spin" /> ログを読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="p-4 text-sm text-yellow-800 rounded-lg bg-yellow-50">
        <AlertTriangle className="inline w-4 h-4 mr-2" />
        このログはマスターアカウントのみ閲覧可能です。機密情報を含む場合があります。
      </div>
      
      <div className="overflow-hidden bg-white rounded-lg shadow">
        <ul className="divide-y divide-gray-200">
          {logs.length === 0 ? (
            <p className="p-8 text-center text-gray-500">まだ実行ログはありません。</p>
          ) : (
            logs.map(log => (
              <li key={log.id} className="p-4 transition-colors hover:bg-gray-50">
                <div className="flex items-start justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1 space-x-2 font-semibold text-gray-900">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(log.status)}`}>
                        {log.status === 'success' && <CheckCircle className="inline w-3 h-3 mr-1" />}
                        {log.status === 'error' && <AlertTriangle className="inline w-3 h-3 mr-1" />}
                        {log.status === 'info' && <Info className="inline w-3 h-3 mr-1" />}
                        {log.action || 'No Action'}
                      </span>
                      <span className="text-xs font-normal text-gray-500">{log.userEmail || 'Unknown'}</span>
                    </div>
                    <p className="text-base text-gray-700">{log.summary || 'No summary'}</p>
                    {log.details && (
                      <p className="p-2 mt-1 font-mono text-xs text-red-500 whitespace-pre-wrap bg-gray-100 rounded">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-xs text-gray-500">
                      {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString('ja-JP') : '---'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {/* ★ 修正: targetId が存在しない場合でもエラーにならないように変更 */}
                      Target: {log.targetType || '?'}/{log.targetId ? log.targetId.slice(0, 8) : '???'}...
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default ActivityLogPage;