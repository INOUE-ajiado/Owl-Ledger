import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, doc, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../../api/firebase';
import type { LedgerSubject } from '../../types';

interface SubjectManagerProps { isOpen: boolean; onClose: () => void; }

const SubjectManager = ({ isOpen, onClose }: SubjectManagerProps) => {
  const [subjects, setSubjects] = useState<LedgerSubject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'ledgerSubjects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subjectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerSubject));
      setSubjects(subjectsData);
    });
    return () => unsubscribe();
  }, [isOpen]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubject.trim() === '' || isLoading) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'ledgerSubjects'), { name: newSubject.trim() });
      setNewSubject('');
    } catch (error) {
      console.error("科目追加エラー:", error);
      alert("科目の追加に失敗しました。データベースの権限を確認してください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (window.confirm("この科目を削除しますか？")) {
      await deleteDoc(doc(db, 'ledgerSubjects', id));
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={managerRef} className="absolute top-14 right-0 w-72 bg-white rounded-md shadow-lg border z-50">
      <div className="p-4">
        <h4 className="font-semibold text-gray-800 mb-2">科目一覧</h4>
        <div className="max-h-48 overflow-y-auto mb-4 pr-2">
          {subjects.map(subject => (
            <div key={subject.id} className="flex justify-between items-center text-sm py-1">
              <span>{subject.name}</span>
              <button onClick={() => handleDeleteSubject(subject.id)} className="text-red-500 hover:text-red-700">×</button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddSubject}>
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="新しい科目を入力"
            className="w-full p-2 border rounded-md text-sm"
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-2 bg-blue-600 text-white p-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? '追加中...' : '追加'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubjectManager;