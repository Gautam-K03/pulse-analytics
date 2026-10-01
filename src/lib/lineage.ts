import type { DataAsset } from '@/types';

function ago(mins: number) { return new Date(Date.now() - mins * 60_000).toISOString(); }

export const DATA_ASSETS: DataAsset[] = [
  {
    id: 'src_postgres', name: 'Production Postgres', kind: 'source',
    upstream: [], downstream: ['model_accounts', 'model_events'],
    rows: 4_812_004, freshnessMins: 4, qualityScore: 98, owner: 'Platform',
    checks: [
      { id: 'c1', name: 'Row count in expected band', status: 'pass', detail: 'Â±6% vs 7-day median', lastRun: ago(4) },
      { id: 'c2', name: 'No null account_id', status: 'pass', detail: '0 violations in last 1M rows', lastRun: ago(4) },
      { id: 'c3', name: 'Schema drift', status: 'pass', detail: 'Matches registered contract', lastRun: ago(64) },
    ],
  },
  {
    id: 'src_stripe', name: 'Stripe Billing', kind: 'source',
    upstream: [], downstream: ['model_subscriptions', 'metric_mrr'],
    rows: 918_233, freshnessMins: 1, qualityScore: 99, owner: 'Finance Eng',
    checks: [
      { id: 'c1', name: 'Webhook lag < 60s', status: 'pass', detail: 'p95 = 18s', lastRun: ago(1) },
      { id: 'c2', name: 'Amount reconciles with invoices', status: 'pass', detail: 'Î” = $0.00', lastRun: ago(31) },
    ],
  },
  {
    id: 'model_subscriptions', name: 'Subscriptions (model)', kind: 'model',
    upstream: ['src_stripe'], downstream: ['metric_mrr', 'metric_churn_rate', 'metric_arpu'],
    rows: 41_882, freshnessMins: 3, qualityScore: 97, owner: 'Analytics',
    checks: [
      { id: 'c1', name: 'MRR reconciles to Stripe', status: 'pass', detail: 'Î” = 0.02%', lastRun: ago(3) },
      { id: 'c2', name: 'No overlapping subscription windows', status: 'pass', detail: '0 overlaps', lastRun: ago(3) },
    ],
  },
  {
    id: 'model_events', name: 'Product events (model)', kind: 'model',
    upstream: ['src_postgres'], downstream: ['metric_active_users', 'metric_trial_conversions'],
    rows: 18_904_551, freshnessMins: 92, qualityScore: 71, owner: 'Product Eng',
    checks: [
      { id: 'c1', name: 'Event stream freshness', status: 'fail', detail: 'Last event 92m ago â€” expected < 10m', lastRun: ago(2) },
      { id: 'c2', name: 'Duplicate event_id', status: 'warn', detail: '0.4% duplicates in webhook path', lastRun: ago(2) },
      { id: 'c3', name: 'Required properties present', status: 'pass', detail: 'tenant_id, user_id present', lastRun: ago(2) },
    ],
  },
  {
    id: 'metric_mrr', name: 'MRR', kind: 'metric',
    upstream: ['model_subscriptions'], downstream: ['Overview dashboard', 'Executive digest'],
    rows: 0, freshnessMins: 3, qualityScore: 99, owner: 'Finance',
    checks: [
      { id: 'c1', name: 'Certified definition in use', status: 'pass', detail: 'Matches semantic layer v4', lastRun: ago(3) },
      { id: 'c2', name: 'Compare-period parity', status: 'pass', detail: 'Same window length', lastRun: ago(3) },
    ],
  },
  {
    id: 'dash_overview', name: 'Overview dashboard', kind: 'dashboard',
    upstream: ['metric_mrr', 'metric_active_users', 'metric_churn_rate'], downstream: [],
    rows: 0, freshnessMins: 3, qualityScore: 100, owner: 'Everyone', checks: [],
  },
];

export function assetById(id: string) { return DATA_ASSETS.find((a) => a.id === id); }