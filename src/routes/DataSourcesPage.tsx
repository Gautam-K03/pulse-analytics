import { useState } from 'react';
import { CheckCircle2, Database, Plus, RefreshCw, Webhook, FileSpreadsheet } from 'lucide-react';
import { control } from '@/lib/mockApi';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader } from '@/components/ui';

interface Source { id: string; name: string; kind: 'database' | 'api' | 'file' | 'webhook'; status: 'healthy' | 'syncing' | 'error'; schedule: string; lastSync: string; rows: number; }

const ICONS = { database: Database, api: RefreshCw, file: FileSpreadsheet, webhook: Webhook };

const SOURCES: Source[] = [
  { id: 'src_pg', name: 'Production Postgres', kind: 'database', status: 'healthy', schedule: 'Every 15 min', lastSync: new Date(Date.now() - 4 * 60_000).toISOString(), rows: 4_812_004 },
  { id: 'src_stripe', name: 'Stripe Billing', kind: 'api', status: 'healthy', schedule: 'Real-time', lastSync: new Date(Date.now() - 40_000).toISOString(), rows: 918_233 },
  { id: 'src_csv', name: 'Finance CSV drop', kind: 'file', status: 'syncing', schedule: 'Daily 06:00', lastSync: new Date(Date.now() - 3 * 3600_000).toISOString(), rows: 42_119 },
  { id: 'src_hook', name: 'Product event webhook', kind: 'webhook', status: 'error', schedule: 'Streaming', lastSync: new Date(Date.now() - 92 * 60_000).toISOString(), rows: 18_904_551 },
];

const STATUS_TONE = { healthy: 'positive', syncing: 'info', error: 'critical' } as const;

export default function DataSourcesPage() {
  const [sources, setSources] = useState(SOURCES);
  const [simulateErrors, setSimulateErrors] = useState(false);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Data sources</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Connectors, sync schedules and data freshness. Phase 1 ships two hardcoded connectors; the general framework lands in Phase 2.
          </p>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> Add connector</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sources.map((source) => {
          const Icon = ICONS[source.kind];
          return (
            <Card key={source.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{source.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{source.schedule} Â· {source.rows.toLocaleString()} rows</p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[source.status]}>{source.status}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Last sync {relativeTime(source.lastSync)}</span>
                <button type="button" className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  onClick={() => setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, lastSync: new Date().toISOString(), status: 'healthy' } : s))}>
                  Sync now
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Developer / demo controls" subtitle="Not part of the product surface â€” used to exercise error and latency states" />
        <div className="space-y-4 p-5">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="failure-rate" className="text-xs font-medium text-slate-600 dark:text-slate-300">Simulated API failure rate</label>
              <span className="tabular text-xs text-slate-500">{Math.round(control.failureRate * 100)}%</span>
            </div>
            <input id="failure-rate" type="range" min={0} max={0.8} step={0.05} value={control.failureRate}
              onChange={(e) => { control.failureRate = Number(e.target.value); setSimulateErrors(Number(e.target.value) > 0); }}
              className="mt-2 w-full accent-brand-600" />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Drag up, then reload a chart to see the retry / error state.{simulateErrors ? ' Errors are currently being injected.' : ''}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="latency" className="text-xs font-medium text-slate-600 dark:text-slate-300">Artificial latency</label>
              <span className="tabular text-xs text-slate-500">{control.latency[0]}â€“{control.latency[1]}ms</span>
            </div>
            <input id="latency" type="range" min={0} max={3000} step={100} value={control.latency[1]}
              onChange={(e) => { const max = Number(e.target.value); control.latency = [Math.round(max * 0.4), max]; setSources((prev) => [...prev]); }}
              className={cn('mt-2 w-full accent-brand-600')} />
          </div>
        </div>
      </Card>
    </div>
  );
}