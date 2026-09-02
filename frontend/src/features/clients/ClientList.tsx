import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { Client } from '../../types';

interface ClientListProps {
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

const ClientList = ({ onEdit, onDelete }: ClientListProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('clientCode'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const clientsData: Client[] = [];
      querySnapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(clientsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-center p-10">クライアントデータを読み込み中...</div>;
  }

  return (
    <div className="w-full bg-white/40 backdrop-blur-sm border-b border-white/20 overflow-x-auto min-h-full">
      <table className="min-w-full divide-y divide-gray-200/50">
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
              <tr key={client.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.clientCode}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.nameAbbr}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-4">
                  <button onClick={() => onEdit(client)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                  <button onClick={() => onDelete(client.id)} className="text-red-600 hover:text-red-900">削除</button>
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