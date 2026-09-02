import { useState, useEffect } from 'react';
import { useAppOutletContext } from '../contexts';
import { useModal } from '../contexts';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import ClientList from '../features/clients/ClientList';
import ClientForm from '../features/clients/ClientForm';
import type { Client } from '../types';

const ClientPage = () => {
  const { setHeaderProps, permissions } = useAppOutletContext();
  const { showModal } = useModal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const canWrite = permissions?.permissions?.clients === 'write';

  useEffect(() => {
    setHeaderProps({
      title: 'クライアント管理',
      actions: canWrite ? (
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-earth-600 rounded-md hover:bg-earth-700 shadow-md transform hover:scale-[1.02] transition-all">
          新規クライアント追加
        </button>
      ) : undefined
    });
  }, [setHeaderProps, canWrite]);

  const handleEdit = (client: Client) => {
    if (!canWrite) return;
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canWrite) return;
    showModal({
      title: 'クライアントの削除',
      message: 'このクライアントを本当に削除しますか？この操作は元に戻せません。',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'clients', id));
          showModal({ title: '成功', message: 'クライアントを削除しました。' });
        } catch (error) {
          console.error("Error removing document: ", error);
          showModal({ title: 'エラー', message: '削除に失敗しました。' });
        }
      }
    });
  };

  return (
    <div>
      <ClientList onEdit={handleEdit} onDelete={handleDelete} />
      {isModalOpen && canWrite && <ClientForm onClose={() => { setIsModalOpen(false); setEditingClient(null); }} editingClient={editingClient} />}
    </div>
  );
};
export default ClientPage;