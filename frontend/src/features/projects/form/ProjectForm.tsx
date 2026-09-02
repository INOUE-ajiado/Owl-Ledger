import { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../api/firebase';
import type { Project, Client } from '../../../types';
import { useProjectCalculations } from './useProjectCalculations';
import type { ProjectFormValues } from './types';
import { FinancialSection } from './components/FinancialSection';
import { BasicInfoSection } from './components/BasicInfoSection';
import { BreakdownSection } from './components/BreakdownSection';
import { recordLog } from '../../../api/logging'; // ★ ログ機能を追加

interface ProjectFormProps {
  onClose: () => void;
  editingProject: Project | null;
  allProjects: Project[];
}

const ProjectForm = ({ onClose, editingProject, allProjects }: ProjectFormProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  
  const methods = useForm<ProjectFormValues>({
    defaultValues: {
      projectType: 'standard',
      taxType: 'exclusive',
      breakdown: [{ name: '', percentage: 100, content: '', quantity: 1, amount: 0 }],
      gloss: 0,
      marginRate: 30,
      negotiationFeeRate: 1.0,
      characterCount: 1,
      allocatedAmount: 0,
      totalBudget: 0,
      registrationDate: '',
      dueDate: '',
      title: '',
      clientId: '',
      projectId: '',
      status: '進行中',
      remarks: '',
      workerName: '',
      category: '',
    }
  });

  const { handleSubmit, formState: { isSubmitting }, reset, watch } = methods;
  
  const projectType = watch('projectType');

  useProjectCalculations(methods);

  useEffect(() => {
    const loadClientsAndResetForm = async () => {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const clientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(clientsData);

      if (editingProject) {
        const projectData = {
          ...editingProject,
          projectType: editingProject.projectType || 'standard',
          taxType: editingProject.taxType || 'exclusive',
          netRate: 0, margin: '', net: '', netUnitPrice: '', negotiationFee: '',
          breakdown: editingProject.breakdown && editingProject.breakdown.length > 0 
            ? editingProject.breakdown.map(b => ({ ...b, quantity: b.quantity || 1, amount: b.amount || 0 }))
            : [{ name: '', percentage: 100, content: '', quantity: 1, amount: 0 }]
        };
        reset(projectData as unknown as ProjectFormValues);
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}${month}`;
        
        const counterQuery = query(collection(db, 'projects'), where('projectId', '>=', `${prefix}-0000`), where('projectId', '<', `${prefix}-9999`));
        const currentMonthCountSnapshot = await getCountFromServer(counterQuery);
        const nextNumber = currentMonthCountSnapshot.data().count + 1;
        
        const newProjectId = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
        
        reset({
          projectId: newProjectId,
          registrationDate: now.toISOString().slice(0, 10),
          dueDate: '',
          title: '',
          clientId: '',
          status: '進行中',
          remarks: '',
          workerName: '',
          category: '',
          characterCount: 1,
          gloss: 0,
          allocatedAmount: 0,
          totalBudget: 0,
          projectType: 'standard',
          taxType: 'exclusive',
          marginRate: 30,
          negotiationFeeRate: 1.0,
          breakdown: [{ name: '', percentage: 100, content: '', quantity: 1, amount: 0 }]
        });
      }
    };
    loadClientsAndResetForm();
  }, [editingProject, reset]);

  const onSubmit = async (data: ProjectFormValues) => {
    const selectedClient = clients.find(c => c.id === data.clientId);
    if (!selectedClient) {
      alert("クライアントが選択されていません。");
      return;
    }
    
    const dataToSave = { ...data };
    delete dataToSave.netRate;
    delete dataToSave.margin;
    delete dataToSave.net;
    delete dataToSave.netUnitPrice;
    delete dataToSave.negotiationFee;

    const projectDataToSave = {  
      ...dataToSave,  
      clientName: selectedClient.name,
      gloss: Number(data.gloss) || 0,
      allocatedAmount: Number(data.allocatedAmount) || 0,
      totalBudget: Number(data.totalBudget) || 0,
      marginRate: Number(data.marginRate),
      characterCount: Number(data.characterCount),
      negotiationFeeRate: Number(data.negotiationFeeRate),
      breakdown: data.projectType !== 'master' 
        ? data.breakdown.map(item => ({  
            ...item,  
            percentage: Number(item.percentage),  
            quantity: Number(item.quantity) || 1,  
            amount: Number(item.amount) || 0,  
            content: item.content || ''  
          })) 
        : [],
      masterProjectId: data.projectType === 'sub' ? data.masterProjectId : '',
    };

    try {
      if (editingProject) {
        const projectDocRef = doc(db, 'projects', editingProject.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateDoc(projectDocRef, projectDataToSave as any);
        alert('プロジェクトを更新しました。');
        
        // ★ ログ記録: 更新
        await recordLog({
            action: 'UPDATE_PROJECT',
            targetType: 'project',
            targetId: editingProject.id,
            summary: `プロジェクト更新: ${data.title} (${data.projectId})`,
            status: 'success'
        });

      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newDocRef = await addDoc(collection(db, 'projects'), projectDataToSave as any);
        alert('プロジェクトを登録しました。');

        // ★ ログ記録: 作成
        await recordLog({
            action: 'CREATE_PROJECT',
            targetType: 'project',
            targetId: newDocRef.id,
            summary: `プロジェクト作成: ${data.title} (${data.projectId})`,
            status: 'success'
        });
      }
      onClose();
    } catch (error) {
      console.error("Error saving project: ", error);

      // ★ ログ記録: エラー
      await recordLog({
          action: editingProject ? 'UPDATE_PROJECT' : 'CREATE_PROJECT',
          targetType: 'project',
          targetId: editingProject?.id || 'NEW_PROJECT_FAILED',
          summary: `プロジェクトの保存に失敗`,
          details: (error as Error).message,
          status: 'error'
      });
      
      alert('保存に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
        <h3 className="flex-shrink-0 mb-6 text-xl font-semibold leading-6 text-gray-900">
          {editingProject ? 'プロジェクト編集' : '新規プロジェクト登録'}
        </h3>
        
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-grow pr-4 overflow-y-auto">
            
            <div className="mb-8">
                <h4 className="pb-2 mb-2 font-semibold text-gray-800 border-b">プロジェクト種別</h4>
                <div className="flex space-x-6">
                  <label className="flex items-center"><input type="radio" {...methods.register("projectType")} value="standard" className="w-4 h-4" /> <span className="ml-2">通常プロジェクト</span></label>
                  <label className="flex items-center"><input type="radio" {...methods.register("projectType")} value="master" className="w-4 h-4" /> <span className="ml-2">マスタープロジェクト</span></label>
                  <label className="flex items-center"><input type="radio" {...methods.register("projectType")} value="sub" className="w-4 h-4" /> <span className="ml-2">子プロジェクト</span></label>
                  <label className="flex items-center"><input type="radio" {...methods.register("projectType")} value="internal_sale" className="w-4 h-4" /> <span className="ml-2">社内販売</span></label>
                </div>
            </div>

            <BasicInfoSection clients={clients} allProjects={allProjects} />
            
            <div className="mt-8">
              <FinancialSection />
            </div>

            {projectType !== 'master' && (
              <BreakdownSection />
            )}

            <section className="mt-8">
                <h4 className="pb-2 mb-4 font-semibold text-gray-800 border-b">備考</h4>
                <textarea {...methods.register("remarks")} rows={3} className="block w-full mt-1 border-gray-300 rounded-md shadow-sm"/>
            </section>

          </form>
        </FormProvider>

        <div className="flex justify-end flex-shrink-0 pt-6 mt-8 space-x-3 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">キャンセル</button>
          <button type="submit" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300">
            {isSubmitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectForm;