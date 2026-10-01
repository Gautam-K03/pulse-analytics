import { AlertTriangle, ArrowRight, CheckCircle2, Database, LayoutDashboard, Sigma, Table2, XCircle } from 'lucide-react';
import { DATA_ASSETS, assetById } from '@/lib/lineage';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, Card, CardHeader, ProgressBar } from '@/components/ui';
import { useAppStore } from '@/store';

const KIND_ICON = { source: Database, model: Table2, metric: Sigma, dashboard: LayoutDashboard } as const;
const CHECK_ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;

export default function DataQualityPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const failing = DATA_ASSETS.filter((a) => a.checks.some((c) => c.status === 'fail'));

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Data quality & lineage</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Workspace <span className="font-mono">{tenantId}</span> Â· {DATA_ASSETS.length} assets Â· {failing.length} with failing checks
        </p>
      </div>

      {failing.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs dark:border-amber-900 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">{failing.length} asset{failing.length > 1 ? 's' : ''} with failing checks</p>
            <p className="mt-0.5 text-amber-700/80 dark:text-amber-300/80">
              {failing.map((a) => a.name).join(', ')} â€” downstream metrics may be stale or incomplete.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {DATA_ASSETS.map((asset) => {
          const Icon = KIND_ICON[asset.kind];
          const upstream = asset.upstream.map(assetById).filter(Boolean);
          const downstream = asset.downstream.map(assetById).filter(Boolean);
          const qTone = asset.qualityScore >= 95 ? 'brand' : asset.qualityScore >= 80 ? 'warning' : 'critical';

          return (
            <Card key={asset.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    asset.kind === 'source' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      : asset.kind === 'model' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300'
                        : asset.kind === 'metric' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{asset.name}</span>
                      <Badge tone="neutral">{asset.kind}</Badge>
                      <span className="font-mono text-[10px] text-slate-400">{asset.id}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Owner {asset.owner} Â· {asset.rows > 0 ? `${asset.rows.toLocaleString()} rows Â· ` : ''}freshness {asset.freshnessMins}m
                    </p>
                  </div>
                </div>

                <div className="w-40">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">Quality</span>
                    <span className="tabular text-xs font-semibold text-slate-700 dark:text-slate-200">{asset.qualityScore}</span>
                  </div>
                  <ProgressBar value={asset.qualityScore} max={100} tone={qTone} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Upstream</p>
                  {upstream.length === 0 ? <p className="text-[11px] text-slate-400">â€” root source</p> : (
                    <ul className="space-y-1">
                      {upstream.map((u) => u && (
                        <li key={u.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />{u.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Downstream</p>
                  {downstream.length === 0 ? <p className="text-[11px] text-slate-400">â€” terminal</p> : (
                    <ul className="space-y-1">
                      {downstream.map((d) => d && (
                        <li key={d.id} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />{d.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Checks</p>
                  {asset.checks.length === 0 ? <p className="text-[11px] text-slate-400">No checks configured</p> : (
                    <ul className="space-y-1.5">
                      {asset.checks.map((check) => {
                        const CheckIcon = CHECK_ICON[check.status];
                        return (
                          <li key={check.id} className="flex items-start gap-1.5">
                            <CheckIcon className={cn('mt-0.5 h-3 w-3 shrink-0',
                              check.status === 'pass' && 'text-emerald-500',
                              check.status === 'warn' && 'text-amber-500',
                              check.status === 'fail' && 'text-rose-500')} />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{check.name}</p>
                              <p className="text-[10px] text-slate-400">{check.detail} Â· {relativeTime(check.lastRun)}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Lineage" subtitle="How a source flows into the metric a chart renders" />
        <div className="overflow-x-auto p-5">
          <div className="flex min-w-max items-center gap-3 text-[11px]">
            {['Production Postgres', 'Product events', 'Active Users', 'Overview dashboard'].map((node, i, arr) => (
              <div key={node} className="flex items-center gap-3">
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{node}</span>
                {i < arr.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" /> : null}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}