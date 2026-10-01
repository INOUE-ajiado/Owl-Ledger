import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { useStaff } from '../../hooks/useMasters';
import { useCollection } from '../../hooks/useCollection';
import { recordChange } from '../../api/changeHistory';
import { useModal } from '../../contexts';
import type { Staff } from '../../types';

type StaffDraft = Omit<Staff, 'id'>;

const emptyDraft: StaffDraft = { name: '', stampName: '', email: '', active: true, sortOrder: 100 };
const inputClass = 'block w-full border-gray-300 rounded-md shadow-sm text-sm';

const toPlain = (s: StaffDraft) => ({ name: s.name, stampName: s.stampName, email: s.email ?? '', active: s.active, sortOrder: s.sortOrder ?? 100 });

/**
 * 社員マスタ。版権担当者・発注担当者の選択肢と、提出・承認印の名前に使う。
 * ログインユーザーと紐付けるときはメールアドレスを入れる。
 */
const StaffManager = () => {
  const { staff, loading } = useStaff();
  const { items: users } = useCollection<{ id: string }>('permissions');
  const { showModal } = useModal();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<StaffDraft>(emptyDraft);

  const startEdit = (target: Staff | null) => {
    setEditingId(target ? target.id : 'new');
    setDraft(target ? { ...emptyDraft, ...target } : emptyDraft);
  };

  const save = async () => {
    const data = { ...toPlain(draft), name: draft.name.trim(), stampName: draft.stampName.trim(), email: (draft.email ?? '').trim().toLowerCase() };
    if (!data.name || !data.stampName) {
      showModal({ title: '入力エラー', message: '氏名と印鑑名を入力してください。' });
      return;
    }
    try {
      if (editingId === 'new') {
        const created = await addDoc(collection(db, 'staff'), data);
        await recordChange({ targetType: 'staff', targetId: created.id, targetLabel: data.name, action: 'create', before: null, after: data });
      } else if (editingId) {
        const before = staff.find(s => s.id === editingId);
        await updateDoc(doc(db, 'staff', editingId), data);
        await recordChange({ targetType: 'staff', targetId: editingId, targetLabel: data.name, action: 'update', before: before ? toPlain(before) : null, after: data });
      }
      setEditingId(null);
    } catch (error) {
      console.error('社員の保存に失敗しました:', error);
      showModal({ title: 'エラー', message: '保存に失敗しました。' });
    }
  };

  const remove = (target: Staff) => {
    showModal({
      title: '社員の削除',
      message: `${target.name} を社員マスタから削除しますか？\n過去の帳票に印字された名前はそのまま残ります。退職者は「有効」を外すと選択肢から消えます。`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'staff', target.id));
          await recordChange({ targetType: 'staff', targetId: target.id, targetLabel: target.name, action: 'delete', before: toPlain(target), after: null });
        } catch (error) {
          console.error('社員の削除に失敗しました:', error);
          showModal({ title: 'エラー', message: '削除に失敗しました。' });
        }
      },
    });
  };

  const editor = (
    <div className="grid grid-cols-1 gap-3 p-3 rounded-md sm:grid-cols-6 bg-earth-50">
      <label className="text-xs sm:col-span-2">氏名 (帳票に印字)<input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={inputClass} placeholder="井上 賢治" /></label>
      <label className="text-xs">印鑑名<input value={draft.stampName} onChange={e => setDraft({ ...draft, stampName: e.target.value })} className={inputClass} placeholder="井上" /></label>
      <label className="text-xs sm:col-span-2">ログイン用メール (任意)
        <input list="staff-user-emails" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} className={inputClass} placeholder="name@example.com" />
      </label>
      <label className="text-xs">表示順<input type="number" value={draft.sortOrder ?? 100} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className={inputClass} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />有効 (選択肢に表示)</label>
      <div className="flex justify-end gap-2 sm:col-span-4">
        <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm bg-white border rounded-md">キャンセル</button>
        <button type="button" onClick={save} className="px-4 py-1.5 text-sm text-white rounded-md bg-earth-600 hover:bg-earth-700">保存</button>
      </div>
      <datalist id="staff-user-emails">{users.map(u => <option key={u.id} value={u.id} />)}</datalist>
    </div>
  );

  if (loading) return <p className="p-6 text-sm text-gray-500">読み込み中...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">版権担当者・発注担当者の選択肢と、提出・承認印の名前に使います。</p>
        {editingId === null && (
          <button type="button" onClick={() => startEdit(null)} className="px-4 py-2 text-sm text-white rounded-md shadow bg-earth-600 hover:bg-earth-700">社員を追加</button>
        )}
      </div>
      {editingId === 'new' && editor}
      <ul className="bg-white border divide-y rounded-md">
        {staff.length === 0 && <li className="p-4 text-sm text-center text-gray-500">社員が登録されていません。</li>}
        {staff.map(s => (
          <li key={s.id} className="p-3">
            {editingId === s.id ? editor : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className={s.active === false ? 'opacity-50' : ''}>
                  <p className="font-medium text-gray-900">{s.name} <span className="ml-1 text-xs text-gray-500">印鑑: {s.stampName}</span>{s.active === false && <span className="ml-2 text-xs text-gray-500">(無効)</span>}</p>
                  {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" onClick={() => startEdit(s)} className="text-indigo-600 hover:underline">編集</button>
                  <button type="button" onClick={() => remove(s)} className="text-red-600 hover:underline">削除</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StaffManager;
