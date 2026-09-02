import { useState, useEffect } from 'react';
import { useAppOutletContext } from '../contexts';
import { useModal } from '../contexts';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, rtDb } from '../api/firebase';
import { ref, onValue, off } from 'firebase/database';
import type { UserPermissions, PermissionSet } from '../types';

const getPermissionSelectStyle = (value: 'read' | 'write' | 'disabled') => {
  switch (value) {
    case 'write':
      return 'bg-green-50 border-green-300 text-green-800';
    case 'read':
      return 'bg-red-50 border-red-300 text-red-800';
    case 'disabled':
      return 'bg-gray-100 border-gray-300 text-gray-500';
    default:
      return 'bg-white';
  }
};

const PermissionsPage = () => {
  const { setHeaderProps } = useAppOutletContext();
  const { showModal } = useModal();
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [activeUsers, setActiveUsers] = useState<Record<string, boolean>>({});
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState<PermissionSet>({
    dashboard: 'read',
    projects: 'read',
    clients: 'read',
    ledger: 'read',
    permissions: 'disabled',
  });

  const permissionConfig: { id: keyof PermissionSet; label: string }[] = [
    { id: 'dashboard', label: 'ダッシュボード' },
    { id: 'projects', label: 'プロジェクト' },
    { id: 'clients', label: 'クライアント' },
    { id: 'ledger', label: '出納帳' },
    { id: 'permissions', label: 'アクセス権限' },
  ];

  useEffect(() => {
    setHeaderProps({ title: 'アクセス権限', actions: undefined });

    const unsubscribe = onSnapshot(collection(db, 'permissions'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        email: doc.id,
        uid: doc.data().uid,
        permissions: doc.data().permissions as PermissionSet,
      }));
      setUsers(usersData);
    });

    const presenceRef = ref(rtDb, 'status');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onActiveValue = (snapshot: any) => {
      const statuses = snapshot.val() || {};
      const active: Record<string, boolean> = {};
      
      Object.keys(statuses).forEach(key => {
        const email = key.replace(/,/g, '.');
        active[email] = statuses[key]?.isOnline === true;
      });
      setActiveUsers(active);
    };
    
    onValue(presenceRef, onActiveValue);

    return () => {
      unsubscribe();
      off(presenceRef, 'value', onActiveValue);
    };
  }, [setHeaderProps]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) {
      showModal({ title: 'エラー', message: 'メールアドレスを入力してください。' });
      return;
    }
    await setDoc(doc(db, 'permissions', newUserEmail), { permissions: newUserPermissions });
    setNewUserEmail('');
    showModal({ title: '成功', message: 'ユーザーを招待しました。' });
  };

  const handlePermissionChange = (email: string, key: keyof PermissionSet, value: 'write' | 'read' | 'disabled') => {
    const userToUpdate = users.find(u => u.email === email);
    if (userToUpdate) {
      const updatedPermissions = { ...userToUpdate.permissions, [key]: value };
      setDoc(doc(db, 'permissions', email), { permissions: updatedPermissions }, { merge: true });
    }
  };
  
  const handleDelete = async (email: string) => {
    showModal({
      title: 'ユーザーの削除',
      message: `${email} を権限リストから削除しますか？`,
      onCancel: () => {}, 
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'permissions', email));
          showModal({ title: '成功', message: 'ユーザーを削除しました。'});
        } catch { // ★ 修正: 変数を受け取らないように変更
          showModal({ title: 'エラー', message: '削除に失敗しました。'});
        }
      }
    });
  };

  return (
    <div>
      <div className="p-6 mb-8 bg-white rounded-lg shadow">
        <h3 className="mb-4 text-lg font-semibold">新規ユーザーを招待</h3>
        <form onSubmit={handleInvite}>
          <div className="flex items-end mb-4 space-x-4">
            <div className="flex-grow">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
              <input
                type="email"
                id="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"
                placeholder="user@example.com"
              />
            </div>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">招待</button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {permissionConfig.map(({ id, label }) => (
              <div key={id}>
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <select
                  value={newUserPermissions[id]}
                  onChange={(e) => setNewUserPermissions(prev => ({ ...prev, [id]: e.target.value as 'write' | 'read' | 'disabled' }))}
                  className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm ${getPermissionSelectStyle(newUserPermissions[id])}`}
                >
                  <option value="write">編集可能</option>
                  <option value="read">閲覧のみ</option>
                  <option value="disabled">利用不可</option>
                </select>
              </div>
            ))}
          </div>
        </form>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ユーザー</th>
              {permissionConfig.map(({ label }) => (
                <th key={label} className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">{label}</th>
              ))}
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.email}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`h-2.5 w-2.5 rounded-full mr-2 ${activeUsers[user.email] ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {user.email}
                  </div>
                </td>
                {permissionConfig.map(({ id }) => (
                  <td key={id} className="px-6 py-4 text-sm whitespace-nowrap">
                    <select
                      value={user.permissions[id]}
                      onChange={(e) => handlePermissionChange(user.email, id, e.target.value as 'write' | 'read' | 'disabled')}
                      className={`rounded-md shadow-sm ${getPermissionSelectStyle(user.permissions[id])}`}
                    >
                      <option value="write">編集可能</option>
                      <option value="read">閲覧のみ</option>
                      <option value="disabled">利用不可</option>
                    </select>
                  </td>
                ))}
                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                  <button onClick={() => handleDelete(user.email)} className="text-red-600 hover:text-red-800">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionsPage;