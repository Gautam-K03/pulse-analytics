import type { Insight, MetricSeries } from '@/types';
import { METRIC_MAP } from './metrics';

function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

export function buildInsights(series: MetricSeries, aiAvailable: boolean): Insight[] {
  if (!aiAvailable || series.points.length < 6) return [];

  const def = METRIC_MAP[series.metricId];
  const values = series.points.map((p) => p.value);
  const recent = values.slice(-Math.max(3, Math.floor(values.length / 4)));
  const baseline = values.slice(0, -recent.length);

  const insights: Insight[] = [];
  const direction = series.delta >= 0 ? 'up' : 'down';
  const good = def.higherIsBetter ? series.delta >= 0 : series.delta <= 0;
  const fmt = (v: number) =>
    def.format === 'currency'
      ? `$${Math.round(v).toLocaleString('en-US')}`
      : `${v.toFixed(def.format === 'percent' ? 2 : 1)}${def.format === 'percent' ? '%' : ''}`;

  insights.push({
    id: `${series.metricId}-trend`,
    metricId: series.metricId,
    kind: 'trend',
    headline: `${def.label} is ${direction} ${Math.abs(series.delta).toFixed(1)}% versus the previous period`,
    body:
      `The period closed at ${fmt(series.total)} against ${fmt(series.prevTotal)} previously. ` +
      `That direction is ${good ? 'favourable' : 'unfavourable'} given ${def.label} is a metric where ` +
      `${def.higherIsBetter ? 'higher' : 'lower'} is better.`,
    confidence: Math.min(0.94, 0.62 + Math.min(values.length, 40) / 200),
    sources: [def.id, 'period_comparison'],
  });

  if (baseline.length >= 5) {
    const m = mean(baseline);
    const sd = stdev(baseline);
    if (sd > 0) {
      const last = values[values.length - 1];
      const z = (last - m) / sd;
      if (Math.abs(z) >= 1.8) {
        insights.push({
          id: `${series.metricId}-anomaly`,
          metricId: series.metricId,
          kind: 'anomaly',
          headline: `Anomaly detected â€” latest ${def.label} is ${Math.abs(z).toFixed(1)}Ïƒ from baseline`,
          body:
            `The most recent reading of ${fmt(last)} sits outside the expected range ` +
            `(${fmt(m)} Â± ${fmt(sd)}). Verify there was no ingestion gap or duplicate event before acting on it.`,
          confidence: Math.min(0.97, 0.55 + Math.abs(z) / 8),
          sources: [def.id, 'zscore_baseline'],
        });
      }
    }
  }

  if (values.length >= 8) {
    const half = Math.floor(values.length / 2);
    const a = mean(values.slice(0, half));
    const b = mean(values.slice(half));
    const slope = (b - a) / half;
    const projected = values[values.length - 1] + slope * Math.min(14, half);
    insights.push({
      id: `${series.metricId}-forecast`,
      metricId: series.metricId,
      kind: 'forecast',
      headline: `Projected ${def.label} in ${Math.min(14, half)} buckets: ${fmt(projected)}`,
      body:
        'Linear extrapolation of the recent slope. Treat as directional only â€” it does not ' +
        'model seasonality or step changes, and the confidence interval widens quickly beyond two weeks.',
      confidence: 0.48,
      sources: [def.id, 'linear_projection'],
    });
  }

  return insights;
}