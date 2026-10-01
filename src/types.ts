export type Role = 'owner' | 'admin' | 'editor' | 'viewer';
export type Granularity = 'day' | 'week' | 'month';
export type Aggregation = 'sum' | 'avg' | 'last';
export type MetricFormat = 'currency' | 'number' | 'percent' | 'duration';
export type MetricCategory = 'revenue' | 'product' | 'growth' | 'support';

export interface Tenant {
  id: string;
  name: string;
  plan: 'free' | 'growth' | 'scale' | 'enterprise';
  region: string;
}

export interface MetricDef {
  id: string;
  label: string;
  description: string;
  format: MetricFormat;
  aggregation: Aggregation;
  higherIsBetter: boolean;
  category: MetricCategory;
  owner: string;
  certified: boolean;
}

export interface SeriesPoint {
  t: string;
  value: number;
  compare?: number | null;
}

export interface MetricSeries {
  metricId: string;
  tenantId: string;
  granularity: Granularity;
  points: SeriesPoint[];
  total: number;
  prevTotal: number;
  delta: number;
  freshness: string;
}

export interface TableRow {
  id: string;
  name: string;
  region: string;
  plan: string;
  mrr: number;
  seats: number;
  health: number;
  churnRisk: 'low' | 'medium' | 'high';
  lastActive: string;
}

export interface Paginated<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  title: string;
  severity: AlertSeverity;
  metricId: string;
  status: 'firing' | 'resolved' | 'snoozed';
  triggeredAt: string;
  value: number;
  threshold: number;
  channel: string;
  note: string;
}

export interface UsageRow {
  id: string;
  label: string;
  used: number;
  quota: number;
  unit: string;
}

export type WidgetType = 'kpi' | 'line' | 'bar' | 'table';

export interface Widget {
  id: string;
  type: WidgetType;
  metricId: string;
  span: 1 | 2 | 3 | 4;
}

export interface Insight {
  id: string;
  metricId: string;
  headline: string;
  body: string;
  confidence: number;
  sources: string[];
  kind: 'trend' | 'anomaly' | 'forecast' | 'summary';
}

export interface Annotation {
  id: string;
  tenantId: string;
  metricId: string;
  date: string;
  label: string;
  color: string;
  author: string;
  createdAt: string;
}

export interface SavedView {
  id: string;
  tenantId: string;
  name: string;
  range: { from: string; to: string; preset: string };
  granularity: Granularity;
  segment: string;
  compare: boolean;
  pinned: boolean;
  createdAt: string;
}

export interface CrossFilter {
  metricId: string;
  bucket: string;
  label: string;
}

export type NlqStatus = 'ok' | 'blocked' | 'low_confidence' | 'rate_limited' | 'error';

export interface NlqResult {
  id: string;
  text: string;
  status: NlqStatus;
  metricId?: string;
  segment?: string;
  granularity?: Granularity;
  range?: { from: string; to: string };
  confidence: number;
  explanation: string;
  blockedReason?: string;
  latencyMs: number;
  createdAt: string;
}

export type AuditKind = 'user' | 'ai' | 'system';
export type AuditOutcome = 'success' | 'failure' | 'blocked';

export interface AuditEvent {
  id: string;
  tenantId: string;
  ts: string;
  kind: AuditKind;
  actor: string;
  actorRole: Role;
  action: string;
  target: string;
  outcome: AuditOutcome;
  ip: string;
  meta?: Record<string, unknown>;
}

export type ReportFormat = 'pdf' | 'csv' | 'xlsx';
export type ReportCadence = 'daily' | 'weekly' | 'monthly';

export interface ScheduledReport {
  id: string;
  tenantId: string;
  name: string;
  format: ReportFormat;
  cadence: ReportCadence;
  recipients: string[];
  nextRun: string;
  lastRun: string | null;
  status: 'active' | 'paused' | 'failed';
  dashboardId: string;
}

export interface QualityCheck {
  id: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  lastRun: string;
}

export interface DataAsset {
  id: string;
  name: string;
  kind: 'source' | 'model' | 'metric' | 'dashboard';
  upstream: string[];
  downstream: string[];
  rows: number;
  freshnessMins: number;
  qualityScore: number;
  owner: string;
  checks: QualityCheck[];
}

export interface CohortRow {
  cohort: string;
  size: number;
  retention: number[];
}

export interface FeatureFlag {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  tier: 'free' | 'growth' | 'scale' | 'enterprise';
  rollout: number;
}

export interface Invoice {
  id: string;
  period: string;
  amount: number;
  status: 'paid' | 'open' | 'failed';
  issuedAt: string;
}

export interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited' | 'suspended';
  lastSeen: string | null;
  mfa: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}