import { useFormContext } from 'react-hook-form';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
};

const SummaryCard = ({ label, value, isMain = false }: { label: string, value: string, isMain?: boolean }) => (
  <div className="p-3 rounded-lg bg-gray-50">
    <label className="block text-sm font-medium text-gray-500">{label}</label>
    <p className={`text-gray-800 font-bold ${isMain ? 'text-2xl' : 'text-lg'}`}>
      ¥ {value}
    </p>
  </div>
);

export const FinancialSection = () => {
  const { register, watch } = useFormContext();
  const projectType = watch('projectType');
  const watchedValues = watch();

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* 左側: 入力フィールド */}
      <div className="space-y-4">
        <h4 className="pb-2 mb-4 font-semibold text-gray-800 border-b">金額計算</h4>
        
        {projectType === 'standard' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">① GLOSS (売上)</label>
            <div className="flex items-center mt-1">
              <input type="number" {...register("gloss", { valueAsNumber: true })} className="block w-full border-gray-300 rounded-md shadow-sm"/>
              <span className="ml-2 text-gray-500">円</span>
            </div>
            <div className="flex items-center mt-2 space-x-4">
              <label className="flex items-center text-sm"><input type="radio" {...register("taxType")} value="exclusive" className="w-4 h-4"/> <span className="ml-2">税抜</span></label>
              <label className="flex items-center text-sm"><input type="radio" {...register("taxType")} value="inclusive" className="w-4 h-4"/> <span className="ml-2">税込</span></label>
            </div>
          </div>
        )}

        {projectType === 'master' && (
            <div>
                <label className="block text-sm font-medium text-gray-700">年間総予算</label>
                <div className="flex items-center mt-1">
                    <input type="number" {...register("totalBudget", { valueAsNumber: true })} className="block w-full border-gray-300 rounded-md shadow-sm"/>
                    <span className="ml-2 text-gray-500">円</span>
                </div>
            </div>
        )}

        {projectType === 'sub' && (
            <div>
                <label className="block text-sm font-medium text-gray-700">捻出額</label>
                <div className="flex items-center mt-1">
                    <input type="number" {...register("allocatedAmount", { valueAsNumber: true })} className="block w-full border-gray-300 rounded-md shadow-sm"/>
                    <span className="ml-2 text-gray-500">円</span>
                </div>
            </div>
        )}

        {projectType === 'internal_sale' && (
            <div>
                <label className="block text-sm font-medium text-gray-700">販売総額 (自動計算)</label>
                <div className="flex items-center mt-1">
                    <input type="text" value={formatCurrency(Number(watchedValues.gloss || 0))} readOnly className="block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
                    <span className="ml-2 text-gray-500">円</span>
                </div>
            </div>
        )}

        {projectType !== 'master' && projectType !== 'internal_sale' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">② MARGIN料率</label>
              <div className="flex items-center mt-1">
                <input type="number" {...register("marginRate", { valueAsNumber: true, min: 0, max: 100 })} readOnly={projectType === 'sub'} className={`block w-full border-gray-300 rounded-md shadow-sm ${projectType === 'sub' ? 'bg-gray-200' : ''}`}/>
                <span className="ml-2 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">キャラクター体数</label>
              <div className="flex items-center mt-1">
                <input type="number" {...register("characterCount", { valueAsNumber: true, min: 1 })} className="block w-full border-gray-300 rounded-md shadow-sm"/>
                <span className="ml-2 text-gray-500">体</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 右側: サマリー表示 */}
      <div className="space-y-4">
        <h4 className="pb-2 mb-4 font-semibold text-gray-800 border-b">計算結果サマリー</h4>
        {projectType !== 'master' && projectType !== 'internal_sale' && (
            <div className="space-y-4">
                <SummaryCard label="NET (作業者取り分合計)" value={watchedValues.net || '0'} isMain={true} />
                <SummaryCard label="MARGIN (会社取り分)" value={watchedValues.margin || '0'} />
                <SummaryCard label="NET単価 (1体あたり)" value={watchedValues.netUnitPrice || '0'} />
                
                <div className="p-3 rounded-lg bg-gray-50">
                <label className="block text-sm font-medium text-gray-500">③ NET料率</label>
                <div className="flex items-center mt-1">
                    <input type="text" {...register("netRate")} readOnly className="block w-full bg-gray-100 border-gray-200 rounded-md shadow-sm"/>
                    <span className="ml-2 text-gray-500">%</span>
                </div>
                </div>

                <h4 className="pt-4 pb-2 mb-2 font-semibold text-gray-800 border-b">価格交渉料</h4>
                <div>
                <label className="block text-sm font-medium text-gray-700">価格交渉料率</label>
                <div className="flex items-center mt-1">
                    <input type="number" step="0.1" {...register("negotiationFeeRate", { valueAsNumber: true })} className="block w-full border-gray-300 rounded-md shadow-sm"/>
                    <span className="ml-2 text-gray-500">%</span>
                </div>
                </div>
                <div>
                  <SummaryCard label="価格交渉料 (GLOSSから算出)" value={watchedValues.negotiationFee || '0'} />
                  <p className="text-xs text-gray-500 mt-1.5 pl-1 leading-relaxed">
                    ※価格交渉料は「GLOSS（税別）× 価格交渉料率」で計算されます。<br />
                    ※最低保証料は4,000円、最高額（上限）は10,000円となります。
                  </p>
                </div>
            </div>
        )}
        {projectType === 'master' && <p className="text-sm text-gray-500">マスタープロジェクトにはサマリーはありません。</p>}
        {projectType === 'internal_sale' && <p className="text-sm text-gray-500">社内販売のため、マージン計算等のサマリーはありません。</p>}
      </div>
    </div>
  );
};