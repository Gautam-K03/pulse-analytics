import type { MetricDef } from '@/types';

export const METRICS: MetricDef[] = [
  { id: 'mrr', label: 'MRR', description: 'Monthly recurring revenue normalised to a 30-day period.', format: 'currency', aggregation: 'last', higherIsBetter: true, category: 'revenue', owner: 'Finance', certified: true },
  { id: 'expansion_revenue', label: 'Expansion Revenue', description: 'Net new recurring revenue from upsells and seat growth.', format: 'currency', aggregation: 'sum', higherIsBetter: true, category: 'revenue', owner: 'Finance', certified: true },
  { id: 'arpu', label: 'ARPU', description: 'Average revenue per active account.', format: 'currency', aggregation: 'avg', higherIsBetter: true, category: 'revenue', owner: 'Finance', certified: true },
  { id: 'active_users', label: 'Active Users', description: 'Daily active users across all workspaces.', format: 'number', aggregation: 'avg', higherIsBetter: true, category: 'product', owner: 'Product', certified: true },
  { id: 'trial_conversions', label: 'Trial Conversions', description: 'Trials converted to a paid plan.', format: 'number', aggregation: 'sum', higherIsBetter: true, category: 'growth', owner: 'Growth', certified: true },
  { id: 'churn_rate', label: 'Churn Rate', description: 'Logo churn rate for the period.', format: 'percent', aggregation: 'avg', higherIsBetter: false, category: 'growth', owner: 'Growth', certified: true },
  { id: 'support_tickets', label: 'Support Tickets', description: 'Inbound tickets created across all channels.', format: 'number', aggregation: 'sum', higherIsBetter: false, category: 'support', owner: 'Support', certified: false },
  { id: 'nps', label: 'NPS', description: 'Net promoter score from the rolling 30-day survey window.', format: 'number', aggregation: 'avg', higherIsBetter: true, category: 'support', owner: 'Support', certified: false },
];

export const METRIC_MAP: Record<string, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.id, m]));

export const DIMENSIONS = [
  { id: 'all', label: 'All segments' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'mid-market', label: 'Mid-market' },
  { id: 'smb', label: 'SMB' },
  { id: 'self-serve', label: 'Self-serve' },
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  revenue: 'Revenue',
  product: 'Product',
  growth: 'Growth',
  support: 'Support',
};