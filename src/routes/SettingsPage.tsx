import { useState } from 'react';
import { Copy, Key, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react';
import { useApiKeys, useUsage } from '@/hooks';
import { TENANTS } from '@/lib/mockApi';
import { ROLE_LABEL, ROLES } from '@/lib/rbac';
import { relativeTime } from '@/lib/format';
import { useAppStore } from '@/store';
import { Badge, Button, Card, CardHeader, ProgressBar, Select, Skeleton } from '@/components/ui';

function UsageCard() {
  const query = useUsage();
  return (
    <Card>
      <CardHeader title="Usage & quotas" subtitle="Metering drives plan limits and per-tenant AI cost caps" />
      <div className="space-y-4 p-5">
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
          : (query.data ?? []).map((row) => {
              const pct = row.quota > 0 ? (row.used / row.quota) * 100 : 0;
              const tone = pct > 90 ? 'critical' : pct > 70 ? 'warning' : 'brand';
              return (
                <div key={row.id}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
                    <span className="tabular text-[11px] text-slate-500 dark:text-slate-400">{row.used.toLocaleString()} / {row.quota.toLocaleString()} {row.unit}</span>
                  </div>
                  <ProgressBar value={row.used} max={row.quota} tone={tone} />
                </div>
              );
            })}
      </div>
    </Card>
  );
}

function ApiKeysCard() {
  const query = useApiKeys();
  const [revealed, setRevealed] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="API keys" subtitle="Scoped keys with rate limits â€” never scoped across tenants"
        action={<Button size="sm" variant="secondary"><Key className="h-3.5 w-3.5" /> New key</Button>} />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {query.isLoading ? (
          <div className="space-y-2 p-5"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        ) : (
          (query.data ?? []).map((key) => (
            <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{key.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  {revealed === key.id ? `${key.prefix}_9f2a71c4e8d3` : `${key.prefix}â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢`}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <span key={scope} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">{scope}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">used {relativeTime(key.lastUsed)}</span>
                <Button size="sm" variant="ghost" onClick={() => setRevealed(revealed === key.id ? null : key.id)}>
                  <Copy className="h-3.5 w-3.5" /> {revealed === key.id ? 'Hide' : 'Reveal'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const aiEnabled = useAppStore((s) => s.aiEnabled);
  const setAiEnabled = useAppStore((s) => s.setAiEnabled);

  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Workspace <span className="font-mono">{tenant.id}</span> Â· {tenant.plan} plan Â· {tenant.region}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="Workspace" subtitle="Org name, region and residency controls" />
          <div className="space-y-4 p-5">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="org-name">Organization name</label>
              <input id="org-name" defaultValue={tenant.name}
                className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Data residency</span>
              <Select className="mt-1.5 h-9 w-full" defaultValue={tenant.region} aria-label="Data residency">
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="ap-south-1">ap-south-1 (Mumbai)</option>
              </Select>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Retention</span>
              <Select className="mt-1.5 h-9 w-full" defaultValue="24" aria-label="Retention period">
                <option value="3">3 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="0">Indefinite</option>
              </Select>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Appearance & preferences" subtitle="Client-side demo controls" />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Theme</p>
                  <p className="text-[11px] text-slate-400">Light or dark, respects system default</p>
                </div>
                <Select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')} aria-label="Theme">
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200"><Sparkles className="h-3 w-3" /> AI insights</p>
                  <p className="text-[11px] text-slate-400">Heuristic summaries in this build</p>
                </div>
                <Button size="sm" variant={aiEnabled ? 'secondary' : 'primary'} onClick={() => setAiEnabled(!aiEnabled)}>
                  {aiEnabled ? 'Disable' : 'Enable'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Preview role</p>
                  <p className="text-[11px] text-slate-400">Nav and edit controls are gated by RBAC</p>
                </div>
                <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} aria-label="Preview role">
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </Select>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Compliance" subtitle="GDPR-style workflows" />
            <div className="space-y-3 p-5">
              <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Audit log</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    Every mutation, export and AI translation is recorded with actor, IP and diff. AI actions are logged separately from user actions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Data subject requests</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                    Export or erase all personal data for an end user across every connected source.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-rose-100 p-3 dark:border-rose-950">
                <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Delete workspace</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">Irreversible. Retained backups are purged per the RPO/RTO policy.</p>
                </div>
                <Button size="sm" variant="danger">Delete</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <UsageCard />
      <ApiKeysCard />
    </div>
  );
}