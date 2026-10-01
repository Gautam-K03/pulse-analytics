import { useState } from 'react';
import { BellOff, Check, Clock, Mail, MessageSquare, Webhook } from 'lucide-react';
import { useAlerts } from '@/hooks';
import { relativeTime } from '@/lib/format';
import { SEVERITY_STYLES } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { METRIC_MAP } from '@/lib/metrics';

const CHANNEL_ICON: Record<string, typeof Mail> = { Email: Mail, Slack: MessageSquare, 'Email + Slack': Mail, 'In-app': BellOff };

export default function AlertsPage() {
  const query = useAlerts();
  const [filter, setFilter] = useState<'all' | 'firing' | 'resolved' | 'snoozed'>('all');
  const alerts = (query.data ?? []).filter((a) => filter === 'all' || a.status === filter);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Alerts</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Threshold and ML-based alerts with grouping and snooze controls to prevent fatigue.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          {(['all', 'firing', 'snoozed', 'resolved'] as const).map((status) => (
            <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status}
              className={cn('rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                filter === status ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
              {status}
            </button>
          ))}
        </div>
      </div>

      {query.isError ? (
        <Card><ErrorState title="Couldn't load alerts" description={query.error instanceof Error ? query.error.message : undefined} onRetry={() => query.refetch()} /></Card>
      ) : query.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-3 h-3 w-full" /></Card>)}</div>
      ) : alerts.length === 0 ? (
        <Card><EmptyState title="No alerts in this view" description="Alerts you configure will appear here with their severity, threshold and delivery channel." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3">
            {alerts.map((alert) => {
              const ChannelIcon = CHANNEL_ICON[alert.channel] ?? Webhook;
              const metric = METRIC_MAP[alert.metricId];
              return (
                <Card key={alert.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset', SEVERITY_STYLES[alert.severity])}>{alert.severity}</span>
                        <Badge tone={alert.status === 'firing' ? 'critical' : alert.status === 'snoozed' ? 'warning' : 'positive'}>{alert.status}</Badge>
                        <span className="font-mono text-[11px] text-slate-400">{metric?.id ?? alert.metricId}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{alert.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{alert.note}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                        <span className="tabular">value <strong className="text-slate-600 dark:text-slate-300">{alert.value}</strong> Â· threshold <strong className="text-slate-600 dark:text-slate-300">{alert.threshold}</strong></span>
                        <span className="inline-flex items-center gap-1"><ChannelIcon className="h-3 w-3" /> {alert.channel}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {relativeTime(alert.triggeredAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="secondary"><BellOff className="h-3.5 w-3.5" /> Snooze</Button>
                      <Button size="sm" variant="secondary"><Check className="h-3.5 w-3.5" /> Resolve</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader title="Alert fatigue controls" subtitle="Grouping, snooze windows and severity thresholds keep signal high" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
              {[
                { label: 'Grouping window', value: '15 minutes', hint: 'Identical alerts collapse into one thread' },
                { label: 'Auto-snooze', value: '2 hours', hint: 'After acknowledgement, suppress repeats' },
                { label: 'Escalation', value: 'Critical only', hint: 'Page on-call only for critical severity' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{item.hint}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}