import { Filter, Layers, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { NlqConsole } from '@/components/NlqConsole';
import { SavedViewsBar, CrossFilterBar } from '@/components/SavedViews';
import { useAppStore, useCrossFilterStore } from '@/store';
import { useMetricSeries } from '@/hooks';
import { buildCohorts } from '@/lib/cohort';
import { METRIC_MAP } from '@/lib/metrics';
import { fetchCustomers } from '@/lib/mockApi';
import { ChartStateWrapper, CohortHeatmap, FunnelChart, MetricAreaChart, MetricDonut, MetricScatter, type ScatterDatum } from '@/components/charts';
import { Card, CardHeader } from '@/components/ui';
import type { NlqResult } from '@/types';

function FunnelPanel() {
  const tenantId = useAppStore((s) => s.tenantId);
  const stages = [
    { label: 'Visited pricing', value: 48200 },
    { label: 'Started trial', value: 12840 },
    { label: 'Activated', value: 7920 },
    { label: 'Added payment', value: 3410 },
    { label: 'Converted', value: 1980 },
  ];
  const factor = 0.7 + (tenantId.length % 5) / 10;
  return (
    <Card>
      <CardHeader title="Trial conversion funnel" subtitle="Click a stage to cross-filter the dashboard" action={<Filter className="h-3.5 w-3.5 text-slate-400" />} />
      <FunnelChart stages={stages.map((s) => ({ ...s, value: Math.round(s.value * factor) }))} />
    </Card>
  );
}

function CohortPanel() {
  const tenantId = useAppStore((s) => s.tenantId);
  const rows = buildCohorts(tenantId);
  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Retention cohorts" subtitle="Monthly acquisition cohorts Â· % of original users still active" action={<Layers className="h-3.5 w-3.5 text-slate-400" />} />
      <CohortHeatmap rows={rows} />
    </Card>
  );
}

function DonutPanel() {
  const tenantId = useAppStore((s) => s.tenantId);
  const setFilter = useCrossFilterStore((s) => s.setFilter);
  const { data } = useQuery({ queryKey: ['customers-donut', tenantId], queryFn: () => fetchCustomers({ tenantId, page: 1, pageSize: 500 }) });

  const byPlan = (data?.rows ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.plan] = (acc[r.plan] ?? 0) + r.mrr; return acc; }, {});
  const slices = Object.entries(byPlan).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  return (
    <Card>
      <CardHeader title="MRR by plan" subtitle="Click a slice to cross-filter" />
      {slices.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-xs text-slate-400">No data</div>
      ) : (
        <MetricDonut data={slices} format="currency" />
      )}
      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        {slices.map((s) => (
          <button key={s.name} type="button" onClick={() => setFilter({ metricId: 'mrr', bucket: s.name, label: 'Plan' })}
            className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-500 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:text-brand-300">
            {s.name} Â· ${Math.round(s.value).toLocaleString()}
          </button>
        ))}
      </div>
    </Card>
  );
}

function ScatterPanel() {
  const tenantId = useAppStore((s) => s.tenantId);
  const { data } = useQuery({ queryKey: ['customers-scatter', tenantId], queryFn: () => fetchCustomers({ tenantId, page: 1, pageSize: 300 }) });
  const points: ScatterDatum[] = (data?.rows ?? []).map((r) => ({ x: r.seats, y: r.mrr, z: r.health, name: r.name }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader title="Seats vs MRR" subtitle="Bubble size = account health Â· spot accounts with high seats but low spend" action={<TrendingUp className="h-3.5 w-3.5 text-slate-400" />} />
      <ChartStateWrapper isLoading={!data} isError={false} height={300} isEmpty={points.length === 0}>
        <MetricScatter data={points} xLabel="Seats" yLabel="MRR" height={300} formatY="currency" />
      </ChartStateWrapper>
    </Card>
  );
}

function AreaPanel() {
  const query = useMetricSeries('expansion_revenue');
  const metric = METRIC_MAP.expansion_revenue;
  return (
    <Card>
      <CardHeader title="Expansion revenue" subtitle="Net new recurring revenue from upsells" />
      <ChartStateWrapper isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()}
        isEmpty={!!query.data && query.data.points.length === 0} height={260}>
        {query.data ? <MetricAreaChart series={query.data} metric={metric} height={260} /> : null}
      </ChartStateWrapper>
    </Card>
  );
}

export default function QueryPage() {
  const setSegment = useAppStore((s) => s.setSegment);
  const setGranularity = useAppStore((s) => s.setGranularity);

  const applyNlq = (result: NlqResult) => {
    if (result.range) useAppStore.setState({ range: { from: result.range.from, to: result.range.to, preset: 'custom' } });
    if (result.granularity) setGranularity(result.granularity);
    if (result.segment) setSegment(result.segment);
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Query workspace</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Natural-language querying, funnels, cohorts and cross-filtering. Every AI translation is validated against the tenant-scoped semantic layer and written to the AI audit log.
        </p>
      </div>

      <NlqConsole onApply={applyNlq} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SavedViewsBar />
        <CrossFilterBar />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FunnelPanel />
        <DonutPanel />
        <AreaPanel />
        <CohortPanel />
        <ScatterPanel />
      </div>
    </div>
  );
}