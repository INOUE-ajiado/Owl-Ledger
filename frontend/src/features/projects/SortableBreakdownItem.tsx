import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

interface SortableBreakdownItemProps {
  id: string;
  index: number;
  projectType: 'standard' | 'master' | 'sub' | 'internal_sale';
  onRemove: (index: number) => void;
  onPercentageChange: (index: number, value: number) => void;
  onAmountChange: (index: number, value: number) => void;
}

export const SortableBreakdownItem = ({ id, index, projectType, onRemove, onPercentageChange, onAmountChange }: SortableBreakdownItemProps) => {
  const { register } = useFormContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // ★ 修正: internal_sale の場合は ReadOnly にしない
  const isReadOnly = index === 0 && projectType !== 'sub' && projectType !== 'internal_sale';
  
  // ★ 追加: ラベルの出し分けロジック
  const getNameLabel = () => {
    if (projectType === 'internal_sale') return '購入者名';
    return index === 0 ? '親担当者' : '担当者名';
  };

  return (
    <div ref={setNodeRef} style={style} className={`grid grid-cols-12 gap-x-2 items-center p-2 rounded touch-none ${index === 0 ? 'bg-blue-50 border-blue-200 border' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-center col-span-1 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="text-gray-400" />
      </div>
      <div className="col-span-3">
        {/* ★ 修正: ラベルを動的に変更 */}
        <label className="block text-sm font-medium text-gray-700">{getNameLabel()}</label>
        <input {...register(`breakdown.${index}.name`, { required: true })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5"/>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700">内容</label>
        <input {...register(`breakdown.${index}.content`)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5"/>
      </div>
      <div className="col-span-1">
        <label className="block text-sm font-medium text-gray-700">数量</label>
        <input type="number" {...register(`breakdown.${index}.quantity`, { required: true, valueAsNumber: true, min: 1 })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5"/>
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700">金額</label>
        <input 
          type="number"
          {...register(`breakdown.${index}.amount`, { 
            valueAsNumber: true,
            onChange: (e) => onAmountChange(index, Number(e.target.value))
          })}
          readOnly={isReadOnly}
          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5 ${isReadOnly ? 'bg-gray-200' : ''}`}
        />
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700">分配率</label>
        <div className="flex items-center mt-1">
          <input 
            type="number" 
            step="0.01" 
            {...register(`breakdown.${index}.percentage`, { 
              required: true, 
              valueAsNumber: true, 
              min: 0,
              onChange: (e) => onPercentageChange(index, Number(e.target.value))
            })} 
            readOnly={isReadOnly}
            className={`block w-full border-gray-300 rounded-md shadow-sm text-sm p-1.5 ${isReadOnly ? 'bg-gray-200' : ''}`}
          />
          <span className="ml-1 text-gray-500">%</span>
        </div>
      </div>
      <div className="flex items-end justify-center h-full col-span-1 pb-1">
        {/* 社内販売の場合は1行目でも削除できるようにするなら条件を変更しますが、通常1行目は必須とするためそのままとします */}
        {index !== 0 && (
          <button type="button" onClick={() => onRemove(index)} className="p-2 text-red-500 hover:text-red-700" title="この行を削除">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};