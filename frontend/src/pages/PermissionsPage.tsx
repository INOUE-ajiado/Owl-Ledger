import { useState, useEffect } from 'react';
import { useAppOutletContext, useAuth } from '../contexts';
import { useModal } from '../contexts';
import { recordChange } from '../api/changeHistory';
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
  const { user: currentUser } = useAuth();
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
  ];

  useEffect(() => {
    setHeaderProps({ title: 'アクセス権限', actions: undefined });

    const unsubscribe = onSnapshot(collection(db, 'permissions'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        email: doc.id,
        uid: doc.data().uid,
        permissions: doc.data().permissions as PermissionSet,
        isAdmin: doc.data().isAdmin === true,
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
    const email = newUserEmail.trim().toLowerCase();
    await setDoc(doc(db, 'permissions', email), { permissions: newUserPermissions, isAdmin: false });
    await recordChange({ targetType: 'permissions', targetId: email, targetLabel: email, action: 'create', before: null, after: { permissions: newUserPermissions, isAdmin: false } });
    setNewUserEmail('');
    showModal({ title: '成功', message: 'ユーザーを招待しました。' });
  };

  const handlePermissionChange = (email: string, key: keyof PermissionSet, value: 'write' | 'read' | 'disabled') => {
    const userToUpdate = users.find(u => u.email === email);
    if (userToUpdate) {
      const updatedPermissions = { ...userToUpdate.permissions, [key]: value };
      setDoc(doc(db, 'permissions', email), { permissions: updatedPermissions }, { merge: true })
        .then(() => recordChange({ targetType: 'permissions', targetId: email, targetLabel: email, action: 'update', changes: [{ field: `permissions.${key}`, before: userToUpdate.permissions[key] ?? '', after: value }] }));
    }
  };

  // 管理者: 権限・会社設定・ログの管理、プロジェクト/クライアントの編集ができる
  const handleAdminChange = (email: string, isAdmin: boolean) => {
    if (!isAdmin && email === currentUser?.email) {
      showModal({ title: '変更できません', message: '自分自身の管理者権限は外せません。別の管理者に依頼してください。' });
      return;
    }
    setDoc(doc(db, 'permissions', email), { isAdmin }, { merge: true })
      .then(() => recordChange({ targetType: 'permissions', targetId: email, targetLabel: email, action: 'update', changes: [{ field: 'isAdmin', before: String(!isAdmin), after: String(isAdmin) }] }))
      .catch(() => showModal({ title: 'エラー', message: '変更に失敗しました。' }));
  };
  
  const handleDelete = async (email: string) => {
    if (email === currentUser?.email) {
      showModal({ title: '削除できません', message: '自分自身は削除できません。' });
      return;
    }
    showModal({
      title: 'ユーザーの削除',
      message: `${email} を権限リストから削除しますか？`,
      onCancel: () => {}, 
      onConfirm: async () => {
        try {
          const before = users.find(u => u.email === email);
          await deleteDoc(doc(db, 'permissions', email));
          await recordChange({ targetType: 'permissions', targetId: email, targetLabel: email, action: 'delete', before: before ? { permissions: before.permissions, isAdmin: !!before.isAdmin } : null, after: null });
          showModal({ title: '成功', message: 'ユーザーを削除しました。'});
        } catch { // ★ 修正: 変数を受け取らないように変更
          showModal({ title: 'エラー', message: '削除に失敗しました。'});
        }
      }
    });
  };

  return (
    <div className="w-full min-h-full space-y-4">
      <div className="p-6 bg-white/40 backdrop-blur-sm border-b border-white/20">
        <h3 className="mb-4 text-lg font-semibold text-earth-800">新規ユーザーを招待</h3>
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
            <button type="submit" className="px-4 py-2 text-white bg-earth-600 rounded-md hover:bg-earth-700 shadow-md">招待</button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      <p className="px-6 text-xs text-earth-600">
        管理者は、アクセス権限・会社設定・実行ログの管理と、プロジェクト・クライアントの登録・編集ができます。社員の氏名や印鑑名は「会社設定 → 社員マスタ」で登録します。
      </p>
      <div className="w-full overflow-x-auto bg-white/40 backdrop-blur-sm border-y border-white/20">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ユーザー</th>
              <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">管理者</th>
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
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={user.isAdmin === true} onChange={(e) => handleAdminChange(user.email, e.target.checked)} />
                    <span className={user.isAdmin ? 'font-semibold text-earth-800' : 'text-gray-400'}>{user.isAdmin ? '管理者' : '—'}</span>
                  </label>
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