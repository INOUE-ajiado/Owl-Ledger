import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Client } from '../../types';

interface ClientListProps {
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canWrite: boolean;
}

const ClientList = ({ onEdit, onDelete, canWrite }: ClientListProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('clientCode'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setClients(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-center p-10">クライアントデータを読み込み中...</div>;
  }

  return (
    <div className="w-full bg-white/40 backdrop-blur-sm border-b border-white/20 overflow-x-auto min-h-full">
      {/* スマホ: カード表示 */}
      <ul className="divide-y md:hidden divide-white/40">
        {clients.length === 0 && <li className="py-10 text-center text-gray-500">クライアントが登録されていません。</li>}
        {clients.map(client => (
          <li key={client.id}>
            <Link to={`/clients/${client.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-white/40">
              <div className="min-w-0">
                <p className="font-medium truncate text-earth-900">{client.name}</p>
                <p className="text-xs truncate text-earth-600">{client.clientCode} ・ {client.address}</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0 text-earth-400" />
            </Link>
          </li>
        ))}
      </ul>

      <table className="hidden min-w-full md:table divide-y divide-gray-200/50">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">クライアントID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">略称</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">企業名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">住所</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {clients.length === 0 ? (
            <tr><td colSpan={5} className="text-center py-10 text-gray-500">クライアントが登録されていません。</td></tr>
          ) : (
            clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.clientCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.nameAbbr}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Link to={`/clients/${client.id}`} className="hover:underline">{client.name}</Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-4">
                  <Link to={`/clients/${client.id}`} className="text-earth-700 hover:text-earth-900">詳細</Link>
                  {canWrite && <button onClick={() => onEdit(client)} className="text-indigo-600 hover:text-indigo-900">編集</button>}
                  {canWrite && <button onClick={() => onDelete(client)} className="text-red-600 hover:text-red-900">削除</button>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ClientList;
