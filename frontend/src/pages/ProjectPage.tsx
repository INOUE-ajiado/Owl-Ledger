import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import ProjectForm from '../features/projects/form/ProjectForm';
import type { Project } from '../types';
import { useAppOutletContext, useModal } from '../contexts';
import PurchaseOrderModal from '../features/projects/purchase-order/PurchaseOrderModal';
import PasswordModal from '../features/projects/PasswordModal';
import ProjectDrawer from '../features/projects/drawer/ProjectDrawer';
import DeletionReasonModal from '../features/projects/DeletionReasonModal';
import DeletionHistoryModal from '../features/projects/DeletionHistoryModal';
import { Search, Archive, ArrowUpDown, HelpCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ProjectAnalysisReportTemplate from '../features/printing/ProjectAnalysisReportTemplate';
import { recordLog } from '../api/logging';
import { recordChange } from '../api/changeHistory';
import { migrateLegacyPasswords } from '../utils/migratePasswords';
import { normalizeForSearch } from '../utils/search';
import { useCompanySettings } from '../hooks/useCompanySettings';
import SearchInput from '../features/projects/list/SearchInput';
import ProjectStatsPopover from '../features/projects/list/ProjectStatsPopover';
import ProjectListView from '../features/projects/list/ProjectListView';
import { buildProjectStats } from '../features/projects/list/projectStats';
import { exportProjectsCsv } from '../features/projects/list/projectCsv';

const STATUS_ORDER: Record<string, number> = { '進行中': 1, '完了': 2, '請求済': 3, '削除済み': 4 };

const ProjectPage = () => {
    const { setHeaderProps, permissions } = useAppOutletContext();
    const { showModal } = useModal();
    const { settings } = useCompanySettings();
    // URL (/projects/:projectId) で開いているプロジェクト。共有・ブックマークできる
    const { projectId: openProjectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('すべて');
    const [sortOption, setSortOption] = useState<string>('orderDate-desc');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [selectedProjectForPO, setSelectedProjectForPO] = useState<Project | null>(null);
    const [passwordModalProject, setPasswordModalProject] = useState<Project | null>(null);
    // 削除履歴から開いた (一覧にない) プロジェクト
    const [deletedProjectViewing, setDeletedProjectViewing] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const statsRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());

    const handlePrintReport = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `プロジェクト分析レポート_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}`,
    });

    const isAdmin = permissions?.isAdmin === true;
    // プロジェクトの登録・編集はセキュリティルール上、管理者のみ
    const canWrite = isAdmin;

    useEffect(() => {
        const q = query(collection(db, 'projects'), where('status', '!=', '削除済み'), orderBy('status'), orderBy('projectId', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
            setLoading(false);
        }, (error) => {
            console.error("Firestore query failed: ", error);
            showModal({ title: "データベースエラー", message: "プロジェクトの読み込みに失敗しました。必要なインデックスが作成されているか確認してください。" });
        });
        return () => unsubscribe();
    }, [showModal]);

    // 旧形式 (平文) のパスワードをハッシュへ移行する。プロジェクトを更新できるのは管理者のみ
    useEffect(() => {
        if (!isAdmin) return;
        migrateLegacyPasswords().catch(error => console.error("パスワードの移行に失敗しました:", error));
    }, [isAdmin]);

    useEffect(() => {
        if (!isStatsOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (statsRef.current && !statsRef.current.contains(event.target as Node)) setIsStatsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatsOpen]);

    const sortProjects = useCallback((list: Project[]) => {
        const [field, direction] = sortOption.split('-');
        const multiplier = direction === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => {
            switch (field) {
                case 'orderDate': return multiplier * (a.registrationDate || '').localeCompare(b.registrationDate || '');
                case 'projectId': return multiplier * a.projectId.localeCompare(b.projectId);
                case 'title': return multiplier * a.title.localeCompare(b.title, 'ja');
                case 'client': return multiplier * a.clientName.localeCompare(b.clientName, 'ja');
                case 'status': return multiplier * ((STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99));
                default: return 0;
            }
        });
    }, [sortOption]);

    // マスターの直後にその子プロジェクトを並べ、紐付けのないものを後ろに置く
    const filteredAndSortedProjects = useMemo(() => {
        const masters = sortProjects(projects.filter(p => p.projectType === 'master'));
        const others = projects.filter(p => p.projectType !== 'master');
        const displayList: Project[] = [];
        masters.forEach(master => {
            displayList.push(master, ...sortProjects(others.filter(p => p.masterProjectId === master.id)));
        });
        displayList.push(...sortProjects(others.filter(p => !p.masterProjectId)));

        const normalizedSearch = normalizeForSearch(searchTerm);
        return displayList.filter(project => {
            const statusMatch = statusFilter === 'すべて' || project.status === statusFilter;
            const searchMatch = normalizedSearch === '' ||
                [project.title, project.projectId, project.clientName, project.copyrightManager, project.workerName]
                    .some(text => normalizeForSearch(text ?? '').includes(normalizedSearch));
            return statusMatch && searchMatch;
        });
    }, [projects, searchTerm, statusFilter, sortProjects]);

    const statsData = useMemo(() => buildProjectStats(filteredAndSortedProjects, settings.taxRate), [filteredAndSortedProjects, settings.taxRate]);

    const toggleExpand = useCallback((projectId: string) => {
        setExpandedProjectIds(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
            return next;
        });
    }, []);

    const handleProjectCsvExport = useCallback(() => {
        if (filteredAndSortedProjects.length === 0) {
            alert("エクスポート対象のプロジェクトがありません。");
            return;
        }
        exportProjectsCsv(filteredAndSortedProjects, settings.taxRate);
    }, [filteredAndSortedProjects, settings.taxRate]);

    const handleAddNew = useCallback(() => {
        if (!canWrite) return;
        setEditingProject(null);
        setIsFormOpen(true);
    }, [canWrite]);

    const openProject = (project: Project) => navigate(`/projects/${project.id}`);
    const closeProject = () => {
        setDeletedProjectViewing(null);
        if (openProjectId) navigate('/projects');
    };

    const handleOpenPOModal = (project: Project) => {
        setSelectedProjectForPO(project);
        setIsPOModalOpen(true);
    };

    const handleSaveGrouping = async (projectId: string, grouping: { id: string, indices: number[] }[]) => {
        try {
            await updateDoc(doc(db, 'projects', projectId), { purchaseOrderGrouping: grouping });
        } catch (error) {
            console.error("Failed to save grouping:", error);
            showModal({ title: "エラー", message: "グループ情報の保存に失敗しました。" });
        }
    };

    const handleEdit = (project: Project) => {
        if (!canWrite || project.isFixed) return;
        setEditingProject(project);
        setIsFormOpen(true);
    };

    const handleDelete = (project: Project) => {
        if (!isAdmin) return;
        setDeletingProject(project);
    };

    const confirmDelete = async (reason: string) => {
        if (!deletingProject) return;
        try {
            await updateDoc(doc(db, 'projects', deletingProject.id), {
                status: '削除済み',
                deletionReason: reason,
                deletedAt: Timestamp.now()
            });
            await recordChange({
                targetType: 'project', targetId: deletingProject.id, targetLabel: `${deletingProject.title} (${deletingProject.projectId})`,
                action: 'delete', changes: [{ field: 'status', before: deletingProject.status, after: '削除済み' }, { field: 'deletionReason', before: '', after: reason }],
            });
            await recordLog({
                action: 'DELETE_PROJECT', targetType: 'project', targetId: deletingProject.id,
                summary: `プロジェクト削除: ${deletingProject.title} (${deletingProject.projectId})`, details: `理由: ${reason}`, status: 'info'
            });
            showModal({ title: '削除完了', message: 'プロジェクトを削除しました。' });
        } catch (error) {
            console.error("Delete error:", error);
            await recordLog({
                action: 'DELETE_PROJECT', targetType: 'project', targetId: deletingProject.id,
                summary: `プロジェクト削除に失敗: ${deletingProject.title}`, details: (error as Error).message, status: 'error'
            });
            showModal({ title: 'エラー', message: '削除に失敗しました。' });
        } finally {
            setDeletingProject(null);
        }
    };

    const copyProjectLink = (project: Project) => {
        const url = `${window.location.origin}/projects/${project.id}`;
        navigator.clipboard.writeText(url)
            .then(() => showModal({ title: 'コピーしました', message: `このプロジェクトのリンクをコピーしました。\n${url}` }))
            .catch(() => showModal({ title: 'エラー', message: 'コピーに失敗しました。' }));
    };

    const headerActions = useMemo(() => (
        <div className="flex flex-wrap items-center justify-end flex-grow gap-2 ml-auto">
            <div className="relative">
                <Search size={18} className="absolute text-earth-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                <SearchInput onChange={setSearchTerm} />
            </div>
            <div className="flex items-center px-2 py-2 text-sm text-earth-700 bg-white/40 border border-white/30 rounded-md backdrop-blur-sm">
                <ArrowUpDown size={14} className="mr-1 text-earth-400" />
                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="p-0 text-xs bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none">
                    <option value="orderDate-desc">依頼受注日（新しい順）</option>
                    <option value="orderDate-asc">依頼受注日（古い順）</option>
                    <option value="projectId-desc">管理ID（降順）</option>
                    <option value="projectId-asc">管理ID（昇順）</option>
                    <option value="title-asc">作品名（五十音順）</option>
                    <option value="title-desc">作品名（逆順）</option>
                    <option value="client-asc">クライアント（五十音順）</option>
                    <option value="client-desc">クライアント（逆順）</option>
                    <option value="status-asc">ステータス順</option>
                </select>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-sm bg-white/40 border-white/30 text-earth-800 rounded-md focus:ring-earth-500 focus:border-earth-500 backdrop-blur-sm cursor-pointer">
                <option value="すべて">すべてのステータス</option>
                <option value="進行中">進行中</option>
                <option value="完了">完了</option>
                <option value="請求済">請求済</option>
            </select>

            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                {isAdmin && (
                    <button onClick={() => setIsHistoryOpen(true)} className="flex items-center px-3 py-2 text-sm font-medium text-earth-800 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 whitespace-nowrap shadow-sm transition-all backdrop-blur-sm">
                        <Archive size={16} className="mr-1.5" />
                        履歴
                    </button>
                )}
                <button onClick={handleProjectCsvExport} className="px-3 py-2 text-sm font-medium text-white bg-earth-500 rounded-md hover:bg-earth-600 whitespace-nowrap shadow-sm transition-all">
                    CSV
                </button>
                {canWrite && (
                    <button onClick={handleAddNew} className="px-4 py-2 text-sm font-medium text-white bg-earth-600 rounded-md hover:bg-earth-700 whitespace-nowrap shadow-md">
                        新規追加
                    </button>
                )}
                <div className="relative" ref={statsRef}>
                    <button onClick={() => setIsStatsOpen(!isStatsOpen)} className="p-2 text-earth-600 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 shadow-sm transition-all backdrop-blur-sm" title="分析">
                        <HelpCircle size={18} />
                    </button>
                    {isStatsOpen && <ProjectStatsPopover stats={statsData} onPrintReport={() => handlePrintReport()} />}
                </div>
            </div>
        </div>
    ), [statusFilter, isAdmin, canWrite, handleAddNew, handleProjectCsvExport, sortOption, isStatsOpen, statsData, handlePrintReport]);

    useEffect(() => {
        setHeaderProps({ title: 'プロジェクト一覧', actions: headerActions });
    }, [setHeaderProps, headerActions]);

    const isSearching = searchTerm !== '' || statusFilter !== 'すべて';
    const viewingProject = deletedProjectViewing ?? (openProjectId ? projects.find(p => p.id === openProjectId) ?? null : null);

    if (loading) {
        return <div className="p-10 text-center">プロジェクトを読み込み中...</div>;
    }

    return (
        <div className="w-full min-h-full">
            {openProjectId && !viewingProject && (
                <p className="px-4 py-2 text-sm text-yellow-900 bg-yellow-100">指定されたプロジェクトが見つかりません (削除された可能性があります)。</p>
            )}
            <ProjectListView
                projects={filteredAndSortedProjects}
                isSearching={isSearching}
                expandedProjectIds={expandedProjectIds}
                onToggleExpand={toggleExpand}
                onOpen={openProject}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenPOModal={handleOpenPOModal}
                onOpenPassword={setPasswordModalProject}
                canWrite={canWrite}
                isAdmin={isAdmin}
            />
            {isFormOpen && canWrite && <ProjectForm onClose={() => { setIsFormOpen(false); setEditingProject(null); }} editingProject={editingProject} allProjects={projects} />}
            {isPOModalOpen && selectedProjectForPO && (
                <PurchaseOrderModal
                    project={selectedProjectForPO}
                    onClose={() => setIsPOModalOpen(false)}
                    onSaveGrouping={(grouping) => handleSaveGrouping(selectedProjectForPO.id, grouping)}
                />
            )}
            {passwordModalProject && <PasswordModal project={passwordModalProject} onClose={() => setPasswordModalProject(null)} />}
            {viewingProject && (
                <ProjectDrawer
                    key={viewingProject.id}
                    project={viewingProject}
                    allProjects={projects}
                    onClose={closeProject}
                    onEdit={(project) => {
                        closeProject();
                        handleEdit(project);
                    }}
                    onOpenPOModal={() => {
                        closeProject();
                        handleOpenPOModal(viewingProject);
                    }}
                    canEdit={canWrite}
                    isAdmin={isAdmin}
                    onCopyLink={() => copyProjectLink(viewingProject)}
                />
            )}
            {deletingProject && <DeletionReasonModal onClose={() => setDeletingProject(null)} onConfirm={confirmDelete} />}
            {isHistoryOpen && (
                <DeletionHistoryModal
                    onClose={() => setIsHistoryOpen(false)}
                    onViewDetails={(project) => {
                        setIsHistoryOpen(false);
                        setDeletedProjectViewing(project);
                    }}
                />
            )}
            {/* 印刷用テンプレート（非表示） */}
            <div style={{ display: 'none' }}>
                <ProjectAnalysisReportTemplate
                    ref={reportRef}
                    projectStatsList={statsData.projectStatsList}
                    yearlyStats={statsData.yearlyStats}
                    summaryStats={statsData.summaryStats}
                />
            </div>
        </div>
    );
};

export default ProjectPage;
