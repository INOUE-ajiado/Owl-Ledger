import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../../../../api/firebase';
import axios from 'axios';
import { useModal } from '../../../../contexts';
import type { LedgerEntry, LedgerReport, LedgerSubject } from '../../../../types';

// フォームの型定義
type LedgerFormData = Omit<LedgerEntry, 'id' | 'income' | 'expense' | 'receiptImageUrl' | 'subject'> & {
  income: number | '';
  expense: number | '';
  subject: { value: string }[];
};

interface LedgerEntryFormProps {
  currentReport: LedgerReport | null;
  subjects: LedgerSubject[];
  editingEntry: LedgerEntry | null;
  onSave: (entry: LedgerEntry) => Promise<void>;
  onCancelEdit: () => void;
  isLocked: boolean;
}

const FormProgressBar = () => (
  <div className="inline-block w-48 ml-4 align-middle">
    <style>{`
      @keyframes progress-bar-animation { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      .animate-progress-bar { animation: progress-bar-animation 1.5s ease-in-out infinite; }
    `}</style>
    <div className="relative w-full bg-white/30 border border-white/20 rounded-full h-2 overflow-hidden">
      <div className="absolute top-0 left-0 w-1/2 h-full bg-earth-500 rounded-full animate-progress-bar shadow-sm"></div>
    </div>
  </div>
);

export const LedgerEntryForm = ({ currentReport, subjects, editingEntry, onSave, onCancelEdit, isLocked }: LedgerEntryFormProps) => {
  const { showModal } = useModal();
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [receiptUrlToSave, setReceiptUrlToSave] = useState<string | null>(null);
  const [manualFileName, setManualFileName] = useState<string | null>(null);
  const [isFormUploading, setIsFormUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, setValue, control } = useForm<LedgerFormData>({
    defaultValues: { subject: [{ value: "" }] }
  });
  const { fields: subjectFields, append: appendSubject, remove: removeSubject } = useFieldArray({ control, name: "subject" });

  const resetFormState = useCallback(() => {
    reset({ date: '', subject: [{ value: "" }], description: '', payee: '', income: '', expense: '' });
    setOcrPreviewUrl(null);
    setReceiptUrlToSave(null);
    setManualFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (manualFileInputRef.current) manualFileInputRef.current.value = "";
  }, [reset]);

  useEffect(() => {
    if (editingEntry) {
      setValue('date', editingEntry.date);
      setValue('description', editingEntry.description);
      setValue('payee', editingEntry.payee);
      setValue('income', editingEntry.income || '');
      setValue('expense', editingEntry.expense || '');

      const subjectsForForm = Array.isArray(editingEntry.subject)
        ? editingEntry.subject.map((s: string) => ({ value: s }))
        : [{ value: (editingEntry.subject as unknown as string) || "" }];

      if (subjectsForForm.length === 0) subjectsForForm.push({ value: '' });
      setValue('subject', subjectsForForm);

      setReceiptUrlToSave(editingEntry.receiptImageUrl || null);
      setOcrPreviewUrl(editingEntry.receiptImageUrl || null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      resetFormState();
    }
  }, [editingEntry, setValue, resetFormState]);

  const handleCancel = () => {
    resetFormState();
    onCancelEdit();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    resetFormState();
    setOcrPreviewUrl(URL.createObjectURL(file));
    setIsOcrLoading(true);

    const storageRef = ref(storage, `receipt-images/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setReceiptUrlToSave(downloadURL);

      const formData = new FormData();
      formData.append('receipt', file);
      const response = await axios.post('/api/ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      setValue('date', data.date || new Date().toISOString().slice(0, 10));
      setValue('description', data.storeName || '');
      setValue('payee', data.storeName || '');
      setValue('expense', Number(data.totalAmount) || '');
      setValue('income', '');
      setValue('subject', [{ value: "" }]);

    } catch (error) {
      console.error("Image upload or OCR failed:", error);
      showModal({ title: "エラー", message: '画像のアップロードまたはOCR処理に失敗しました。' });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleManualFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsFormUploading(true);
    setManualFileName(file.name);

    const storageRef = ref(storage, `receipt-images/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setReceiptUrlToSave(downloadURL);
    } catch (error) {
      console.error("Manual file upload failed:", error);
      showModal({ title: "エラー", message: 'ファイルのアップロードに失敗しました。' });
      setManualFileName(null);
    } finally {
      setIsFormUploading(false);
    }
  };

  const onSubmit = async (data: LedgerFormData) => {
    const subjectValues = data.subject.map(s => s.value).filter(Boolean);

    // Firestoreエラー回避のため、すべてのプロパティから undefined を排除する
    const entryData: LedgerEntry = {
      id: editingEntry ? editingEntry.id : new Date().getTime().toString(),
      date: data.date || "",
      description: data.description || "",
      payee: data.payee || "",
      subject: subjectValues,
      income: Number(data.income) || 0,
      expense: Number(data.expense) || 0,
      // undefinedを避けるため、値がある場合のみプロパティを設定
      ...(receiptUrlToSave ? { receiptImageUrl: receiptUrlToSave } : {})
    };

    await onSave(entryData);
    resetFormState();
  };

  if (currentReport && isLocked) {
    return (
      <div className="p-4 mb-8 bg-white rounded-lg shadow">
        <div className="p-4 text-center rounded-md bg-yellow-50">
          <p className="font-semibold text-yellow-700">この月のレポートは「{currentReport.status}」です。</p>
          <p className="text-sm text-yellow-600">このレポートは編集できません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 mb-8 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{editingEntry ? '明細を編集' : '新規明細登録'}</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-sm font-medium text-earth-800 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 transition-all shadow-sm"
          disabled={isOcrLoading}
        >
          {isOcrLoading ? "解析中..." : "レシートから読み込む"}
        </button>
        <input type="file" accept="image/jpeg, image/png, image/heic" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>

      {ocrPreviewUrl && (<div className="p-2 mb-4 rounded-md bg-gray-50"><img src={ocrPreviewUrl} alt="プレビュー" className="mx-auto rounded max-h-32" /></div>)}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <div className="md:col-span-2">
            <input type="date" {...register("date", { required: true })} className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50" />
          </div>

          <div className="space-y-2 md:col-span-4">
            {subjectFields.map((field, index) => (
              <div key={field.id} className="flex items-center space-x-2">
                <select {...register(`subject.${index}.value` as const, { required: true })} className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50">
                  <option value="">科目を選択</option>
                  {subjects.map(subject => (<option key={subject.id} value={subject.name}>{subject.name}</option>))}
                </select>
                {subjectFields.length > 1 && (
                  <button type="button" onClick={() => removeSubject(index)} className="p-1 text-red-500 rounded-full hover:bg-red-100">×</button>
                )}
                {index === subjectFields.length - 1 && (
                  <button type="button" onClick={() => appendSubject({ value: "" })} className="p-1 px-2 text-earth-600 font-bold rounded-full hover:bg-white/40">+</button>
                )}
              </div>
            ))}
          </div>

          <div className="md:col-span-6">
            <textarea {...register("description", { required: true })} placeholder="摘要" className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50" rows={1} />
          </div>
          <div className="md:col-span-6">
            <input {...register("payee")} placeholder="支払い先" className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50" />
          </div>
          <div className="md:col-span-3">
            <input type="number" {...register("income", { valueAsNumber: true })} placeholder="入金額" className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50" />
          </div>
          <div className="md:col-span-3">
            <input type="number" {...register("expense", { valueAsNumber: true })} placeholder="出金額" className="py-1.5 px-2.5 text-sm border rounded w-full bg-gray-50" />
          </div>
        </div>

        <div className="flex items-center justify-end mt-3 space-x-3">
          <div className="flex items-center">
            <button type="button" onClick={() => manualFileInputRef.current?.click()} className="px-3 py-1 text-xs font-medium text-earth-700 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 transition-all" disabled={isFormUploading}>ファイル添付</button>
            <input type="file" ref={manualFileInputRef} onChange={handleManualFileChange} className="hidden" accept="image/jpeg,image/png,image/heic,application/pdf" />
            {isFormUploading ? <FormProgressBar /> : (manualFileName && <span className="ml-2 text-xs text-earth-500">{manualFileName}</span>)}
          </div>
          {editingEntry && (
            <button type="button" onClick={handleCancel} className="bg-white/30 border border-white/20 text-earth-800 px-4 py-1.5 rounded-md hover:bg-white/50 text-sm transition-all">キャンセル</button>
          )}
          <button type="submit" className="bg-[#8B9A8B] text-white px-6 py-1.5 rounded-md hover:bg-[#7a887a] w-32 disabled:bg-earth-200 text-sm shadow-md transition-all active:scale-95" disabled={isFormUploading}>
            {isFormUploading ? '中' : (editingEntry ? '更新' : '追加')}
          </button>
        </div>
      </form>
    </div>
  );
};