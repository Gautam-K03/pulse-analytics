import type { Alert, Granularity, MetricSeries, Paginated, SeriesPoint, TableRow, Tenant, UsageRow } from '@/types';
import { METRIC_MAP } from './metrics';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.name = 'ApiError'; this.status = status; }
}

export const TENANTS: Tenant[] = [
  { id: 'acme', name: 'Acme Corp', plan: 'scale', region: 'us-east-1' },
  { id: 'globex', name: 'Globex Industries', plan: 'growth', region: 'eu-west-1' },
  { id: 'initech', name: 'Initech', plan: 'enterprise', region: 'ap-south-1' },
];

export const control = {
  latency: [140, 420] as [number, number],
  failureRate: 0,
};

const DAY = 86_400_000;
const HISTORY_DAYS = 420;

function delay(ms?: number) {
  const [lo, hi] = control.latency;
  const wait = ms ?? lo + Math.random() * (hi - lo);
  return new Promise<void>((resolve) => setTimeout(resolve, wait));
}

function maybeFail() {
  if (Math.random() < control.failureRate) {
    throw new ApiError('Upstream data source timed out. Retry to continue.', 503);
  }
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startOfUTCDay(ts: number): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

interface GenSpec { base: number; trend: number; weekly: number; noise: number; }

const SPEC: Record<string, GenSpec> = {
  mrr: { base: 48000, trend: 0.55, weekly: 0.03, noise: 0.03 },
  expansion_revenue: { base: 8200, trend: 0.62, weekly: 0.05, noise: 0.12 },
  arpu: { base: 104, trend: 0.12, weekly: 0.01, noise: 0.04 },
  active_users: { base: 9200, trend: 0.38, weekly: 0.14, noise: 0.05 },
  trial_conversions: { base: 140, trend: 0.3, weekly: 0.22, noise: 0.16 },
  churn_rate: { base: 3.1, trend: -0.3, weekly: 0.02, noise: 0.1 },
  support_tickets: { base: 320, trend: 0.1, weekly: -0.18, noise: 0.14 },
  nps: { base: 42, trend: 0.18, weekly: 0.01, noise: 0.05 },
};

function roundFor(metricId: string, v: number): number {
  if (metricId === 'churn_rate') return Math.round(v * 100) / 100;
  if (metricId === 'arpu') return Math.round(v * 100) / 100;
  if (metricId === 'nps') return Math.round(v * 10) / 10;
  return Math.round(v);
}

const dailyCache = new Map<string, SeriesPoint[]>();

function getDaily(tenantId: string, metricId: string): SeriesPoint[] {
  const key = `${tenantId}:${metricId}`;
  const cached = dailyCache.get(key);
  if (cached) return cached;

  const spec = SPEC[metricId] ?? { base: 100, trend: 0.2, weekly: 0.05, noise: 0.1 };
  const rnd = mulberry32(hash(key));
  const tenantFactor = 0.55 + (hash(tenantId) % 130) / 100;
  const startValue = spec.base * tenantFactor;
  const today = startOfUTCDay(Date.now());
  const out: SeriesPoint[] = [];
  let level = startValue;

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const ts = today - i * DAY;
    const dow = new Date(ts).getUTCDay();
    const progress = (HISTORY_DAYS - i) / HISTORY_DAYS;
    const target = startValue * (1 + spec.trend * progress);
    level += (target - level) * 0.06;
    const weekend = dow === 0 || dow === 6 ? -spec.weekly : spec.weekly * 0.6;
    const noise = 1 + (rnd() - 0.5) * 2 * spec.noise;
    const value = Math.max(0, level * (1 + weekend) * noise);
    out.push({ t: new Date(ts).toISOString().slice(0, 10), value: roundFor(metricId, value) });
  }

  dailyCache.set(key, out);
  return out;
}

export function latestValue(tenantId: string, metricId: string): number {
  const series = getDaily(tenantId, metricId);
  return series[series.length - 1]?.value ?? 0;
}

function bucketKey(dateIso: string, granularity: Granularity): string {
  if (granularity === 'day') return dateIso;
  const d = new Date(dateIso + 'T00:00:00Z');
  if (granularity === 'week') {
    const diff = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  }
  d.setUTCDate(1);
  return d.toISOString().slice(0, 10);
}

function aggregate(points: SeriesPoint[], granularity: Granularity, agg: 'sum' | 'avg' | 'last'): SeriesPoint[] {
  if (granularity === 'day' || points.length === 0) return points;
  const buckets = new Map<string, number[]>();
  for (const p of points) {
    const k = bucketKey(p.t, granularity);
    const arr = buckets.get(k);
    if (arr) arr.push(p.value); else buckets.set(k, [p.value]);
  }
  return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([t, values]) => {
    let value: number;
    if (agg === 'sum') value = values.reduce((s, v) => s + v, 0);
    else if (agg === 'avg') value = values.reduce((s, v) => s + v, 0) / values.length;
    else value = values[values.length - 1];
    return { t, value };
  });
}

function reducePoints(points: SeriesPoint[], agg: 'sum' | 'avg' | 'last'): number {
  if (points.length === 0) return 0;
  if (agg === 'sum') return points.reduce((s, p) => s + p.value, 0);
  if (agg === 'avg') return points.reduce((s, p) => s + p.value, 0) / points.length;
  return points[points.length - 1].value;
}

export interface SeriesQuery {
  tenantId: string; metricId: string; from: string; to: string;
  granularity: Granularity; segment?: string; compare?: boolean;
}

export async function fetchMetricSeries(q: SeriesQuery): Promise<MetricSeries> {
  await delay();
  maybeFail();

  const def = METRIC_MAP[q.metricId];
  if (!def) throw new ApiError(`Unknown metric "${q.metricId}"`, 404);

  const from = Date.parse(q.from + 'T00:00:00Z');
  const to = Date.parse(q.to + 'T00:00:00Z');
  if (Number.isNaN(from) || Number.isNaN(to) || from > to) throw new ApiError('Invalid date range supplied.', 400);

  const segmentFactor = !q.segment || q.segment === 'all' ? 1 : 0.18 + (hash(q.segment) % 55) / 100;

  const all = getDaily(q.tenantId, q.metricId).map((p) => ({
    t: p.t,
    value: roundFor(q.metricId, p.value * segmentFactor),
  }));

  const span = to - from + DAY;

  const inRange = all.filter((p) => {
    const t = Date.parse(p.t + 'T00:00:00Z');
    return t >= from && t <= to;
  });

  const points = aggregate(inRange, q.granularity, def.aggregation);
  const total = reducePoints(points, def.aggregation);

  const prevSlice = all.filter((p) => {
    const t = Date.parse(p.t + 'T00:00:00Z');
    return t >= from - span && t < from;
  });
  const prevPoints = aggregate(prevSlice, q.granularity, def.aggregation);
  const prevTotal = reducePoints(prevPoints, def.aggregation);
  const delta = prevTotal === 0 ? 0 : ((total - prevTotal) / prevTotal) * 100;

  const offset = prevPoints.length - points.length;
  const withCompare: SeriesPoint[] = points.map((p, i) => ({
    ...p,
    compare: q.compare ? prevPoints[i + offset]?.value ?? null : null,
  }));

  return {
    metricId: q.metricId,
    tenantId: q.tenantId,
    granularity: q.granularity,
    points: withCompare,
    total,
    prevTotal,
    delta,
    freshness: new Date(Date.now() - 4 * 60_000).toISOString(),
  };
}

export interface CustomerQuery {
  tenantId: string; page?: number; pageSize?: number; q?: string;
  region?: string; plan?: string; sort?: keyof TableRow; dir?: 'asc' | 'desc';
}

const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'];
const PLANS = ['Free', 'Growth', 'Scale', 'Enterprise'];
const FIRST = ['Nimbus','Vertex','Lumen','Orbit','Kestrel','Harbor','Atlas','Juniper','Pioneer','Quanta','Cobalt','Meridian','Solstice','Aurora','Beacon','Cascade','Drift','Ember','Fathom','Granite'];
const LAST = ['Labs','Systems','Group','Digital','Works','Analytics','Cloud','Health','Retail','Media'];
const PLAN_MRR: Record<string, number> = { Free: 0, Growth: 380, Scale: 1400, Enterprise: 4200 };

const customerCache = new Map<string, TableRow[]>();

function getCustomers(tenantId: string): TableRow[] {
  const cached = customerCache.get(tenantId);
  if (cached) return cached;

  const rnd = mulberry32(hash(tenantId + ':customers'));
  const rows: TableRow[] = [];

  for (let i = 0; i < 640; i++) {
    const name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    const plan = PLANS[Math.floor(rnd() * PLANS.length)];
    const seats = 3 + Math.floor(rnd() * 180);
    const mrr = Math.round(PLAN_MRR[plan] * (0.6 + rnd() * 1.4));
    const health = Math.round(35 + rnd() * 65);
    rows.push({
      id: `cus_${hash(tenantId + ':' + i).toString(36).slice(0, 8)}`,
      name, region: REGIONS[Math.floor(rnd() * REGIONS.length)], plan, mrr, seats, health,
      churnRisk: health > 75 ? 'low' : health > 50 ? 'medium' : 'high',
      lastActive: new Date(Date.now() - Math.floor(rnd() * 30) * DAY).toISOString(),
    });
  }

  customerCache.set(tenantId, rows);
  return rows;
}

export async function fetchCustomers(q: CustomerQuery): Promise<Paginated<TableRow>> {
  await delay(120);
  maybeFail();

  const page = Math.max(1, q.page ?? 1);
  const pageSize = q.pageSize ?? 25;
  let rows = getCustomers(q.tenantId);

  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle));
  }
  if (q.region && q.region !== 'all') rows = rows.filter((r) => r.region === q.region);
  if (q.plan && q.plan !== 'all') rows = rows.filter((r) => r.plan === q.plan);

  if (q.sort) {
    const key = q.sort;
    const dir = q.dir === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page, pageSize, total };
}

export async function fetchAlerts(tenantId: string): Promise<Alert[]> {
  await delay(160);
  maybeFail();

  const rnd = mulberry32(hash(tenantId + ':alerts'));
  const defs: Array<Omit<Alert, 'id' | 'triggeredAt' | 'value'>> = [
    { title: 'Churn rate breached 4% for 3 consecutive days', severity: 'critical', metricId: 'churn_rate', status: 'firing', threshold: 4, channel: 'Email + Slack', note: 'Concentrated in the SMB self-serve cohort.' },
    { title: 'Trial conversions down 22% week over week', severity: 'warning', metricId: 'trial_conversions', status: 'firing', threshold: 110, channel: 'Email', note: 'Anomaly detected against the 8-week seasonal baseline.' },
    { title: 'MRR growth accelerated past forecast', severity: 'info', metricId: 'mrr', status: 'resolved', threshold: 60000, channel: 'In-app', note: 'Driven by expansion revenue in EMEA.' },
    { title: 'Support ticket volume spiking', severity: 'warning', metricId: 'support_tickets', status: 'snoozed', threshold: 400, channel: 'Slack', note: 'Snoozed for 24h by an admin.' },
  ];

  const base = Date.now();
  return defs.map((d, i) => ({
    ...d,
    id: `alt_${i}_${hash(tenantId + i).toString(36).slice(0, 6)}`,
    value: roundFor(d.metricId, latestValue(tenantId, d.metricId)),
    triggeredAt: new Date(base - (i + 1) * 3.5 * 3600_000 - rnd() * 3600_000).toISOString(),
  }));
}

export async function fetchUsage(tenantId: string): Promise<UsageRow[]> {
  await delay(140);
  maybeFail();

  const seed = hash(tenantId);
  const scale = 0.4 + (seed % 90) / 100;

  return [
    { id: 'rows', label: 'Rows scanned', used: Math.round(4_200_000 * scale), quota: 10_000_000, unit: 'rows' },
    { id: 'ai', label: 'AI queries', used: Math.round(820 * scale), quota: 2000, unit: 'queries' },
    { id: 'seats', label: 'Seats', used: 6 + (seed % 40), quota: 50, unit: 'seats' },
    { id: 'exports', label: 'Exports', used: Math.round(140 * scale), quota: 500, unit: 'exports' },
    { id: 'storage', label: 'Storage', used: Math.round(18 * scale * 10) / 10, quota: 100, unit: 'GB' },
  ];
}

export async function fetchApiKeys(tenantId: string) {
  await delay(120);
  return [
    { id: 'key_live', label: 'Production ingest', prefix: `pk_live_${tenantId.slice(0, 4)}`, scopes: ['metrics:read', 'ingest:write'], lastUsed: new Date(Date.now() - 42 * 60_000).toISOString() },
    { id: 'key_bi', label: 'BI warehouse sync', prefix: `pk_ro_${tenantId.slice(0, 4)}`, scopes: ['metrics:read'], lastUsed: new Date(Date.now() - 26 * 3600_000).toISOString() },
  ];
}