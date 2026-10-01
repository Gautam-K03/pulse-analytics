import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import type { TableRow } from '@/types';
import { cn } from '@/lib/cn';
import { formatNumber, relativeTime } from '@/lib/format';
import { useCustomers, useVirtualRows } from '@/hooks';
import { useAppStore } from '@/store';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from './ui';

const RISK_TONE = { low: 'positive', medium: 'warning', high: 'critical' } as const;
const ROW_HEIGHT = 44;

function HealthBar({ value }: { value: number }) {
  const tone = value > 75 ? 'bg-emerald-500' : value > 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${value}%` }} />
      </div>
      <span className="tabular text-xs text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

function MiniTable() {
  const query = useCustomers({ page: 1, pageSize: 6, sort: 'mrr', dir: 'desc' });
  if (query.isLoading) return <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>;
  if (query.isError) return <ErrorState description="Could not load accounts." onRetry={() => query.refetch()} />;
  const rows = query.data?.rows ?? [];
  if (rows.length === 0) return <EmptyState title="No accounts yet" description="Connect a data source to populate accounts." />;
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{row.name}</p>
            <p className="truncate text-[11px] text-slate-400">{row.plan}</p>
          </div>
          <span className="tabular shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">${formatNumber(row.mrr)}</span>
        </div>
      ))}
    </div>
  );
}

export function CustomerMiniTable() { return <MiniTable />; }

type SortKey = keyof TableRow;

export function CustomerTable() {
  const tenantId = useAppStore((s) => s.tenantId);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('mrr');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const scrollRef = useRef<HTMLDivElement>(null);

  const query = useCustomers({ page, pageSize, q: search, sort, dir });
  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const { start, end } = useVirtualRows(rows.length, ROW_HEIGHT, scrollRef);

  const [lastTenant, setLastTenant] = useState(tenantId);
  if (lastTenant !== tenantId) { setLastTenant(tenantId); setPage(1); setSearch(''); }

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setDir('desc'); }
  };

  const columns: Array<{ key: SortKey; label: string; className?: string }> = [
    { key: 'name', label: 'Account' },
    { key: 'plan', label: 'Plan' },
    { key: 'region', label: 'Region', className: 'hidden md:table-cell' },
    { key: 'seats', label: 'Seats', className: 'hidden sm:table-cell' },
    { key: 'mrr', label: 'MRR' },
    { key: 'health', label: 'Health', className: 'hidden lg:table-cell' },
    { key: 'churnRisk', label: 'Risk', className: 'hidden lg:table-cell' },
    { key: 'lastActive', label: 'Last active', className: 'hidden xl:table-cell' },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Accounts</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatNumber(total)} accounts Â· server-side paging, virtualised rows</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search accountsâ€¦" aria-label="Search accounts"
            className="h-8 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" />
        </div>
      </div>

      {query.isError ? (
        <ErrorState title="Couldn't load accounts" description={query.error instanceof Error ? query.error.message : undefined} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2 p-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No accounts match" description="Try clearing the search or widening the date range."
          action={<Button size="sm" variant="secondary" onClick={() => setSearch('')}>Clear search</Button>} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/95">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} scope="col" className={cn('px-5 py-2.5 font-medium text-slate-500 dark:text-slate-400', col.className)}>
                      <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100" aria-label={`Sort by ${col.label}`}>
                        {col.label}
                        {sort === col.key ? (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <div ref={scrollRef} className="overflow-y-auto overflow-x-auto" style={{ maxHeight: 520 }}>
            <div style={{ height: rows.length * ROW_HEIGHT, position: 'relative' }}>
              <table className="w-full border-collapse text-left text-xs">
                <tbody>
                  {rows.slice(start, end).map((row, i) => (
                    <tr key={row.id} style={{ position: 'absolute', top: (start + i) * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}
                      className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                        {row.name}
                        <span className="ml-2 font-mono text-[10px] text-slate-400">{row.id}</span>
                      </td>
                      <td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">{row.plan}</td>
                      <td className="hidden px-5 py-2.5 text-slate-600 md:table-cell dark:text-slate-300">{row.region}</td>
                      <td className="tabular hidden px-5 py-2.5 text-slate-600 sm:table-cell dark:text-slate-300">{row.seats}</td>
                      <td className="tabular px-5 py-2.5 font-semibold text-slate-800 dark:text-slate-100">${formatNumber(row.mrr)}</td>
                      <td className="hidden px-5 py-2.5 lg:table-cell"><HealthBar value={row.health} /></td>
                      <td className="hidden px-5 py-2.5 lg:table-cell"><Badge tone={RISK_TONE[row.churnRisk]}>{row.churnRisk}</Badge></td>
                      <td className="hidden px-5 py-2.5 text-slate-500 xl:table-cell dark:text-slate-400">{relativeTime(row.lastActive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}