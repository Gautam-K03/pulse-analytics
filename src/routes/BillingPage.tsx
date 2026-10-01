import { useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { TENANTS } from '@/lib/mockApi';
import { useUsage } from '@/hooks';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, CardHeader, ProgressBar } from '@/components/ui';
import { useAppStore } from '@/store';
import type { FeatureFlag, Invoice } from '@/types';

const FLAGS: FeatureFlag[] = [
  { id: 'ai.nlq', label: 'Natural language querying', description: 'Ask questions in plain English', enabled: true, tier: 'growth', rollout: 100 },
  { id: 'ai.forecast', label: 'Forecasting with CI', description: 'Projections with confidence intervals', enabled: true, tier: 'scale', rollout: 100 },
  { id: 'ai.rootcause', label: 'Root-cause analysis', description: 'Recommended actions for anomalies', enabled: false, tier: 'scale', rollout: 25 },
  { id: 'dash.embed', label: 'Public embed links', description: 'Share read-only dashboards externally', enabled: true, tier: 'growth', rollout: 100 },
  { id: 'dash.annotations', label: 'Chart annotations', description: 'Mark releases and incidents on charts', enabled: true, tier: 'growth', rollout: 100 },
  { id: 'report.scheduled', label: 'Scheduled reports', description: 'PDF/CSV/XLSX on a cadence', enabled: true, tier: 'growth', rollout: 100 },
  { id: 'sec.columnauth', label: 'Column-level security', description: 'Hide sensitive metrics per role', enabled: false, tier: 'enterprise', rollout: 60 },
  { id: 'sec.saml', label: 'SAML SSO', description: 'Enterprise identity provider', enabled: false, tier: 'enterprise', rollout: 10 },
];

const TIER_ORDER = ['free', 'growth', 'scale', 'enterprise'] as const;

const INVOICES: Invoice[] = [
  { id: 'in_2409', period: 'Sep 2026', amount: 1490, status: 'paid', issuedAt: new Date(Date.now() - 12 * 86_400_000).toISOString() },
  { id: 'in_2408', period: 'Aug 2026', amount: 1490, status: 'paid', issuedAt: new Date(Date.now() - 42 * 86_400_000).toISOString() },
  { id: 'in_2407', period: 'Jul 2026', amount: 1290, status: 'paid', issuedAt: new Date(Date.now() - 72 * 86_400_000).toISOString() },
];

const PLAN_PRICE: Record<(typeof TIER_ORDER)[number], number> = { free: 0, growth: 490, scale: 1490, enterprise: 4900 };

export default function BillingPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const role = useAppStore((s) => s.role);
  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];
  const usage = useUsage();
  const canManage = role === 'owner' || role === 'admin';

  const [flags, setFlags] = useState(FLAGS);
  const tenantTierIndex = TIER_ORDER.indexOf(tenant.plan);

  const toggleFlag = (id: string) => setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  const isEntitled = (tier: FeatureFlag['tier']) => TIER_ORDER.indexOf(tier) <= tenantTierIndex;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Billing & entitlements</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Plan, usage metering, invoices and feature flags â€” with per-tenant AI cost caps.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-50">{tenant.plan} plan</h2>
                <Badge tone="brand">current</Badge>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular text-slate-900 dark:text-slate-50">
                ${PLAN_PRICE[tenant.plan].toLocaleString()}<span className="text-sm font-normal text-slate-400"> / month</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Renews on {new Date(Date.now() + 18 * 86_400_000).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="sm" disabled={!canManage}>Change plan</Button>
              <Button variant="secondary" size="sm" disabled={!canManage}><CreditCard className="h-3.5 w-3.5" /> Payment method</Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
            {usage.isLoading ? null : (usage.data ?? []).map((row) => {
              const pct = row.quota > 0 ? (row.used / row.quota) * 100 : 0;
              const tone = pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'brand';
              return (
                <div key={row.id}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
                    <span className="tabular text-[11px] text-slate-500 dark:text-slate-400">{formatNumber(row.used)} / {formatNumber(row.quota)}</span>
                  </div>
                  <ProgressBar value={row.used} max={row.quota} tone={tone} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="AI cost guardrails" subtitle="Per-tenant caps keep margins safe" />
          <div className="space-y-3 p-5">
            {[
              { label: 'Monthly AI budget', value: '$400' },
              { label: 'Overage behaviour', value: 'Degrade gracefully' },
              { label: 'Alert at', value: '80% of budget' },
              { label: 'Cost per query (avg)', value: '$0.0021' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{row.value}</span>
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-slate-400">
              When the cap is hit, NL querying returns a graceful degradation state â€” charts and raw data remain fully available.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Feature flags & entitlements" subtitle="Rollout percentage is applied per tenant. Flags below your plan tier are locked." />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {flags.map((flag) => {
            const entitled = isEntitled(flag.tier);
            return (
              <div key={flag.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', entitled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500')}>{flag.label}</span>
                    <Badge tone={entitled ? 'brand' : 'neutral'}>{flag.tier}</Badge>
                    <span className="font-mono text-[10px] text-slate-400">{flag.id}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{flag.description} Â· {flag.rollout}% rollout</p>
                </div>
                <button type="button" role="switch" aria-checked={flag.enabled && entitled} aria-label={flag.label}
                  disabled={!entitled || !canManage} onClick={() => toggleFlag(flag.id)}
                  className={cn('h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    flag.enabled && entitled ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700')}>
                  <span className={cn('block h-4 w-4 rounded-full bg-white transition-transform', flag.enabled && entitled && 'translate-x-4')} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Invoices" subtitle="Powered by Stripe in production" />
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60">
            <tr>
              <th className="px-5 py-2.5 font-medium text-slate-500 dark:text-slate-400">Invoice</th>
              <th className="px-5 py-2.5 font-medium text-slate-500 dark:text-slate-400">Period</th>
              <th className="px-5 py-2.5 font-medium text-slate-500 dark:text-slate-400">Amount</th>
              <th className="px-5 py-2.5 font-medium text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {INVOICES.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-5 py-3 font-mono text-slate-600 dark:text-slate-300">{inv.id}</td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{inv.period}</td>
                <td className="tabular px-5 py-3 font-semibold text-slate-800 dark:text-slate-100">${inv.amount.toLocaleString()}</td>
                <td className="px-5 py-3"><Badge tone={inv.status === 'paid' ? 'positive' : inv.status === 'open' ? 'warning' : 'critical'}>{inv.status}</Badge></td>
                <td className="px-5 py-3 text-right"><Button variant="ghost" size="sm"><Download className="h-3.5 w-3.5" /> PDF</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}