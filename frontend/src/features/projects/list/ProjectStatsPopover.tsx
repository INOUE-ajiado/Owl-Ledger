import { FileDown } from 'lucide-react';
import type { ProjectStatRow, YearlyStat } from './projectStats';

interface ProjectStatsPopoverProps {
  stats: { projectStatsList: ProjectStatRow[]; yearlyStats: YearlyStat[] };
  onPrintReport: () => void;
}

/** プロジェクト一覧の「分析」ポップオーバー (プロジェクト別の数値と年度別の平均) */
const ProjectStatsPopover = ({ stats, onPrintReport }: ProjectStatsPopoverProps) => (
    <div className="fixed inset-x-2 top-16 z-30 max-h-[80vh] overflow-auto md:absolute md:inset-x-auto md:top-auto md:right-0 md:w-auto md:min-w-[950px] md:max-w-[95vw] mt-2 origin-top-right bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none p-4 flex flex-col md:flex-row gap-6">

        {/* 左側: プロジェクト別 実数値一覧 */}
        <div className="flex-1 md:border-r border-gray-200 md:pr-6 overflow-x-auto md:min-w-[650px]">
            <div className="flex justify-between items-center border-b pb-2 mb-3">
                <h3 className="text-sm font-bold text-gray-800">プロジェクト別 各種数値</h3>
                <button
                    onClick={() => onPrintReport()}
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
                        {stats.projectStatsList.length > 0 ? stats.projectStatsList.map((pStat, i) => (
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
        <div className="md:w-64 flex-shrink-0">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2 mb-3">年度別 平均値</h3>
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {stats.yearlyStats.length > 0 ? stats.yearlyStats.map(stat => (
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
);

export default ProjectStatsPopover;
