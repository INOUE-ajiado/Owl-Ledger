import type { ReactNode } from 'react';

/** 詳細ページの見出し付きパネル */
export const Panel = ({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) => (
  <section className="overflow-hidden bg-white/60 backdrop-blur-sm border-y sm:border border-white/40 sm:rounded-xl shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/40 bg-white/60">
      <h3 className="text-sm font-semibold text-earth-800">{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

export const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="p-4 bg-white/60 sm:rounded-lg">
    <p className="text-xs font-semibold tracking-wide text-earth-500">{label}</p>
    <p className="mt-1 text-xl font-bold tabular-nums text-earth-900">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-earth-500">{sub}</p>}
  </div>
);

export const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
    <dt className="text-earth-500">{label}</dt>
    <dd className="col-span-2 break-words text-earth-900">{value || '—'}</dd>
  </div>
);

export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status === '完了' ? 'bg-green-100 text-green-800' : status === '請求済' ? 'bg-earth-100 text-earth-800' : 'bg-yellow-100 text-yellow-800'}`}>
    {status}
  </span>
);
