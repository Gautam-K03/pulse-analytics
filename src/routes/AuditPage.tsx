import { useEffect, useMemo, useState } from 'react';
import { Bot, Cpu, Download, ShieldOff, User } from 'lucide-react';
import { seedAudit, subscribeAudit, getAudit } from '@/lib/audit';
import { exportJson } from '@/lib/reports';
import { useAppStore } from '@/store';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import type { AuditEvent, AuditKind } from '@/types';

const KIND_META: Record<AuditKind, { icon: typeof User; label: string; tone: 'neutral' | 'brand' | 'info' }> = {
  user: { icon: User, label: 'User', tone: 'neutral' },
  ai: { icon: Bot, label: 'AI', tone: 'brand' },
  system: { icon: Cpu, label: 'System', tone: 'info' },
};

const OUTCOME_TONE = { success: 'positive', failure: 'critical', blocked: 'warning' } as const;

export default function AuditPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [kindFilter, setKindFilter] = useState<AuditKind | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    seedAudit(tenantId, 'you@pulse.dev');
    return subscribeAudit((all) => setEvents(all));
  }, [tenantId]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return getAudit(tenantId)
      .filter((e) => kindFilter === 'all' || e.kind === kindFilter)
      .filter((e) => !needle || e.action.toLowerCase().includes(needle) || e.target.toLowerCase().includes(needle) || e.actor.toLowerCase().includes(needle));
  }, [events, tenantId, kindFilter, search]);

  const counts = useMemo(() => {
    const all = getAudit(tenantId);
    return {
      user: all.filter((e) => e.kind === 'user').length,
      ai: all.filter((e) => e.kind === 'ai').length,
      system: all.filter((e) => e.kind === 'system').length,
      blocked: all.filter((e) => e.outcome === 'blocked').length,
    };
  }, [events, tenantId]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            User and AI actions are recorded on separate streams so a wrong answer can be traced without mixing it into user activity.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => exportJson(filtered, `audit-${tenantId}.json`)}>
          <Download className="h-3.5 w-3.5" /> Export JSON
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'User events', value: counts.user, tone: 'neutral' as const, icon: User },
          { label: 'AI events', value: counts.ai, tone: 'brand' as const, icon: Bot },
          { label: 'System events', value: counts.system, tone: 'info' as const, icon: Cpu },
          { label: 'Blocked', value: counts.blocked, tone: 'warning' as const, icon: ShieldOff },
        ].map(({ label, value, tone, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
              <Icon className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="tabular mt-1.5 text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</div>
            <div className="mt-1"><Badge tone={tone}>{label.toLowerCase()}</Badge></div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Events" subtitle={`${filtered.length} shown`}
          action={
            <div className="flex items-center gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter eventsâ€¦"
                className="h-8 w-48 rounded-lg border border-slate-200 bg-white px-2.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900" />
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                {(['all', 'user', 'ai', 'system'] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKindFilter(k)} aria-pressed={kindFilter === k}
                    className={cn('rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors',
                      kindFilter === k ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800')}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
          } />

        {filtered.length === 0 ? (
          <EmptyState title="No events match" description="Adjust the filter or clear the search." />
        ) : (
          <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {filtered.map((event) => {
              const meta = KIND_META[event.kind];
              const Icon = meta.icon;
              const isAiBlocked = event.kind === 'ai' && event.outcome === 'blocked';
              return (
                <div key={event.id} className={cn('flex items-start gap-3 px-5 py-3 transition-colors', isAiBlocked && 'bg-amber-50/40 dark:bg-amber-950/10')}>
                  <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                    event.kind === 'ai' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
                      : event.kind === 'system' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-100">{event.action}</span>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <Badge tone={OUTCOME_TONE[event.outcome]}>{event.outcome}</Badge>
                      <span className="text-[11px] text-slate-400">{relativeTime(event.ts)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{event.actor}</span>{' Â· '}{event.actorRole}{' â†’ '}
                      <span className="font-mono">{event.target}</span>{' Â· '}{event.ip}
                    </p>
                    {event.meta ? (
                      <pre className="mt-1.5 overflow-x-auto rounded bg-slate-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                        {JSON.stringify(event.meta, null, 0)}
                      </pre>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}