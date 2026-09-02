import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { LedgerReport } from '../../../../types';

interface ProcessedReportsListProps {
  reports: LedgerReport[];
  canWrite: boolean;
  isMasterUser: boolean;
  onShowApprovalLink: (id: string) => void;
  onSubmitToAccounting: (id: string) => void;
  onCopyUrl: (id: string) => void;
  onDeleteReport: (report: LedgerReport) => void;
}

const getStatusBadgeStyle = (status: LedgerReport['status']) => {
  switch (status) {
    case '承認待ち': return 'bg-yellow-100 text-yellow-800';
    case '承認済み': return 'bg-green-100 text-green-800';
    case '経理提出済み': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const ProcessedReportsList = ({ 
  reports, canWrite, isMasterUser, 
  onShowApprovalLink, onSubmitToAccounting, onCopyUrl, onDeleteReport 
}: ProcessedReportsListProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) { setOpenMenuId(null); }
    };
    if (openMenuId) { document.addEventListener('mousedown', handleClickOutside); }
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [openMenuId]);

  if (reports.length === 0) return null;

  return (
    <div className="p-4 mt-4">
      <h4 className="pt-4 mb-2 font-semibold text-gray-700 border-t">
        ▼ この月の処理中・完了済みレポート
      </h4>
      <ul className="space-y-2">
        {reports.map(report => (
          <li key={report.id} className="flex items-center justify-between p-3 rounded-md bg-gray-50">
            <div>
              <span className="font-medium">出納帳 (No.{report.reportNumber})</span>
              <span className={`ml-3 text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeStyle(report.status)}`}>
                {report.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {report.status === '承認待ち' && canWrite && (
                  <button onClick={() => onShowApprovalLink(report.id)} className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">URL再表示</button>
              )}
              {report.status === '承認済み' && canWrite && (
                <button onClick={() => onSubmitToAccounting(report.id)} className="px-3 py-1 text-xs font-medium text-white bg-purple-500 rounded-md hover:bg-purple-600">経理へ提出</button>
              )}
              <div className="relative">
                  <button onClick={() => setOpenMenuId(openMenuId === report.id ? null : report.id)} className="p-1 text-gray-400 rounded-full hover:bg-gray-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>
                  {openMenuId === report.id && (
                      <div ref={menuRef} className="absolute right-0 z-10 w-32 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                              <Link to={`/approval/${report.id}`} target="_blank" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">確認</Link>
                              <button onClick={() => { onCopyUrl(report.id); setOpenMenuId(null); }} className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">URLコピー</button>
                              {(isMasterUser || (canWrite && report.status === '承認待ち')) && (
                                <button onClick={() => onDeleteReport(report)} className="block w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-gray-100">削除</button>
                              )}
                          </div>
                      </div>
                  )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};