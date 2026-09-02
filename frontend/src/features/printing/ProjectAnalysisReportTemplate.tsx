import React from 'react';

interface ProjectStat {
    id?: string;
    title: string;
    fiscalYear: string;
    registrationDate?: string;
    gloss: number;
    marginRate: number;
    margin: number;
    net: number;
    glossUnitPrice: number;
    netUnitPrice: number;
    characterCount: number;
    category?: string;
    workerName?: string;
}

interface YearlyStat {
    year: string;
    avgGloss: number;
    avgMarginRate: string | number;
    avgNet: number;
    avgCharacterCount: string | number;
    avgGlossUnitPrice: number;
    avgNetUnitPrice: number;
    count: number;
}

interface CreatorRank {
    name: string;
    count: number;
}

interface SummaryStats {
    totalGloss: number;
    totalCount: number;
    supervisedCount: number;
    normalCount: number;
    topCreators: CreatorRank[];
    topSupervisedCreators: CreatorRank[];
}

interface ProjectAnalysisReportTemplateProps {
    projectStatsList: ProjectStat[];
    yearlyStats: YearlyStat[];
    summaryStats: SummaryStats;
}

const ProjectAnalysisReportTemplate = React.forwardRef<HTMLDivElement, ProjectAnalysisReportTemplateProps>(({ projectStatsList, yearlyStats, summaryStats }, ref) => {
    const today = new Date().toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const supervisedRate = summaryStats.totalCount > 0 
        ? ((summaryStats.supervisedCount / summaryStats.totalCount) * 100).toFixed(1) 
        : '0';

    return (
        <div ref={ref} className="p-10 bg-white font-sans text-gray-800" style={{ width: '297mm', minHeight: '210mm', margin: 'auto' }}>
            <header className="mb-6 flex justify-between items-end border-b-2 border-earth-600 pb-2">
                <h1 className="text-2xl font-bold text-earth-800">版権料集積レポート</h1>
                <p className="text-sm text-gray-600">出力日: {today}</p>
            </header>

            <div className="flex gap-6 mb-8">
                {/* 左側: プロジェクト別 具体数値 */}
                <div className="flex-grow">
                    <h2 className="text-md font-bold mb-2 text-gray-700 border-l-4 border-earth-500 pl-2">プロジェクト別 各種数値</h2>
                    <table className="w-full text-[9px] text-left border-collapse border border-gray-300">
                        <thead className="bg-gray-100 italic">
                            <tr>
                                <th className="border border-gray-300 p-1">年度</th>
                                <th className="border border-gray-300 p-1 min-w-[120px]">作品名</th>
                                <th className="border border-gray-300 p-1">担当者</th>
                                <th className="border border-gray-300 p-1 text-right">GLOSS</th>
                                <th className="border border-gray-300 p-1 text-right">MARGIN額</th>
                                <th className="border border-gray-300 p-1 text-right">MARGIN率</th>
                                <th className="border border-gray-300 p-1 text-right">NET</th>
                                <th className="border border-gray-300 p-1 text-right text-gray-400">GLOSS単価</th>
                                <th className="border border-gray-300 p-1 text-right text-gray-400">NET単価</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectStatsList.map((p, i) => (
                                <tr key={p.id || i} className={p.category?.includes('【監修】') ? 'bg-yellow-50/50' : ''}>
                                    <td className="border border-gray-300 p-1 whitespace-nowrap text-[8px]">{p.fiscalYear}</td>
                                    <td className="border border-gray-300 p-1 font-medium">{p.title}</td>
                                    <td className="border border-gray-300 p-1 text-[8px]">{p.workerName || '-'}</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono">¥{p.gloss.toLocaleString()}</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono">¥{p.margin.toLocaleString()}</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono">{p.marginRate}%</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono">¥{p.net.toLocaleString()}</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono text-gray-400">¥{p.glossUnitPrice.toLocaleString()}</td>
                                    <td className="border border-gray-300 p-1 text-right font-mono text-gray-400">¥{p.netUnitPrice.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 右側: 年度別 サマリー */}
                <div className="w-64 flex-shrink-0">
                    <h2 className="text-md font-bold mb-2 text-gray-700 border-l-4 border-earth-500 pl-2">年度別 平均値</h2>
                    <div className="space-y-3">
                        {yearlyStats.map(stat => (
                            <div key={stat.year} className={`p-2 rounded border border-gray-200 text-[10px] ${stat.year.includes('【監修】') ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                                <div className="font-bold text-earth-700 mb-1 border-b border-gray-300 pb-0.5 flex justify-between">
                                    <span>{stat.year}</span>
                                    <span className="text-[9px] font-normal text-gray-500">({stat.count}件)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono">
                                    <div className="text-gray-500 font-sans text-[9px]">GLOSS平均:</div>
                                    <div className="text-right">¥{stat.avgGloss.toLocaleString()}</div>
                                    <div className="text-gray-500 font-sans text-[9px]">GLOSS単価:</div>
                                    <div className="text-right text-gray-400">¥{stat.avgGlossUnitPrice.toLocaleString()}</div>
                                    <div className="text-gray-500 font-sans text-[9px]">NET平均:</div>
                                    <div className="text-right">¥{stat.avgNet.toLocaleString()}</div>
                                    <div className="text-gray-500 font-sans text-[9px]">NET単価:</div>
                                    <div className="text-right text-gray-400">¥{stat.avgNetUnitPrice.toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 分析サマリーセクション (サイズ調整) */}
            <div className="mt-2 p-3 rounded-lg border border-earth-100 bg-gradient-to-br from-white to-earth-50/20">
                <h2 className="text-sm font-bold mb-2 text-earth-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-earth-500 rounded-full"></span>
                    版権分析サマリー
                </h2>
                
                <div className="grid grid-cols-3 gap-4">
                    {/* 数値指標 */}
                    <div className="space-y-2 col-span-1">
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[8px] text-gray-400 font-bold mb-0.5">年間の総売上 (GLOSS合計)</p>
                            <p className="text-base font-mono font-bold text-gray-800 line-height-tight">¥{summaryStats.totalGloss.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[8px] text-gray-400 font-bold mb-0.5">年間の案件総数</p>
                            <div className="flex items-end gap-2">
                                <p className="text-base font-mono font-bold text-gray-800 leading-tight">{summaryStats.totalCount}<span className="text-[9px] font-sans ml-0.5">件</span></p>
                                <p className="text-[8px] text-gray-400 pb-0.5">(通常: {summaryStats.normalCount} / 監修: {summaryStats.supervisedCount})</p>
                            </div>
                        </div>
                        <div className="bg-yellow-50/40 p-2 rounded border border-yellow-100">
                            <p className="text-[8px] text-yellow-700 font-bold mb-0.5">監修案件の割合</p>
                            <div className="flex items-center gap-2">
                                <p className="text-base font-mono font-bold text-yellow-800 leading-tight">{supervisedRate}<span className="text-[9px] font-sans ml-0.5">%</span></p>
                                <div className="flex-grow bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-400 h-full" style={{ width: `${supervisedRate}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* クリエイター分析 */}
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <h3 className="text-[9px] font-bold text-gray-500 mb-1.5 border-b border-gray-50 pb-0.5 uppercase tracking-wider">最多作業クリエイター</h3>
                            <div className="space-y-1">
                                {summaryStats.topCreators.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] text-white ${i === 0 ? 'bg-amber-400' : 'bg-gray-300'}`}>
                                                {i + 1}
                                            </span>
                                            <span className="text-[10px] font-bold">{c.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono">{c.count}件</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-white p-2 rounded border border-gray-100">
                            <h3 className="text-[9px] font-bold text-gray-500 mb-1.5 border-b border-gray-50 pb-0.5 uppercase tracking-wider">最多監修クリエイター</h3>
                            <div className="space-y-1">
                                {summaryStats.topSupervisedCreators.length > 0 ? summaryStats.topSupervisedCreators.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center bg-yellow-50/50 px-2 py-1 rounded">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[8px] text-white ${i === 0 ? 'bg-yellow-500' : 'bg-yellow-200'}`}>
                                                {i + 1}
                                            </span>
                                            <span className="text-[10px] font-bold">{c.name}</span>
                                        </div>
                                        <span className="text-[10px] font-mono">{c.count}件</span>
                                    </div>
                                )) : (
                                    <div className="text-gray-400 text-[9px] italic py-2 text-center">該当者なし</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="mt-6 pt-3 border-t border-gray-300 text-[8px] text-gray-400 italic flex justify-between">
                <p>※ GLOSS:受注、MARGIN:粗利、NET:原価、GLOSS単価:受注÷体数、NET単価:原価÷体数</p>
                <p>Owl Ledger Analysis System | Confidential</p>
            </footer>

            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        background-color: white !important;
                    }
                    .p-10 { padding: 0 !important; }
                    .shadow-inner, .shadow-sm { box-shadow: none !important; border: 1px solid #eee !important; }
                }
            `}</style>
        </div>
    );
});

ProjectAnalysisReportTemplate.displayName = 'ProjectAnalysisReportTemplate';

export default ProjectAnalysisReportTemplate;
