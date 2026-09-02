import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '../api/firebase';
import ProjectForm from '../features/projects/form/ProjectForm';
import type { Project } from '../types';
import { useAppOutletContext } from '../contexts';
import { useModal, useAuth } from '../contexts';
import PurchaseOrderModal from '../features/projects/purchase-order/PurchaseOrderModal';
import PasswordModal from '../features/projects/PasswordModal';
import ProjectDrawer from '../features/projects/drawer/ProjectDrawer';
import DeletionReasonModal from '../features/projects/DeletionReasonModal';
import DeletionHistoryModal from '../features/projects/DeletionHistoryModal';
import { KeyRound, LockKeyhole, MoreVertical, Search, Archive, CornerDownRight, Folder, FolderOpen, ChevronRight, ChevronDown, ArrowUpDown, HelpCircle, FileDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import ProjectAnalysisReportTemplate from '../features/printing/ProjectAnalysisReportTemplate';
import { recordLog } from '../api/logging'; // ★ ログ機能を追加

const OrderStatusBadge = ({ status }: { status: '承認待ち' | '承認済み' | undefined }) => {
    if (!status) return null;
    const isPending = status === '承認待ち';
    const styles = isPending ? 'bg-orange-100 text-orange-800' : 'bg-sky-100 text-sky-800';
    return (
        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles}`}>
            {status}
        </span>
    );
};

const ProjectPage = () => {
    const { setHeaderProps, permissions } = useAppOutletContext();
    const { showModal } = useModal();
    const { user } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('すべて');
    const [sortOption, setSortOption] = useState<string>('orderDate-desc');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isPOModalOpen, setIsPOModalOpen] = useState(false);
    const [selectedProjectForPO, setSelectedProjectForPO] = useState<Project | null>(null);
    const [passwordModalProject, setPasswordModalProject] = useState<Project | null>(null);
    const [viewingProject, setViewingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const statsRef = useRef<HTMLDivElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    
    const handlePrintReport = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `プロジェクト分析レポート_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}`,
    });

    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());

    const canWrite = permissions?.permissions?.projects === 'write';
    const isAdmin = user?.email === 'inoue@ajiado.co.jp';

    useEffect(() => {
        const q = query(collection(db, 'projects'), where('status', '!=', '削除済み'), orderBy('status'), orderBy('projectId', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(projectsData);
            setLoading(false);
        }, (error) => {
            console.error("Firestore query failed: ", error);
            showModal({ title: "データベースエラー", message: "プロジェクトの読み込みに失敗しました。必要なインデックスが作成されているか確認してください。" });
        });
        return () => unsubscribe();
    }, [showModal]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statsRef.current && !statsRef.current.contains(event.target as Node)) {
                setIsStatsOpen(false);
            }
        };
        if (isStatsOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isStatsOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);

    const sortProjects = useCallback((list: Project[]) => {
        const [field, direction] = sortOption.split('-');
        const multiplier = direction === 'asc' ? 1 : -1;

        return [...list].sort((a, b) => {
            switch (field) {
                case 'orderDate': // 依頼受注日
                    return multiplier * (a.registrationDate || '').localeCompare(b.registrationDate || '');
                case 'projectId': // 管理ID
                    return multiplier * a.projectId.localeCompare(b.projectId);
                case 'title': // 作品名（五十音順）
                    return multiplier * a.title.localeCompare(b.title, 'ja');
                case 'client': // クライアント名
                    return multiplier * a.clientName.localeCompare(b.clientName, 'ja');
                case 'status': // ステータス
                    const statusOrder = { '進行中': 1, '完了': 2, '請求済': 3, '削除済み': 4 };
                    return multiplier * ((statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
                default:
                    return 0;
            }
        });
    }, [sortOption]);

    const filteredAndSortedProjects = useMemo(() => {
        const masterProjects = projects
            .filter(p => p.projectType === 'master');

        const otherProjects = projects.filter(p => p.projectType !== 'master');

        let displayList: Project[] = [];
        const sortedMasters = sortProjects(masterProjects);

        sortedMasters.forEach(master => {
            displayList.push(master);
            const children = otherProjects.filter(p => p.masterProjectId === master.id);
            const sortedChildren = sortProjects(children);
            displayList.push(...sortedChildren);
        });

        const unlinkedProjects = otherProjects.filter(p => !p.masterProjectId);
        const sortedUnlinked = sortProjects(unlinkedProjects);
        displayList = [...displayList, ...sortedUnlinked];

        return displayList.filter(project => {
            const statusMatch = statusFilter === 'すべて' || project.status === statusFilter;
            const searchMatch = searchTerm === '' ||
                project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.projectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [projects, searchTerm, statusFilter, sortProjects]);

    const statsData = useMemo(() => {
        type Stats = { count: number; totalGloss: number; totalMarginRate: number; totalNet: number; totalCharacterCount: number; };
        const grouped: Record<string, Stats> = {};
        const creatorStats: Record<string, { total: number; supervised: number; }> = {};

        const validProjects = filteredAndSortedProjects.filter(p => p.projectType !== 'sub');

        const projectStatsList = validProjects.map(p => {
            let fYearStr = '不明';
            if (p.registrationDate) {
                const [yyyy, mm] = p.registrationDate.split('-');
                if (yyyy && mm) {
                    const year = parseInt(yyyy, 10);
                    const month = parseInt(mm, 10);
                    const fiscalYear = month <= 3 ? year - 1 : year;
                    fYearStr = `${fiscalYear}年度`;
                }
            }

            const isSupervised = p.category?.includes('【監修】');
            const groupKey = `${fYearStr} ${isSupervised ? '【監修】版権' : '通常版権'}`;

            if (!grouped[groupKey]) {
                grouped[groupKey] = { count: 0, totalGloss: 0, totalMarginRate: 0, totalNet: 0, totalCharacterCount: 0 };
            }

            const glossInput = p.gloss || 0;
            const taxType = p.taxType || 'exclusive';
            const glossTaxExclusive = taxType === 'inclusive' ? glossInput / 1.1 : glossInput;
            const marginRate = p.marginRate || 0;
            const margin = glossTaxExclusive * (marginRate / 100);
            const net = glossTaxExclusive - margin;
            const charCount = p.characterCount || 0;

            grouped[groupKey].count += 1;
            grouped[groupKey].totalGloss += glossInput;
            grouped[groupKey].totalMarginRate += marginRate;
            grouped[groupKey].totalNet += net;
            grouped[groupKey].totalCharacterCount += charCount;

            // クリエイター統計
            const workerName = p.workerName || '未指定';
            if (!creatorStats[workerName]) {
                creatorStats[workerName] = { total: 0, supervised: 0 };
            }
            creatorStats[workerName].total += 1;
            if (isSupervised) {
                creatorStats[workerName].supervised += 1;
            }

            return {
                id: p.id,
                workerName: p.workerName,
                title: p.title,
                fiscalYear: fYearStr,
                registrationDate: p.registrationDate,
                gloss: Math.round(glossInput),
                marginRate: marginRate,
                margin: Math.round(margin),
                net: Math.round(net),
                glossUnitPrice: charCount > 0 ? Math.round(glossInput / charCount) : 0,
                netUnitPrice: charCount > 0 ? Math.round(Math.round(net) / charCount) : 0,
                characterCount: charCount,
                category: p.category
            };
        });

        const yearlyStats = Object.entries(grouped).map(([year, stats]) => {
            const count = stats.count;
            return {
                year,
                avgGloss: count > 0 ? Math.round(stats.totalGloss / count) : 0,
                avgMarginRate: count > 0 ? (stats.totalMarginRate / count).toFixed(1) : 0,
                avgNet: count > 0 ? Math.round(stats.totalNet / count) : 0,
                avgCharacterCount: count > 0 ? (stats.totalCharacterCount / count).toFixed(1) : 0,
                avgGlossUnitPrice: stats.totalCharacterCount > 0 ? Math.round(stats.totalGloss / stats.totalCharacterCount) : 0,
                avgNetUnitPrice: stats.totalCharacterCount > 0 ? Math.round(stats.totalNet / stats.totalCharacterCount) : 0,
                count
            };
        }).sort((a, b) => b.year.localeCompare(a.year));

        const totalGlossOverall = projectStatsList.reduce((sum, p) => sum + p.gloss, 0);
        const totalProjectsOverall = projectStatsList.length;
        const supervisedCountOverall = projectStatsList.filter(p => p.category?.includes('【監修】')).length;
        
        const topCreators = Object.entries(creatorStats)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 3)
            .map(([name, s]) => ({ name, count: s.total }));
            
        const topSupervisedCreators = Object.entries(creatorStats)
            .filter(e => e[1].supervised > 0)
            .sort((a, b) => b[1].supervised - a[1].supervised)
            .slice(0, 3)
            .map(([name, s]) => ({ name, count: s.supervised }));

        const summaryStats = {
            totalGloss: totalGlossOverall,
            totalCount: totalProjectsOverall,
            supervisedCount: supervisedCountOverall,
            normalCount: totalProjectsOverall - supervisedCountOverall,
            topCreators,
            topSupervisedCreators
        };

        return { yearlyStats, projectStatsList, summaryStats };
    }, [filteredAndSortedProjects]);

    const toggleExpand = useCallback((projectId: string) => {
        setExpandedProjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    }, []);

    const handleProjectCsvExport = useCallback(() => {
        if (filteredAndSortedProjects.length === 0) {
            alert("エクスポート対象のプロジェクトがありません。");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const escapeCsv = (field: any): string => {
            const str = String(field ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = ['管理ID', '登録日', '納期', '作品名', 'クライアント名', 'カテゴリ', '主担当作業者', 'ステータス', 'GLOSS', '税の扱い', '税抜合計', '消費税', 'NET', 'MARGIN'];

        const rows = filteredAndSortedProjects.map(p => {
            const glossInput = p.gloss;
            const taxType = p.taxType || 'exclusive';
            const glossTaxExclusive = taxType === 'inclusive' ? glossInput / 1.1 : glossInput;
            const tax = taxType === 'inclusive' ? glossInput - glossTaxExclusive : glossInput * 0.1;
            const margin = glossTaxExclusive * (p.marginRate / 100);
            const net = glossTaxExclusive - margin;

            return [
                escapeCsv(p.projectId),
                escapeCsv(p.registrationDate),
                escapeCsv(p.dueDate),
                escapeCsv(p.title),
                escapeCsv(p.clientName),
                escapeCsv(p.category),
                escapeCsv(p.workerName),
                escapeCsv(p.status),
                p.gloss,
                taxType === 'inclusive' ? '税込' : '税抜',
                Math.round(glossTaxExclusive),
                Math.round(tax),
                Math.round(net),
                Math.round(margin)
            ].join(',');
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `projects_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredAndSortedProjects]);

    const handleAddNew = useCallback(() => {
        if (!canWrite) return;
        setEditingProject(null);
        setIsFormOpen(true);
    }, [canWrite]);

    const handleOpenPOModal = (project: Project) => {
        setSelectedProjectForPO(project);
        setIsPOModalOpen(true);
        setOpenMenuId(null);
    };

    const handleSaveGrouping = async (projectId: string, grouping: { id: string, indices: number[] }[]) => {
        const projectRef = doc(db, 'projects', projectId);
        try {
            await updateDoc(projectRef, { purchaseOrderGrouping: grouping });
        } catch (error) {
            console.error("Failed to save grouping:", error);
            showModal({ title: "エラー", message: "グループ情報の保存に失敗しました。" });
        }
    };

    const handleEdit = (project: Project) => {
        if (!canWrite) return;
        setEditingProject(project);
        setIsFormOpen(true);
    };

    const handleDelete = (project: Project) => {
        if (!isAdmin) return;
        setDeletingProject(project);
    };

    const confirmDelete = async (reason: string) => {
        if (!deletingProject) return;

        const projectRef = doc(db, 'projects', deletingProject.id);
        try {
            await updateDoc(projectRef, {
                status: '削除済み',
                deletionReason: reason,
                deletedAt: Timestamp.now()
            });

            // ★ ログ記録: 削除
            await recordLog({
                action: 'DELETE_PROJECT',
                targetType: 'project',
                targetId: deletingProject.id,
                summary: `プロジェクト削除: ${deletingProject.title} (${deletingProject.projectId})`,
                details: `理由: ${reason}`,
                status: 'info'
            });

            showModal({ title: '削除完了', message: 'プロジェクトを削除しました。' });
        } catch (error) {
            console.error("Delete error:", error);

            // ★ ログ記録: エラー
            await recordLog({
                action: 'DELETE_PROJECT',
                targetType: 'project',
                targetId: deletingProject.id,
                summary: `プロジェクト削除に失敗: ${deletingProject.title}`,
                details: (error as Error).message,
                status: 'error'
            });

            showModal({ title: 'エラー', message: '削除に失敗しました。' });
        } finally {
            setDeletingProject(null);
        }
    };

    // ★ 修正: useMemo を early return の前に移動
    const headerActions = useMemo(() => (
        <div className="flex flex-wrap items-center justify-end flex-grow gap-2 ml-auto">
            <div className="relative">
                <Search size={18} className="absolute text-earth-400 -translate-y-1/2 pointer-events-none left-3 top-1/2" />
                <input
                    type="text"
                    placeholder="検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-40 py-2 pl-10 pr-4 text-sm bg-white/40 border-white/30 rounded-md focus:ring-earth-500 focus:border-earth-500 text-earth-800 placeholder-earth-400 backdrop-blur-sm"
                />
            </div>
            <div className="flex items-center px-2 py-2 text-sm text-earth-700 bg-white/40 border border-white/30 rounded-md backdrop-blur-sm">
                <ArrowUpDown size={14} className="mr-1 text-earth-400" />
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="p-0 text-xs bg-transparent border-none focus:ring-0 focus:outline-none cursor-pointer"
                >
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
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-sm bg-white/40 border-white/30 text-earth-800 rounded-md focus:ring-earth-500 focus:border-earth-500 backdrop-blur-sm cursor-pointer"
            >
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
                    <button
                        onClick={() => setIsStatsOpen(!isStatsOpen)}
                        className="p-2 text-earth-600 bg-white/40 border border-white/30 rounded-md hover:bg-white/60 shadow-sm transition-all backdrop-blur-sm"
                        title="分析"
                    >
                        <HelpCircle size={18} />
                    </button>
                    
                    {isStatsOpen && (
                        <div className="absolute right-0 z-30 w-auto min-w-[950px] max-w-[95vw] mt-2 origin-top-right bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none p-4 flex gap-6">
                            
                            {/* 左側: プロジェクト別 実数値一覧 */}
                            <div className="flex-1 border-r border-gray-200 pr-6 min-w-[650px]">
                                <div className="flex justify-between items-center border-b pb-2 mb-3">
                                    <h3 className="text-sm font-bold text-gray-800">プロジェクト別 各種数値</h3>
                                    <button
                                        onClick={() => handlePrintReport()}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-earth-500 rounded hover:bg-earth-600 transition-colors shadow-sm"
                                        title="分析レポートをPDF保存"
                                    >
                                        <FileDown size={12} />
                                        PDF保存
                                    </button>
                                </div>
                                <div className="max-h-[65vh] overflow-y-auto">
                                    <table className="min-w-full text-xs text-left divide-y divide-gray-200">
                                        <thead className="bg-white sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 whitespace-nowrap">年度</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 min-w-32 whitespace-nowrap">作品名</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">GLOSS</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">MARGIN額</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">MARGIN率</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">NET</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">体数</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">GLOSS単価</th>
                                                <th className="py-1.5 px-2 font-medium text-gray-500 text-right whitespace-nowrap">NET単価</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {statsData.projectStatsList.length > 0 ? statsData.projectStatsList.map((pStat, i) => (
                                                <tr key={pStat.id || i} className={`hover:bg-gray-50 ${pStat.category?.includes('【監修】') ? 'bg-yellow-50' : ''}`}>
                                                    <td className="py-1.5 px-2 whitespace-nowrap text-gray-500">{pStat.fiscalYear}</td>
                                                    <td className="py-1.5 px-2 text-gray-800 font-medium truncate max-w-48" title={pStat.title}>{pStat.title}</td>
                                                    <td className="py-1.5 px-2 text-right whitespace-nowrap">¥{pStat.gloss.toLocaleString()}</td>
                                                    <td className="py-1.5 px-2 text-right text-earth-700 whitespace-nowrap">¥{pStat.margin.toLocaleString()}</td>
                                                    <td className="py-1.5 px-2 text-right text-earth-700 whitespace-nowrap">{pStat.marginRate}%</td>
                                                    <td className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">¥{pStat.net.toLocaleString()}</td>
                                                    <td className="py-1.5 px-2 text-right whitespace-nowrap">{pStat.characterCount}</td>
                                                    <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap">¥{pStat.glossUnitPrice.toLocaleString()}</td>
                                                    <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap">¥{pStat.netUnitPrice.toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={9} className="py-4 text-center text-gray-500">該当プロジェクトがありません</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* 右側: 年度別 平均値 */}
                            <div className="w-64 flex-shrink-0">
                                <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">年度別 平均値</h3>
                                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                                    {statsData.yearlyStats.length > 0 ? statsData.yearlyStats.map(stat => (
                                        <div key={stat.year} className={`${stat.year.includes('【監修】') ? 'bg-yellow-50' : 'bg-gray-50'} p-3 rounded text-sm text-gray-700`}>
                                            <div className="font-bold text-earth-700 mb-2 border-b border-gray-200 pb-1">{stat.year} <span className="text-xs font-normal text-gray-500">({stat.count}件)</span></div>
                                            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                                <div className="text-gray-500">GLOSS:</div>
                                                <div className="text-right font-medium">¥{stat.avgGloss.toLocaleString()}</div>
                                                
                                                <div className="text-gray-500">GLOSS単価:</div>
                                                <div className="text-right font-medium">¥{stat.avgGlossUnitPrice.toLocaleString()}</div>
                                                
                                                <div className="text-gray-500">MARGIN率:</div>
                                                <div className="text-right font-medium">{stat.avgMarginRate}%</div>
                                                
                                                <div className="text-gray-500">NET:</div>
                                                <div className="text-right font-medium">¥{stat.avgNet.toLocaleString()}</div>
                                                
                                                <div className="text-gray-500">NET単価:</div>
                                                <div className="text-right font-medium">¥{stat.avgNetUnitPrice.toLocaleString()}</div>
                                                
                                                <div className="text-gray-500">体数:</div>
                                                <div className="text-right font-medium">{stat.avgCharacterCount}</div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-gray-500 text-sm text-center py-2">該当データがありません</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    ), [searchTerm, statusFilter, isAdmin, canWrite, handleAddNew, handleProjectCsvExport, sortOption, isStatsOpen, statsData]);

    useEffect(() => {
        setHeaderProps({
            title: 'プロジェクト一覧',
            actions: headerActions
        });
    }, [setHeaderProps, headerActions]);

    // ★ 修正: isSearching の定義
    const isSearching = searchTerm !== '' || statusFilter !== 'すべて';

    // ★ 修正: loading チェックを全ての Hooks の後に配置
    if (loading) {
        return <div className="p-10 text-center">プロジェクトを読み込み中...</div>;
    }

    return (
        <div className="w-full min-h-full">
            <div className="overflow-x-auto w-full bg-white/40 backdrop-blur-sm border-b border-white/20">
                <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase"></th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">保護</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">依頼受注日</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">管理ID</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">作品名</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">クライアント</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ステータス</th>
                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">アクション</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                        {filteredAndSortedProjects.length > 0 ? (
                            filteredAndSortedProjects.map(project => {
                                const isSubProject = project.projectType === 'sub';
                                const isMasterProject = project.projectType === 'master';
                                const isExpanded = expandedProjectIds.has(project.id);

                                if (isSubProject && !isSearching) {
                                    if (project.masterProjectId && !expandedProjectIds.has(project.masterProjectId)) {
                                        return null;
                                    }
                                }

                                return (
                                    <tr key={project.id} onClick={() => setViewingProject(project)} className={`cursor-pointer transition-colors hover:bg-white/40 ${isMasterProject ? 'bg-earth-100/50 font-semibold' : ''}`}>
                                        <td className="px-2 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            {isMasterProject && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleExpand(project.id); }}
                                                    className="flex items-center justify-center w-full p-2 text-blue-600 rounded-md hover:bg-blue-100"
                                                    title={isExpanded ? "閉じる" : "開く"}
                                                >
                                                    {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                                                    {isExpanded ? <ChevronDown size={14} className="ml-1" /> : <ChevronRight size={14} className="ml-1" />}
                                                </button>
                                            )}
                                            {isSubProject && <CornerDownRight size={16} className="mx-auto text-gray-400" />}
                                        </td>

                                        <td className="px-2 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            {canWrite && !isMasterProject && (
                                                <button
                                                    onClick={() => setPasswordModalProject(project)}
                                                    className={`p-2 rounded-md hover:bg-gray-100 ${project.previewPassword ? 'text-yellow-600' : 'text-gray-400'}`}
                                                    title={project.previewPassword ? "パスワードを変更" : "プレビューパスワードを設定"}
                                                >
                                                    {project.previewPassword ? <LockKeyhole size={18} /> : <KeyRound size={18} />}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {project.registrationDate}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{project.projectId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{project.title}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{project.clientName}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === '完了' ? 'bg-green-100 text-green-800' : project.status === '請求済' ? 'bg-earth-100 text-earth-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {project.status}
                                            </span>
                                            <OrderStatusBadge status={project.orderConfirmationStatus} />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end space-x-2">
                                                {!project.isFixed && canWrite && (
                                                    <button onClick={() => handleEdit(project)} className="px-2 text-blue-500 hover:text-blue-700 font-medium transition-colors">編集</button>
                                                )}
                                                {!project.isFixed && isAdmin && (
                                                    <button onClick={() => handleDelete(project)} className="px-2 text-red-500 hover:text-red-700 font-medium transition-colors">削除</button>
                                                )}
                                                <div className="relative">
                                                    <button onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)} className="p-2 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600">
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {openMenuId === project.id && (
                                                        <div ref={menuRef} className="absolute right-0 z-20 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                            <div className="py-1">
                                                                {project.projectType !== 'master' && (
                                                                    <>
                                                                        <Link to={`/print/quotation/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">
                                                                            御見積書
                                                                        </Link>
                                                                        <Link to={`/order-confirmation-approval/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">
                                                                            受注伝票（承認）
                                                                        </Link>
                                                                        <Link to={`/print/invoice/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">請求書</Link>
                                                                        <Link to={`/print/shipping-slip/${project.id}`} target="_blank" className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">発送伝票</Link>
                                                                    </>
                                                                )}
                                                                <button onClick={() => handleOpenPOModal(project)} className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100">
                                                                    {project.projectType === 'internal_sale' ? '請求書発行管理' : '発注書を管理'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr><td colSpan={8} className="py-10 text-center text-gray-500">条件に一致するプロジェクトはありません。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isFormOpen && canWrite && <ProjectForm onClose={() => { setIsFormOpen(false); setEditingProject(null); }} editingProject={editingProject} allProjects={projects} />}
            {isPOModalOpen && selectedProjectForPO && (
                <PurchaseOrderModal
                    project={selectedProjectForPO}
                    onClose={() => setIsPOModalOpen(false)}
                    onSaveGrouping={(grouping) => handleSaveGrouping(selectedProjectForPO.id, grouping)}
                />
            )}
            {passwordModalProject && (
                <PasswordModal
                    project={passwordModalProject}
                    onClose={() => setPasswordModalProject(null)}
                />
            )}
            {viewingProject && (
                <ProjectDrawer
                    project={viewingProject}
                    allProjects={projects}
                    onClose={() => setViewingProject(null)}
                    onEdit={(project) => {
                        setViewingProject(null);
                        handleEdit(project);
                    }}
                    onOpenPOModal={() => {
                        if (viewingProject) {
                            setViewingProject(null);
                            handleOpenPOModal(viewingProject);
                        }
                    }}
                />
            )}
            {deletingProject && (
                <DeletionReasonModal
                    onClose={() => setDeletingProject(null)}
                    onConfirm={confirmDelete}
                />
            )}
            {isHistoryOpen && (
                <DeletionHistoryModal
                    onClose={() => setIsHistoryOpen(false)}
                    onViewDetails={(project) => {
                        setIsHistoryOpen(false);
                        setViewingProject(project);
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