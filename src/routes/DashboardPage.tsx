import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, X } from 'lucide-react';
import { useAppStore, useAnnotationsStore, useOnboardingStore } from '@/store';
import { useMetricSeries } from '@/hooks';
import { buildInsights } from '@/lib/insights';
import { METRIC_MAP } from '@/lib/metrics';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, EmptyState, Select, Skeleton } from '@/components/ui';
import { DeltaBadge, ForecastChart, MetricLineChart, useForecast } from '@/components/charts';
import { FilterBar } from '@/components/Filters';
import { DashboardGrid } from '@/components/DashboardGrid';
import { SavedViewsBar, CrossFilterBar } from '@/components/SavedViews';
import { NlqConsole } from '@/components/NlqConsole';
import { usePermission } from '@/components/AppShell';
import type { NlqResult } from '@/types';

function FirstRunBanner() {
  const tenantId = useAppStore((s) => s.tenantId);
  const dismissed = useOnboardingStore((s) => s.dismissedByTenant[tenantId]);
  const done = useOnboardingStore((s) => s.completedByTenant[tenantId] ?? []);
  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 dark:border-brand-800 dark:from-brand-900/30 dark:to-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"><Sparkles className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Welcome to Pulse</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {done.length === 0 ? 'Five quick steps to a useful workspace.' : `${done.length} of 5 setup steps complete.`}
          </p>
        </div>
      </div>
      <Link to="/onboarding"><Button variant="primary" size="sm">Continue setup</Button></Link>
    </div>
  );
}

function InsightPanel() {
  const aiEnabled = useAppStore((s) => s.aiEnabled);
  const setAiEnabled = useAppStore((s) => s.setAiEnabled);
  const series = useMetricSeries('mrr');
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const insights = series.data ? buildInsights(series.data, aiEnabled) : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={<span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-brand-500" />AI insights</span>}
        subtitle="Heuristic summaries Â· replace with your LLM endpoint in Phase 2"
        action={<Button size="sm" variant={aiEnabled ? 'ghost' : 'secondary'} onClick={() => setAiEnabled(!aiEnabled)}>{aiEnabled ? 'Disable' : 'Enable'}</Button>}
      />
      <div className="p-4">
        {!aiEnabled ? (
          <EmptyState title="AI insights are off" description="Charts and raw data are unaffected. Turn insights on to see generated summaries, anomalies and projections."
            action={<Button size="sm" variant="primary" onClick={() => setAiEnabled(true)}>Turn on insights</Button>} />
        ) : series.isLoading ? (
          <div className="space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>
        ) : series.isError ? (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No insight generated â€” the model was unavailable. Raw metrics are still accurate and shown above.
          </div>
        ) : insights.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Not enough data in this range to generate a confident insight. Widen the date range or wait for more events.</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((insight) => (
              <li key={insight.id} className="rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{insight.headline}</p>
                  <Badge tone={insight.confidence > 0.75 ? 'positive' : insight.confidence > 0.55 ? 'info' : 'warning'}>{Math.round(insight.confidence * 100)}%</Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{insight.body}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {insight.sources.map((source) => (
                      <span key={source} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{source}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {(['up', 'down'] as const).map((dir) => (
                      <button key={dir} type="button" aria-label={dir === 'up' ? 'Helpful' : 'Not helpful'} aria-pressed={feedback[insight.id] === dir}
                        onClick={() => setFeedback((f) => ({ ...f, [insight.id]: dir }))}
                        className={cn('rounded px-1.5 py-0.5 text-[11px] transition-colors',
                          feedback[insight.id] === dir ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')}>
                        {dir === 'up' ? 'ðŸ‘' : 'ðŸ‘Ž'}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function TopMovers() {
  const ids = ['mrr', 'active_users', 'churn_rate', 'trial_conversions'];
  const queries = ids.map((id) => useMetricSeries(id));

  return (
    <Card>
      <CardHeader title="Top movers" subtitle="Period-over-period change across headline metrics" />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {queries.map((query, i) => {
          const def = METRIC_MAP[ids[i]];
          return (
            <div key={ids[i]} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">{def.label}</p>
                <p className="truncate text-[11px] text-slate-400">{def.owner}</p>
              </div>
              {query.isLoading ? <Skeleton className="h-5 w-16" />
                : query.data ? <DeltaBadge delta={query.data.delta} higherIsBetter={def.higherIsBetter} />
                : <span className="text-[11px] text-slate-400">â€”</span>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ForecastPanel() {
  const [metricId, setMetricId] = useState('mrr');
  const query = useMetricSeries(metricId);
  const metric = METRIC_MAP[metricId];
  const forecast = useForecast(query.data, 14);

  return (
    <Card>
      <CardHeader title="Forecast" subtitle="Linear projection with an 80% confidence interval"
        action={
          <Select aria-label="Forecast metric" value={metricId} onChange={(e) => setMetricId(e.target.value)}>
            {['mrr', 'active_users', 'trial_conversions', 'expansion_revenue'].map((id) => (
              <option key={id} value={id}>{METRIC_MAP[id].label}</option>
            ))}
          </Select>
        } />
      {query.isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-xs text-slate-400">Loadingâ€¦</div>
      ) : forecast.length === 0 ? (
        <EmptyState title="Not enough history to forecast" description="At least 8 buckets are required. Widen the date range or switch to a coarser granularity." />
      ) : (
        <ForecastChart data={forecast} metric={metric} height={280} />
      )}
      <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-relaxed text-slate-400 dark:border-slate-800">
        Directional only â€” it does not model seasonality or step changes, and the interval widens with the square root of the horizon.
      </p>
    </Card>
  );
}

function AnnotatedChart() {
  const tenantId = useAppStore((s) => s.tenantId);
  const [metricId] = useState('mrr');
  const metric = METRIC_MAP[metricId];
  const query = useMetricSeries(metricId);
  const annotations = useAnnotationsStore((s) => s.forMetric(tenantId, metricId));
  const addAnnotation = useAnnotationsStore((s) => s.addAnnotation);
  const removeAnnotation = useAnnotationsStore((s) => s.removeAnnotation);
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), label: '' });

  return (
    <Card>
      <CardHeader
        title="MRR with annotations"
        subtitle="Mark releases, incidents or pricing changes"
        action={
          <form className="flex items-center gap-1.5" onSubmit={(e) => {
            e.preventDefault();
            if (!draft.label.trim()) return;
            addAnnotation({ tenantId, metricId, date: draft.date, label: draft.label.trim(), color: '#6366f1', author: 'you@pulse.dev' });
            setDraft({ date: new Date().toISOString().slice(0, 10), label: '' });
          }}>
            <input type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              className="h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px] dark:border-slate-700 dark:bg-slate-900" />
            <input value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} placeholder="Noteâ€¦"
              className="h-7 w-36 rounded border border-slate-200 bg-white px-2 text-[11px] dark:border-slate-700 dark:bg-slate-900" />
            <Button size="sm" variant="secondary" type="submit"><Plus className="h-3 w-3" /> Add</Button>
          </form>
        }
      />
      {query.isLoading ? (
        <div className="flex h-[300px] items-center justify-center text-xs text-slate-400">Loadingâ€¦</div>
      ) : query.data ? (
        <>
          <MetricLineChart series={query.data} metric={metric} height={280} showBrush={false} />
          {annotations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-2.5 dark:border-slate-800">
              {annotations.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                  <span className="font-mono">{a.date}</span>
                  <span>{a.label}</span>
                  <button type="button" aria-label={`Remove annotation ${a.label}`} onClick={() => removeAnnotation(a.id)}
                    className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

export default function DashboardPage() {
  const canEdit = usePermission('dashboard.edit');
  const tenantId = useAppStore((s) => s.tenantId);
  const range = useAppStore((s) => s.range);
  const granularity = useAppStore((s) => s.granularity);
  const aiEnabled = useAppStore((s) => s.aiEnabled);
  const setGranularity = useAppStore((s) => s.setGranularity);
  const setSegment = useAppStore((s) => s.setSegment);

  const applyNlq = (result: NlqResult) => {
    if (result.range) useAppStore.setState({ range: { from: result.range.from, to: result.range.to, preset: 'custom' } });
    if (result.granularity) setGranularity(result.granularity);
    if (result.segment) setSegment(result.segment);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
      <FirstRunBanner />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">Overview</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {range.from} â†’ {range.to} Â· {granularity}ly Â· workspace <span className="font-mono">{tenantId}</span>
          </p>
        </div>
        <FilterBar />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SavedViewsBar />
        <CrossFilterBar />
      </div>

      {aiEnabled ? <NlqConsole onApply={applyNlq} /> : null}

      <DashboardGrid canEdit={canEdit} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2"><InsightPanel /></div>
        <TopMovers />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ForecastPanel />
        <AnnotatedChart />
      </div>
    </div>
  );
}