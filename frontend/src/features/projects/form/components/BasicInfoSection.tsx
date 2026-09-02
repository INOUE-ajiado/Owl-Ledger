import { useFormContext } from 'react-hook-form';
import type { Project, Client } from '../../../../types';

interface BasicInfoSectionProps {
  clients: Client[];
  allProjects: Project[];
}

export const BasicInfoSection = ({ clients, allProjects }: BasicInfoSectionProps) => {
  const { register, watch } = useFormContext();
  const projectType = watch('projectType');

  // 自分自身を親の選択肢から除外するためのフィルタリングは、
  // ここでは簡易的に「master」タイプのみを抽出して表示します。
  // (厳密なID除外はForm側で渡すリストを加工するか、ここでID判定が必要ですが、表示用としてはこれで十分機能します)
  const masterProjects = allProjects.filter(p => p.projectType === 'master');

  return (
    <div className="space-y-8">
      <section>
        <h4 className="pb-2 mb-4 font-semibold text-gray-800 border-b">基本情報</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">依頼受注日</label>
            <input type="date" {...register("registrationDate", { required: true })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">納品日</label>
            <input type="date" {...register("dueDate", { required: true })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">作品名 / 案件名</label>
            <input type="text" {...register("title", { required: true })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{projectType === 'internal_sale' ? '仕入先 (任意)' : 'クライアント'}</label>
            <select {...register("clientId", { required: true })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm">
              <option value="">選択してください</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">伝票ID</label>
            <input type="text" {...register("projectId", { required: true })} readOnly className="block w-full mt-1 bg-gray-100 border-gray-300 rounded-md shadow-sm"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ステータス</label>
            <select {...register("status")} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm">
              <option>進行中</option>
              <option>完了</option>
              <option>請求済</option>
            </select>
          </div>
          {projectType === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">親マスタープロジェクト</label>
              <select {...register("masterProjectId", { required: projectType === 'sub' })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm">
                <option value="">選択してください</option>
                {masterProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>

      {projectType !== 'master' && (
        <section>
          <h4 className="pb-2 mb-4 font-semibold text-gray-800 border-b">{projectType === 'internal_sale' ? '販売情報' : '製作者情報'}</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">{projectType === 'internal_sale' ? '担当者' : '主担当作業者'}</label>
              <input type="text" {...register("workerName", { required: true })} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">カテゴリ</label>
              <input type="text" {...register("category")} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};