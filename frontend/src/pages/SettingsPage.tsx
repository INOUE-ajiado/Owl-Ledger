import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppOutletContext } from '../contexts';
import CompanySettingsForm from '../features/settings/CompanySettingsForm';
import StaffManager from '../features/settings/StaffManager';
import BackupPanel from '../features/settings/BackupPanel';

const TABS = [
  { id: 'company', label: '会社情報' },
  { id: 'staff', label: '社員マスタ' },
  { id: 'backup', label: 'バックアップ' },
] as const;

type TabId = typeof TABS[number]['id'];

const SettingsPage = () => {
  const { setHeaderProps } = useAppOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = TABS.some(t => t.id === tabParam) ? tabParam as TabId : 'company';

  useEffect(() => {
    setHeaderProps({ title: '会社設定', actions: undefined });
  }, [setHeaderProps]);

  return (
    <div className="w-full min-h-full">
      <div className="flex gap-1 px-3 pt-3 overflow-x-auto border-b md:px-6 border-white/30 bg-white/30">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSearchParams({ tab: t.id }, { replace: true })}
            className={`px-4 py-2 text-sm font-medium rounded-t-md whitespace-nowrap ${tab === t.id ? 'bg-white text-earth-900 shadow-sm' : 'text-earth-600 hover:bg-white/50'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-w-5xl p-4 md:p-6">
        {tab === 'company' && <CompanySettingsForm />}
        {tab === 'staff' && <StaffManager />}
        {tab === 'backup' && <BackupPanel />}
      </div>
    </div>
  );
};

export default SettingsPage;
