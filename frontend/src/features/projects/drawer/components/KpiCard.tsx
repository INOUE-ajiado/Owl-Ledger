export const KpiCard = ({ title, value, colorClass = 'text-gray-900' }: { title: string; value: string; colorClass?: string }) => (
  <div className="p-4 rounded-lg bg-gray-50">
    <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
    <p className={`mt-1 text-3xl font-semibold ${colorClass}`}>{value}</p>
  </div>
);