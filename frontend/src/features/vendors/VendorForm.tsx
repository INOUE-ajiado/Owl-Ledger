import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../api/firebase';
import { recordChange } from '../../api/changeHistory';
import type { Vendor } from '../../types';

type VendorFormValues = Omit<Vendor, 'id' | 'aliases'> & { aliasesText: string };

interface VendorFormProps {
  editingVendor: Vendor | null;
  // 名寄せツールから新規登録するときの初期値
  initial?: Partial<Vendor>;
  onClose: () => void;
  onSaved?: (vendorId: string) => void;
}

const inputClass = 'block w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm';

const toVendorData = (values: VendorFormValues): Omit<Vendor, 'id'> => {
  const { aliasesText, ...rest } = values;
  const aliases = Array.from(new Set(aliasesText.split(/[\n,、]/).map(s => s.trim()).filter(Boolean)));
  return {
    ...rest,
    name: rest.name.trim(),
    invoiceRegistrationNumber: (rest.invoiceRegistrationNumber || '').trim(),
    withholding: rest.type === 'individual' ? !!rest.withholding : false,
    aliases,
  };
};

const VendorForm = ({ editingVendor, initial, onClose, onSaved }: VendorFormProps) => {
  const base = editingVendor ?? initial;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<VendorFormValues>({
    defaultValues: {
      name: base?.name ?? '', kana: base?.kana ?? '', type: base?.type ?? 'individual',
      invoiceRegistrationNumber: base?.invoiceRegistrationNumber ?? '', withholding: base?.withholding ?? true,
      email: base?.email ?? '', tel: base?.tel ?? '', postalCode: base?.postalCode ?? '', address: base?.address ?? '',
      bankName: base?.bankName ?? '', branchName: base?.branchName ?? '', accountType: base?.accountType ?? '普通',
      accountNumber: base?.accountNumber ?? '', accountHolder: base?.accountHolder ?? '',
      aliasesText: (base?.aliases ?? []).join('\n'), remarks: base?.remarks ?? '',
    },
  });
  const type = watch('type');

  // 法人は源泉徴収の対象外
  useEffect(() => {
    if (type === 'corporate') setValue('withholding', false);
  }, [type, setValue]);

  const onSubmit = async (values: VendorFormValues) => {
    const data = toVendorData(values);
    try {
      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), data);
        const { id: _id, ...before } = editingVendor; // eslint-disable-line @typescript-eslint/no-unused-vars
        await recordChange({ targetType: 'vendor', targetId: editingVendor.id, targetLabel: data.name, action: 'update', before, after: data });
        onSaved?.(editingVendor.id);
      } else {
        const created = await addDoc(collection(db, 'vendors'), data);
        await recordChange({ targetType: 'vendor', targetId: created.id, targetLabel: data.name, action: 'create', before: null, after: data });
        onSaved?.(created.id);
      }
      onClose();
    } catch (error) {
      console.error('外注先の保存に失敗しました:', error);
      alert('保存に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black bg-opacity-50 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <h3 className="px-6 pt-5 pb-3 text-lg font-semibold text-gray-900 border-b">{editingVendor ? '外注先の編集' : '外注先の登録'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 px-6 py-4 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">氏名・名称 <span className="text-red-500">*</span></label>
              <input {...register('name', { required: true, validate: v => v.trim() !== '' })} className={inputClass} />
              {errors.name && <p className="mt-1 text-xs text-red-600">氏名・名称を入力してください</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">読み仮名</label>
              <input {...register('kana')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">区分</label>
              <select {...register('type')} className={inputClass}>
                <option value="individual">個人</option>
                <option value="corporate">法人</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">インボイス登録番号</label>
              <input {...register('invoiceRegistrationNumber', { pattern: /^(T\d{13})?$/ })} className={inputClass} placeholder="T1234567890123 (未登録なら空欄)" />
              {errors.invoiceRegistrationNumber && <p className="mt-1 text-xs text-red-600">T + 13桁の数字で入力してください</p>}
            </div>
            <label className={`flex items-start gap-2 text-sm sm:col-span-2 ${type === 'corporate' ? 'opacity-50' : ''}`}>
              <input type="checkbox" {...register('withholding')} disabled={type === 'corporate'} className="mt-0.5" />
              <span>源泉徴収の対象<span className="block text-xs text-gray-500">個人へのデザイン・原稿料などの報酬は源泉徴収が必要です。発注書に源泉徴収税額と差引支払額を表示します。</span></span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-sm font-medium text-gray-700">メール</label><input type="email" {...register('email')} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700">電話</label><input {...register('tel')} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700">郵便番号</label><input {...register('postalCode')} className={inputClass} /></div>
            <div><label className="block text-sm font-medium text-gray-700">住所</label><input {...register('address')} className={inputClass} /></div>
          </div>

          <div>
            <h4 className="pb-1 mb-3 text-sm font-semibold text-gray-800 border-b">振込先</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700">銀行名</label><input {...register('bankName')} className={inputClass} /></div>
              <div><label className="block text-sm font-medium text-gray-700">支店名</label><input {...register('branchName')} className={inputClass} /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700">口座種別</label>
                <select {...register('accountType')} className={inputClass}><option value="普通">普通</option><option value="当座">当座</option></select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700">口座番号</label><input {...register('accountNumber')} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700">口座名義 (カナ)</label><input {...register('accountHolder')} className={inputClass} /></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">別表記 (名寄せ用)</label>
            <textarea {...register('aliasesText')} rows={3} className={inputClass} placeholder={'過去の内訳に残っている表記を1行に1つ\n例: 新山恵美子'} />
            <p className="mt-1 text-xs text-gray-500">空白・全角半角・先頭の丸数字の違いは自動で同じ人として扱います。それ以外の表記ゆれを登録してください。</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">備考</label>
            <textarea {...register('remarks')} rows={2} className={inputClass} />
          </div>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50">キャンセル</button>
          <button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
            {isSubmitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VendorForm;
