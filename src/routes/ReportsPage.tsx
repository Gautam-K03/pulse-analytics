import { useState } from 'react';
import { CalendarClock, FileSpreadsheet, FileText, Pause, Play, Plus, Send, Trash2 } from 'lucide-react';
import { SCHEDULED_REPORTS, exportPdfReport, exportSpreadsheet, exportSeriesCsv } from '@/lib/reports';
import { useMetricSeries, useCustomers } from '@/hooks';
import { appendAudit } from '@/lib/audit';
import { METRIC_MAP } from '@/lib/metrics';
import { relativeTime } from '@/lib/format';
import { useAppStore } from '@/store';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import type { ReportFormat, ScheduledReport } from '@/types';

const FORMAT_ICON = { pdf: FileText, csv: FileSpreadsheet, xlsx: FileSpreadsheet } as const;
const STATUS_TONE = { active: 'positive', paused: 'warning', failed: 'critical' } as const;

export default function ReportsPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const role = useAppStore((s) => s.role);
  const [reports, setReports] = useState<ScheduledReport[]>(SCHEDULED_REPORTS);
  const canManage = role !== 'viewer';

  const mrr = useMetricSeries('mrr');
  const customers = useCustomers({ page: 1, pageSize: 100 });
  const [generating, setGenerating] = useState<string | null>(null);

  const toggle = (id: string) => setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r)));
  const remove = (id: string) => setReports((prev) => prev.filter((r) => r.id !== id));

  const runNow = async (report: ScheduledReport) => {
    setGenerating(report.id);
    await new Promise((r) => setTimeout(r, 500));

    if (report.format === 'pdf') {
      exportPdfReport(report.name, [
        { heading: 'Headline metrics', rows: [
          ['MRR', mrr.data ? `$${Math.round(mrr.data.total).toLocaleString()}` : 'â€”'],
          ['MRR change vs prev.', mrr.data ? `${mrr.data.delta > 0 ? '+' : ''}${mrr.data.delta.toFixed(1)}%` : 'â€”'],
          ['Active customers', String(customers.data?.total ?? 'â€”')],
        ] },
        { heading: 'Report configuration', rows: [
          ['Cadence', report.cadence],
          ['Recipients', report.recipients.join(', ')],
          ['Generated', new Date().toLocaleString()],
        ] },
      ]);
    } else if (report.format === 'csv' && mrr.data) {
      exportSeriesCsv(mrr.data, METRIC_MAP.mrr.label);
    } else {
      exportSpreadsheet(report.name, [
        { name: 'Metrics', rows: (mrr.data?.points ?? []).map((p) => ({ date: p.t, value: p.value })) },
        { name: 'Accounts', rows: (customers.data?.rows ?? []).map((r) => ({ id: r.id, name: r.name, plan: r.plan, mrr: r.mrr, seats: r.seats })) },
      ]);
    }

    setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, lastRun: new Date().toISOString() } : r)));
    appendAudit({ tenantId, kind: 'user', actor: 'you@pulse.dev', actorRole: role, action: `report.run.${report.format}`, target: report.name, outcome: 'success', ip: '203.0.113.42' });
    setGenerating(null);
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reports & exports</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Schedule PDF, CSV or Excel deliveries. Every run is written to the audit log.</p>
        </div>
        {canManage ? <Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> New report</Button> : null}
      </div>

      {reports.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="No scheduled reports"
            description="Create a report to deliver a dashboard snapshot to your team on a cadence."
            action={<Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> New report</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {reports.map((report) => {
            const Icon = FORMAT_ICON[report.format as ReportFormat];
            return (
              <Card key={report.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{report.name}</span>
                        <Badge tone={STATUS_TONE[report.status]}>{report.status}</Badge>
                        <Badge tone="neutral">{report.format.toUpperCase()}</Badge>
                        <Badge tone="neutral">{report.cadence}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        To {report.recipients.join(', ')} Â· next run {new Date(report.nextRun).toLocaleString()} Â·{' '}
                        {report.lastRun ? `last run ${relativeTime(report.lastRun)}` : 'never run'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" disabled={generating === report.id} onClick={() => void runNow(report)}>
                      <Send className="h-3.5 w-3.5" />{generating === report.id ? 'Generatingâ€¦' : 'Run now'}
                    </Button>
                    {canManage ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => toggle(report.id)}>
                          {report.status === 'active' ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
                        </Button>
                        <Button size="sm" variant="ghost" aria-label="Delete report" onClick={() => remove(report.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Ad-hoc export" subtitle="One-off downloads that respect the current tenant and date range" />
        <div className="flex flex-wrap gap-2 p-5">
          <Button variant="secondary" size="sm" onClick={() => mrr.data && exportSeriesCsv(mrr.data, METRIC_MAP.mrr.label)} disabled={!mrr.data}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> MRR (CSV)
          </Button>
          <Button variant="secondary" size="sm" disabled={!customers.data}
            onClick={() => customers.data && exportSpreadsheet('Accounts export', [
              { name: 'Accounts', rows: customers.data.rows.map((r) => ({ id: r.id, name: r.name, region: r.region, plan: r.plan, mrr: r.mrr, seats: r.seats, health: r.health, churnRisk: r.churnRisk })) },
            ])}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Accounts (XLSX)
          </Button>
          <Button variant="secondary" size="sm" disabled={!mrr.data}
            onClick={() => mrr.data && exportPdfReport('Executive snapshot', [
              { heading: 'Headline', rows: [
                ['MRR', `$${Math.round(mrr.data.total).toLocaleString()}`],
                ['Change vs prev.', `${mrr.data.delta > 0 ? '+' : ''}${mrr.data.delta.toFixed(1)}%`],
                ['Active accounts', String(customers.data?.total ?? 'â€”')],
              ] },
            ])}>
            <FileText className="h-3.5 w-3.5" /> Snapshot (PDF)
          </Button>
        </div>
      </Card>
    </div>
  );
}