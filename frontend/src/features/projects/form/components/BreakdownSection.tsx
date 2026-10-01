import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import type { ProjectFormValues } from '../types';
import type { Vendor } from '../../../../types';
import { normalizeName } from '../../../../utils/names';

const LEGACY_PREFIX = 'legacy:';

export const BreakdownSection = ({ vendors }: { vendors: Vendor[] }) => {
  const { control, register, watch, setValue, formState: { errors } } = useFormContext<ProjectFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "breakdown"
  });

  const projectType = watch('projectType');

  // ラベル設定
  const labels = {
    standard: { name: '項目名', content: '詳細', quantity: '数量', amount: '金額' },
    master: { name: '案件名', content: '詳細', quantity: '数量', amount: '予算配分' },
    sub: { name: '担当者', content: '役割', quantity: '数量', amount: '配分額' },
    internal_sale: { name: '購入者', content: '品目', quantity: '個数', amount: '金額' },
  };

  const currentLabels = labels[projectType] || labels.standard;
  // 通常・子プロジェクトの内訳は外注先マスタから選ぶ (表記ゆれ防止)。マスターの案件名・社内販売の購入者は自由入力
  const usesVendorMaster = projectType === 'standard' || projectType === 'sub';

  const vendorSelectValue = (index: number) => {
    const vendorId = watch(`breakdown.${index}.vendorId` as const);
    if (vendorId && vendors.some(v => v.id === vendorId)) return vendorId;
    const name = watch(`breakdown.${index}.name` as const) || '';
    if (!name) return '';
    // 旧データ (vendorId なし) は名前で外注先を推定して表示する
    const matched = vendors.find(v => [v.name, ...(v.aliases ?? [])].some(n => normalizeName(n) === normalizeName(name)));
    return matched ? matched.id : `${LEGACY_PREFIX}${name}`;
  };

  const handleVendorChange = (index: number, value: string) => {
    const vendor = vendors.find(v => v.id === value);
    if (vendor) {
      setValue(`breakdown.${index}.vendorId` as const, vendor.id, { shouldDirty: true });
      setValue(`breakdown.${index}.name` as const, vendor.name, { shouldDirty: true, shouldValidate: true });
    } else if (value === '') {
      setValue(`breakdown.${index}.vendorId` as const, '', { shouldDirty: true });
      setValue(`breakdown.${index}.name` as const, '', { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between pb-2 mb-4 border-b">
        <h4 className="font-semibold text-gray-800">
          {projectType === 'internal_sale' ? '購入者リスト' : '内訳・配分'}
        </h4>
        <button
          type="button"
          onClick={() => append({ name: '', vendorId: '', percentage: 0, content: '', quantity: 1, amount: 0 })}
          className="flex items-center px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-50"
        >
          <Plus size={16} className="mr-1" />
          行を追加
        </button>
      </div>

      {/* ヘッダー行 */}
      <div className="hidden gap-4 mb-2 text-sm font-medium text-gray-500 sm:flex">
        <div className="flex-1">{currentLabels.name}</div>
        {projectType !== 'sub' && <div className="flex-1">{currentLabels.content}</div>}
        <div className="w-20 text-center">{currentLabels.quantity}</div>
        <div className="w-32 text-right">{currentLabels.amount}</div>
        {projectType === 'sub' && <div className="w-20 text-right">配分率(%)</div>}
        <div className="w-10"></div> {/* 削除ボタン用スペースのみ */}
      </div>

      {/* リスト行 */}
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-wrap items-start gap-2 pb-3 border-b border-gray-100 sm:gap-4 sm:pb-0 sm:border-0 sm:flex-nowrap">
            {/* 名前・担当者・購入者 */}
            <div className="flex-1 min-w-0 basis-full sm:basis-auto">
              {usesVendorMaster ? (
                <>
                  <select
                    value={vendorSelectValue(index)}
                    onChange={e => handleVendorChange(index, e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">外注先を選択</option>
                    {vendorSelectValue(index).startsWith(LEGACY_PREFIX) && (
                      <option value={vendorSelectValue(index)}>{watch(`breakdown.${index}.name` as const)} (未登録)</option>
                    )}
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <input type="hidden" {...register(`breakdown.${index}.name` as const, { required: "外注先を選択してください" })} />
                  <input type="hidden" {...register(`breakdown.${index}.vendorId` as const)} />
                </>
              ) : (
                <input
                  {...register(`breakdown.${index}.name` as const, { required: "必須です" })}
                  placeholder={currentLabels.name}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              )}
              {errors.breakdown?.[index]?.name && (
                <span className="text-xs text-red-500">{errors.breakdown[index]?.name?.message}</span>
              )}
            </div>

            {/* 詳細・品目 */}
            {projectType !== 'sub' && (
              <div className="flex-1 basis-full sm:basis-auto">
                <input
                  {...register(`breakdown.${index}.content` as const)}
                  placeholder={currentLabels.content}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            )}

            {/* 数量 */}
            <div className="w-20">
              <input
                type="number"
                {...register(`breakdown.${index}.quantity` as const, { valueAsNumber: true })}
                className="block w-full text-center border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* 金額 */}
            <div className="w-32">
              <input
                type="number"
                {...register(`breakdown.${index}.amount` as const, { valueAsNumber: true })}
                className="block w-full text-right border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {/* 配分率 */}
            {projectType === 'sub' && (
              <div className="flex items-center justify-end w-20">
                <span className="text-sm text-gray-700">
                  {watch(`breakdown.${index}.percentage` as const)?.toFixed(1)}%
                </span>
                <input type="hidden" {...register(`breakdown.${index}.percentage` as const)} />
              </div>
            )}

            {/* 削除ボタン */}
            <div className="flex items-center justify-end w-10 pt-1">
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-gray-400 transition-colors hover:text-red-500"
                title="行を削除"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {usesVendorMaster && vendors.length === 0 && (
        <p className="mt-2 text-xs text-amber-700">外注先マスタが未登録です。サイドバーの「外注先管理」から登録してください。</p>
      )}
      {fields.length === 0 && (
        <div className="py-4 text-sm text-center text-gray-500 rounded-md bg-gray-50">
          データがありません。「行を追加」ボタンを押して追加してください。
        </div>
      )}
    </section>
  );
};