import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { CohortRow, Granularity, MetricDef, MetricFormat, MetricSeries } from '@/types';
import { CHART_COLORS } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatDate, formatFull, formatMetric } from '@/lib/format';
import { Badge, ChartSkeleton, ErrorState } from './ui';

export interface TooltipItem { name?: string; value?: number | string; color?: string; dataKey?: string | number; }

export function ChartTooltip({ active, payload, label, format, granularity }: {
  active?: boolean; payload?: TooltipItem[]; label?: string | number;
  format: MetricFormat; granularity: Granularity;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-1.5 font-medium text-slate-500 dark:text-slate-400">
        {label != null ? formatDate(String(label), granularity) : ''}
      </div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="text-slate-500 dark:text-slate-400">{item.name}</span>
            <span className="tabular ml-auto font-semibold text-slate-900 dark:text-slate-100">
              {formatFull(Number(item.value ?? 0), format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const axisProps = { stroke: 'currentColor', tick: { fontSize: 11 }, tickLine: false, axisLine: false } as const;
function yTickFormatter(format: MetricFormat) { return (value: number) => formatMetric(value, format); }

export function Sparkline({ series, className }: { series: MetricSeries; className?: string }) {
  const data = series.points.slice(-40);
  const id = `spark-${series.metricId}`;
  const positive = series.delta >= 0;
  return (
    <div className={cn('h-10 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? CHART_COLORS[2] : CHART_COLORS[5]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={positive ? CHART_COLORS[2] : CHART_COLORS[5]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={positive ? CHART_COLORS[2] : CHART_COLORS[5]} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeltaBadge({ delta, higherIsBetter }: { delta: number; higherIsBetter: boolean }) {
  const isFlat = Math.abs(delta) < 0.15;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  const Icon = isFlat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge tone={isFlat ? 'neutral' : good ? 'positive' : 'critical'}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {isFlat ? 'flat' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`}
    </Badge>
  );
}

export function KpiCard({ series, metric, liveValue, liveStatus }: {
  series: MetricSeries; metric: MetricDef; liveValue?: number | null;
  liveStatus?: 'connecting' | 'open' | 'closed';
}) {
  const displayed = liveValue ?? series.total;
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{metric.label}</span>
            {liveStatus === 'open' ? (
              <span className="relative flex h-1.5 w-1.5" title="Live">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            ) : null}
          </div>
          <div className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {formatMetric(displayed, metric.format)}
          </div>
        </div>
        <DeltaBadge delta={series.delta} higherIsBetter={metric.higherIsBetter} />
      </div>
      <Sparkline series={series} className="mt-3" />
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>vs {formatMetric(series.prevTotal, metric.format)} prev.</span>
        {metric.certified ? <span title="Certified metric">âœ“ certified</span> : <span>draft</span>}
      </div>
    </div>
  );
}

export function ChartStateWrapper({ isLoading, isError, error, onRetry, height = 240, children, isEmpty, emptyLabel = 'No data in this range' }: {
  isLoading: boolean; isError: boolean; error?: unknown; onRetry?: () => void;
  height?: number; children: React.ReactNode; isEmpty?: boolean; emptyLabel?: string;
}) {
  if (isLoading) return <ChartSkeleton height={height} />;
  if (isError) return <div style={{ height }} className="flex items-center justify-center"><ErrorState title="Couldn't load this chart" description={error instanceof Error ? error.message : 'Unknown error'} onRetry={onRetry} /></div>;
  if (isEmpty) return <div style={{ height }} className="flex items-center justify-center"><p className="text-xs text-slate-400 dark:text-slate-500">{emptyLabel}</p></div>;
  return <>{children}</>;
}

export function MetricLineChart({ series, metric, height = 260, showBrush = true, showReference = true }: {
  series: MetricSeries; metric: MetricDef; height?: number; showBrush?: boolean; showReference?: boolean;
}) {
  const average = useMemo(() => {
    if (series.points.length === 0) return 0;
    return series.points.reduce((s, p) => s + p.value, 0) / series.points.length;
  }, [series.points]);
  const hasCompare = series.points.some((p) => p.compare != null);

  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series.points} margin={{ top: 4, right: 16, bottom: showBrush ? 4 : 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
          <XAxis dataKey="t" {...axisProps} tickFormatter={(v) => formatDate(String(v), series.granularity)} minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={yTickFormatter(metric.format)} width={56} />
          <Tooltip content={<ChartTooltip format={metric.format} granularity={series.granularity} />} cursor={{ stroke: CHART_COLORS[0], strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
          {showReference ? <ReferenceLine y={average} stroke={CHART_COLORS[7]} strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: 'avg', position: 'right', fontSize: 10, fill: CHART_COLORS[7] }} /> : null}
          <Line type="monotone" dataKey="value" name={metric.label} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          {hasCompare ? <Line type="monotone" dataKey="compare" name="Previous period" stroke={CHART_COLORS[4]} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls /> : null}
          {showBrush && series.points.length > 20 ? <Brush dataKey="t" height={22} travellerWidth={8} stroke={CHART_COLORS[0]} tickFormatter={(v) => formatDate(String(v), series.granularity)} className="text-slate-400" /> : null}
          <Legend verticalAlign="top" align="right" height={24} iconType="plainline" wrapperStyle={{ fontSize: 11, color: 'currentColor' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricBarChart({ series, metric, height = 260, horizontal = false }: {
  series: MetricSeries; metric: MetricDef; height?: number; horizontal?: boolean;
}) {
  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series.points} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <><XAxis type="number" {...axisProps} tickFormatter={yTickFormatter(metric.format)} /><YAxis type="category" dataKey="t" {...axisProps} width={72} tickFormatter={(v) => formatDate(String(v), series.granularity)} /></>
          ) : (
            <><XAxis dataKey="t" {...axisProps} tickFormatter={(v) => formatDate(String(v), series.granularity)} minTickGap={16} /><YAxis {...axisProps} tickFormatter={yTickFormatter(metric.format)} width={56} /></>
          )}
          <Tooltip content={<ChartTooltip format={metric.format} granularity={series.granularity} />} cursor={{ fill: 'currentColor', fillOpacity: 0.06 }} />
          <Bar dataKey="value" name={metric.label} fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MetricAreaChart({ series, metric, height = 260 }: { series: MetricSeries; metric: MetricDef; height?: number; }) {
  const id = `area-${series.metricId}`;
  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series.points} margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
          <XAxis dataKey="t" {...axisProps} tickFormatter={(v) => formatDate(String(v), series.granularity)} minTickGap={24} />
          <YAxis {...axisProps} tickFormatter={yTickFormatter(metric.format)} width={56} />
          <Tooltip content={<ChartTooltip format={metric.format} granularity={series.granularity} />} />
          <Area type="monotone" dataKey="value" name={metric.label} stroke={CHART_COLORS[0]} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface SliceDatum { name: string; value: number; }

export function MetricDonut({ data, height = 260, innerRadius = 58, outerRadius = 92, format = 'number' }: {
  data: SliceDatum[]; height?: number; innerRadius?: number; outerRadius?: number; format?: MetricFormat;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} isAnimationActive={false}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />)}
          </Pie>
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0];
            const value = Number(item.value ?? 0);
            return (
              <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                <div className="font-medium text-slate-500 dark:text-slate-400">{item.name}</div>
                <div className="tabular mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                  {formatFull(value, format)}
                  <span className="ml-1.5 font-normal text-slate-400">{total > 0 ? `${((value / total) * 100).toFixed(1)}%` : 'â€”'}</span>
                </div>
              </div>
            );
          }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ScatterDatum { x: number; y: number; z: number; name: string; }

export function MetricScatter({ data, xLabel, yLabel, height = 280, formatY = 'number' }: {
  data: ScatterDatum[]; xLabel: string; yLabel: string; height?: number; formatY?: MetricFormat;
}) {
  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 4, right: 16, bottom: 20, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
          <XAxis type="number" dataKey="x" name={xLabel} {...axisProps} label={{ value: xLabel, position: 'insideBottom', offset: -12, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yLabel} {...axisProps} tickFormatter={yTickFormatter(formatY)} width={60} />
          <ZAxis type="number" dataKey="z" range={[40, 240]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as ScatterDatum;
            return (
              <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                <div className="font-medium text-slate-800 dark:text-slate-100">{p.name}</div>
                <div className="mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                  <div>{xLabel}: <span className="tabular font-semibold text-slate-700 dark:text-slate-200">{p.x.toLocaleString()}</span></div>
                  <div>{yLabel}: <span className="tabular font-semibold text-slate-700 dark:text-slate-200">{formatFull(p.y, formatY)}</span></div>
                </div>
              </div>
            );
          }} />
          <Scatter data={data} fill={CHART_COLORS[0]} fillOpacity={0.65} isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface FunnelStage { label: string; value: number; dropoff?: number; }

export function FunnelChart({ stages, height = 300 }: { stages: FunnelStage[]; height?: number }) {
  const max = stages[0]?.value ?? 1;
  return (
    <div style={{ height }} className="flex w-full flex-col justify-center gap-1.5 px-4 py-4">
      {stages.map((stage, i) => {
        const pct = max > 0 ? (stage.value / max) * 100 : 0;
        const stepConv = i === 0 ? 100 : stages[i - 1].value > 0 ? (stage.value / stages[i - 1].value) * 100 : 0;
        return (
          <div key={stage.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">{stage.label}</span>
            <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
              <div className="flex h-full items-center justify-end rounded-md pr-2.5 transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}>
                <span className="tabular text-[11px] font-semibold text-white drop-shadow-sm">{stage.value.toLocaleString()}</span>
              </div>
            </div>
            <span className={cn('tabular w-14 shrink-0 text-right text-[11px] font-medium',
              i === 0 ? 'text-slate-400'
                : stepConv >= 60 ? 'text-emerald-600 dark:text-emerald-400'
                : stepConv >= 30 ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400')}
              title="Step conversion from previous stage">
              {i === 0 ? 'â€”' : `${stepConv.toFixed(0)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function cohortColor(pct: number): string {
  if (pct <= 0) return 'transparent';
  const stops = ['#eef2ff', '#c7d2fe', '#a5b4fc', '#6366f1', '#4338ca'];
  const idx = Math.min(stops.length - 1, Math.floor((pct / 100) * stops.length));
  return stops[Math.max(0, idx)];
}

export function CohortHeatmap({ rows }: { rows: CohortRow[] }) {
  const periods = Math.max(...rows.map((r) => r.retention.length), 1);
  return (
    <div className="overflow-x-auto p-4">
      <table className="w-full border-separate border-spacing-[3px] text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white pr-3 text-left font-medium text-slate-400 dark:bg-slate-900">Cohort</th>
            <th className="pr-3 text-right font-medium text-slate-400">Size</th>
            {Array.from({ length: periods }).map((_, i) => (
              <th key={i} className="min-w-[42px] text-center font-medium text-slate-400">M{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white pr-3 font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-300">{row.cohort}</td>
              <td className="tabular pr-3 text-right text-slate-500 dark:text-slate-400">{row.size.toLocaleString()}</td>
              {Array.from({ length: periods }).map((_, i) => {
                const pct = row.retention[i];
                if (pct == null) return <td key={i} className="h-7 rounded bg-slate-50 dark:bg-slate-900" />;
                const dark = pct > 45;
                return (
                  <td key={i} className="tabular h-7 rounded text-center font-medium transition-colors"
                    style={{ background: cohortColor(pct), color: dark ? '#fff' : '#312e81' }}
                    title={`${row.cohort} Â· month ${i} Â· ${pct}% retained`}>
                    {pct.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ForecastPoint {
  t: string;
  actual?: number | null;
  forecast?: number | null;
  lo?: number | null;
  band?: number | null;
}

export function ForecastChart({ data, metric, height = 280 }: { data: ForecastPoint[]; metric: MetricDef; height?: number; }) {
  const id = `fc-${metric.id}`;
  return (
    <div style={{ height }} className="w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[4]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_COLORS[4]} stopOpacity={0.28} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
          <XAxis dataKey="t" {...axisProps} tickFormatter={(v) => formatDate(String(v))} minTickGap={28} />
          <YAxis {...axisProps} tickFormatter={yTickFormatter(metric.format)} width={56} />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as ForecastPoint;
            return (
              <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900/95">
                <div className="mb-1 font-medium text-slate-500 dark:text-slate-400">{formatDate(String(label))}</div>
                {point.actual != null ? (
                  <div className="tabular font-semibold text-slate-900 dark:text-slate-100">Actual: {formatFull(point.actual, metric.format)}</div>
                ) : point.forecast != null ? (
                  <>
                    <div className="tabular font-semibold text-brand-600 dark:text-brand-300">Forecast: {formatFull(point.forecast, metric.format)}</div>
                    {point.lo != null && point.band != null ? (
                      <div className="tabular mt-0.5 text-slate-500 dark:text-slate-400">
                        80% CI: {formatMetric(point.lo, metric.format)} â€“ {formatMetric(point.lo + point.band, metric.format)}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          }} />
          <Area type="monotone" dataKey="lo" stackId="ci" stroke="none" fill="transparent" isAnimationActive={false} connectNulls />
          <Area type="monotone" dataKey="band" stackId="ci" stroke="none" fill={`url(#${id})`} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="actual" name="Actual" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke={CHART_COLORS[4]} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} connectNulls />
          <Legend verticalAlign="top" align="right" height={24} iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function useForecast(series: MetricSeries | undefined, horizon = 14): ForecastPoint[] {
  return useMemo(() => {
    if (!series || series.points.length < 8) return [];
    const values = series.points.map((p) => p.value);
    const half = Math.floor(values.length / 2);
    const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
    const a = mean(values.slice(0, half));
    const b = mean(values.slice(half));
    const slope = (b - a) / half;
    const m = mean(values);
    const sd = Math.sqrt(mean(values.map((v) => (v - m) ** 2)));

    const out: ForecastPoint[] = series.points.map((p) => ({ t: p.t, actual: p.value }));
    const last = series.points[series.points.length - 1];
    out[out.length - 1] = { t: last.t, actual: last.value, forecast: last.value };

    const step = series.granularity === 'day' ? 1 : series.granularity === 'week' ? 7 : 30;
    let lastTs = Date.parse(last.t + 'T00:00:00Z');

    for (let h = 1; h <= horizon; h++) {
      lastTs += step * 86_400_000;
      const forecast = last.value + slope * h;
      const spread = sd * 1.28 * Math.sqrt(h) * 0.6;
      out.push({ t: new Date(lastTs).toISOString().slice(0, 10), actual: null, forecast, lo: forecast - spread, band: spread * 2 });
    }
    return out;
  }, [series, horizon]);
}