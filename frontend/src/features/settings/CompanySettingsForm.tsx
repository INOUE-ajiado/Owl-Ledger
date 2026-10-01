import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../api/firebase';
import { companySettingsRef, useCompanySettings } from '../../hooks/useCompanySettings';
import { recordChange } from '../../api/changeHistory';
import { useModal } from '../../contexts';
import type { CompanySettings } from '../../types';

const inputClass = 'block w-full mt-1 border-gray-300 rounded-md shadow-sm text-sm';

const Field = ({ label, children, hint, wide = false }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) => (
  <div className={wide ? 'md:col-span-2' : ''}>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

/** 帳票に印字する会社情報・振込先・税率など */
const CompanySettingsForm = () => {
  const { settings, loaded } = useCompanySettings();
  const { showModal } = useModal();
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting, isDirty } } = useForm<CompanySettings>({ defaultValues: settings });
  const [uploading, setUploading] = useState<'logoUrl' | 'sealUrl' | null>(null);

  useEffect(() => {
    if (loaded) reset(settings);
  }, [loaded, settings, reset]);

  const uploadImage = async (field: 'logoUrl' | 'sealUrl', file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      showModal({ title: 'エラー', message: 'PNG・JPEG などの画像ファイルを選択してください。' });
      return;
    }
    setUploading(field);
    try {
      const storageRef = ref(storage, `company-assets/${field}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      setValue(field, await getDownloadURL(storageRef), { shouldDirty: true });
    } catch (error) {
      console.error('画像のアップロードに失敗しました:', error);
      showModal({ title: 'エラー', message: '画像のアップロードに失敗しました。' });
    } finally {
      setUploading(null);
    }
  };

  const onSubmit = async (data: CompanySettings) => {
    const next: CompanySettings = {
      ...data,
      taxRate: Number(data.taxRate),
      monthlySalesGoal: Number(data.monthlySalesGoal) || 0,
    };
    try {
      await setDoc(companySettingsRef(), next, { merge: true });
      await recordChange({
        targetType: 'settings', targetId: 'company', targetLabel: '会社設定',
        action: 'update', before: settings as unknown as Record<string, unknown>, after: next as unknown as Record<string, unknown>,
      });
      reset(next);
      showModal({ title: '保存しました', message: '会社設定を保存しました。帳票に反映されます。' });
    } catch (error) {
      console.error('会社設定の保存に失敗しました:', error);
      showModal({ title: 'エラー', message: '会社設定の保存に失敗しました。' });
    }
  };

  const logoUrl = watch('logoUrl');
  const sealUrl = watch('sealUrl');

  if (!loaded) return <p className="p-6 text-sm text-gray-500">読み込み中...</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <section>
        <h3 className="pb-2 mb-4 font-semibold text-gray-800 border-b">会社情報 (帳票の発行元)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="会社名" wide><input {...register('companyName', { required: true })} className={inputClass} /></Field>
          <Field label="郵便番号"><input {...register('postalCode')} className={inputClass} placeholder="338-0012" /></Field>
          <Field label="電話番号"><input {...register('tel')} className={inputClass} /></Field>
          <Field label="住所" wide><input {...register('address')} className={inputClass} /></Field>
          <Field label="インボイス登録番号" hint="請求書・領収書に印字します (例: T1234567890123)">
            <input {...register('registrationNumber', { pattern: /^(T\d{13})?$/ })} className={inputClass} />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="pb-2 mb-4 font-semibold text-gray-800 border-b">振込先 (請求書に印字)</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="銀行名"><input {...register('bankName')} className={inputClass} /></Field>
          <Field label="支店名"><input {...register('branchName')} className={inputClass} /></Field>
          <Field label="口座種別">
            <select {...register('accountType')} className={inputClass}>
              <option value="普通">普通</option>
              <option value="当座">当座</option>
            </select>
          </Field>
          <Field label="口座番号"><input {...register('accountNumber')} className={inputClass} /></Field>
          <Field label="口座名義"><input {...register('accountHolder')} className={inputClass} /></Field>
          <Field label="口座名義 (カナ)"><input {...register('accountHolderKana')} className={inputClass} /></Field>
        </div>
      </section>

      <section>
        <h3 className="pb-2 mb-4 font-semibold text-gray-800 border-b">ロゴ・角印</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {([['logoUrl', 'ロゴ', logoUrl], ['sealUrl', '角印', sealUrl]] as const).map(([field, label, url]) => (
            <div key={field}>
              <p className="text-sm font-medium text-gray-700">{label}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center justify-center w-24 h-24 bg-white border rounded">
                  {url ? <img src={url} alt={label} className="object-contain max-w-full max-h-full" /> : <span className="text-xs text-gray-400">未設定</span>}
                </div>
                <div className="space-y-2">
                  <label className="inline-block px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    {uploading === field ? 'アップロード中...' : '画像を選択'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={uploading !== null}
                      onChange={e => uploadImage(field, e.target.files?.[0])} />
                  </label>
                  {url && (
                    <button type="button" onClick={() => setValue(field, '', { shouldDirty: true })} className="block text-xs text-red-600 hover:underline">削除</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="pb-2 mb-4 font-semibold text-gray-800 border-b">税率・その他</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="消費税率 (%)" hint="未確定の見積書・請求書と金額計算に使います。確定済みの請求書は確定時の税率のままです。">
            <input type="number" step="0.1" min="0" max="100" {...register('taxRate', { required: true, valueAsNumber: true, min: 0, max: 100 })} className={inputClass} />
          </Field>
          <Field label="月間売上目標 (円)" hint="ダッシュボードの目標達成率に使います">
            <input type="number" min="0" {...register('monthlySalesGoal', { valueAsNumber: true, min: 0 })} className={inputClass} />
          </Field>
          <Field label="発注書の支払条件" hint="例: 月末締め翌月末払い">
            <input {...register('paymentTerms')} className={inputClass} />
          </Field>
          <Field label="承認者名 (ログインせずに承認した場合)" hint="受注伝票・出納帳を承認URLから承認したときの承認印の名前">
            <input {...register('approverStampName')} className={inputClass} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting || !isDirty || uploading !== null} className="px-6 py-2 text-sm font-medium text-white rounded-md shadow bg-earth-600 hover:bg-earth-700 disabled:bg-earth-300">
          {isSubmitting ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  );
};

export default CompanySettingsForm;
