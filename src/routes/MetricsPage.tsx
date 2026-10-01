import { CheckCircle2, CircleDashed } from 'lucide-react';
import { CATEGORY_LABEL, METRICS } from '@/lib/metrics';
import { useMetricSeries } from '@/hooks';
import { formatMetric } from '@/lib/format';
import { Badge, Card, CardHeader, Skeleton } from '@/components/ui';
import { DeltaBadge } from '@/components/charts';

function MetricRow({ metricId }: { metricId: string }) {
  const metric = METRICS.find((m) => m.id === metricId)!;
  const query = useMetricSeries(metricId);

  return (
    <div className="grid grid-cols-12 items-center gap-3 px-5 py-3">
      <div className="col-span-12 sm:col-span-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{metric.id}</span>
          {metric.certified ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Certified" />
            : <CircleDashed className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" aria-label="Draft" />}
        </div>
        <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{metric.label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{metric.description}</p>
      </div>
      <div className="col-span-4 sm:col-span-2"><Badge tone="neutral">{CATEGORY_LABEL[metric.category]}</Badge></div>
      <div className="col-span-4 sm:col-span-2"><Badge tone="neutral">{metric.aggregation}</Badge></div>
      <div className="tabular col-span-4 text-right text-sm font-semibold text-slate-800 sm:col-span-1 dark:text-slate-100">
        {query.isLoading ? <Skeleton className="ml-auto h-4 w-16" /> : query.data ? formatMetric(query.data.total, metric.format) : 'â€”'}
      </div>
      <div className="col-span-12 flex justify-end sm:col-span-2">
        {query.data ? <DeltaBadge delta={query.data.delta} higherIsBetter={metric.higherIsBetter} /> : null}
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const categories = [...new Set(METRICS.map((m) => m.category))];
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Metric catalog</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          The semantic layer. Charts and AI answers both resolve through these definitions, so a number means the same thing everywhere.
        </p>
      </div>
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader title={CATEGORY_LABEL[category]} subtitle={`${METRICS.filter((m) => m.category === category).length} metrics`} />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {METRICS.filter((m) => m.category === category).map((metric) => <MetricRow key={metric.id} metricId={metric.id} />)}
          </div>
        </Card>
      ))}
    </div>
  );
}