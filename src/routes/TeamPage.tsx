import { useState } from 'react';
import { KeyRound, Mail, MoreHorizontal, ShieldCheck, UserPlus } from 'lucide-react';
import { ROLE_LABEL, ROLES } from '@/lib/rbac';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { appendAudit } from '@/lib/audit';
import { useAppStore } from '@/store';
import { Badge, Button, Card, CardHeader, Select } from '@/components/ui';
import type { Role, TenantMember } from '@/types';

const SEED: TenantMember[] = [
  { id: 'm1', name: 'You', email: 'you@pulse.dev', role: 'owner', status: 'active', lastSeen: new Date().toISOString(), mfa: true },
  { id: 'm2', name: 'Priya Raman', email: 'priya@acme.com', role: 'admin', status: 'active', lastSeen: new Date(Date.now() - 42 * 60_000).toISOString(), mfa: true },
  { id: 'm3', name: 'Tomas Oliveira', email: 'tomas@acme.com', role: 'editor', status: 'active', lastSeen: new Date(Date.now() - 5 * 3600_000).toISOString(), mfa: false },
  { id: 'm4', name: 'Wei Chen', email: 'wei@acme.com', role: 'viewer', status: 'active', lastSeen: new Date(Date.now() - 26 * 3600_000).toISOString(), mfa: true },
  { id: 'm5', name: 'Dana Fisk', email: 'dana@acme.com', role: 'viewer', status: 'invited', lastSeen: null, mfa: false },
  { id: 'm6', name: 'Old Contractor', email: 'contractor@vendor.io', role: 'viewer', status: 'suspended', lastSeen: new Date(Date.now() - 30 * 86_400_000).toISOString(), mfa: false },
];

const STATUS_TONE = { active: 'positive', invited: 'info', suspended: 'warning' } as const;

export default function TeamPage() {
  const tenantId = useAppStore((s) => s.tenantId);
  const role = useAppStore((s) => s.role);
  const [members, setMembers] = useState<TenantMember[]>(SEED);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');

  const canManage = role === 'owner' || role === 'admin';

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    const member: TenantMember = { id: `m_${Date.now().toString(36)}`, name: inviteEmail.split('@')[0], email: inviteEmail.trim(), role: inviteRole, status: 'invited', lastSeen: null, mfa: false };
    setMembers((prev) => [...prev, member]);
    appendAudit({ tenantId, kind: 'user', actor: 'you@pulse.dev', actorRole: role, action: 'member.invite', target: member.email, outcome: 'success', ip: '203.0.113.42', meta: { role: inviteRole } });
    setInviteEmail(''); setInviteOpen(false);
  };

  const changeRole = (id: string, next: Role) => {
    const member = members.find((m) => m.id === id);
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: next } : m)));
    appendAudit({ tenantId, kind: 'user', actor: 'you@pulse.dev', actorRole: role, action: 'member.role_change', target: member?.email ?? id, outcome: 'success', ip: '203.0.113.42', meta: { from: member?.role, to: next } });
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Team</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Invites, role assignments and MFA status. Roles gate every route and mutation in the app.
          </p>
        </div>
        {canManage ? <Button variant="primary" size="sm" onClick={() => setInviteOpen((v) => !v)}><UserPlus className="h-3.5 w-3.5" /> Invite member</Button> : null}
      </div>

      {inviteOpen ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Invite a teammate</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">They will receive an email with a magic link valid for 24 hours.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} aria-label="Role">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
            <Button variant="primary" size="sm" onClick={sendInvite}>Send invite</Button>
            <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader title="Members" subtitle={`${members.filter((m) => m.status === 'active').length} active Â· ${members.filter((m) => m.status === 'invited').length} pending`} />
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{member.name}</span>
                    <Badge tone={STATUS_TONE[member.status]}>{member.status}</Badge>
                    {member.mfa ? (
                      <span title="MFA enabled" className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> MFA
                      </span>
                    ) : (
                      <span title="MFA not enabled" className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                        <KeyRound className="h-3 w-3" /> no MFA
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-slate-400">{member.email} Â· {member.lastSeen ? `seen ${relativeTime(member.lastSeen)}` : 'never signed in'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canManage && member.role !== 'owner' ? (
                  <Select aria-label={`Role for ${member.name}`} value={member.role} onChange={(e) => changeRole(member.id, e.target.value as Role)}>
                    {ROLES.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </Select>
                ) : <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>}
                {canManage && member.role !== 'owner' ? (
                  <Button variant="ghost" size="icon" aria-label={`Suspend ${member.name}`}
                    onClick={() => setMembers((prev) => prev.map((m) => m.id === member.id ? { ...m, status: m.status === 'suspended' ? 'active' : 'suspended' } : m))}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Authentication" subtitle="SSO and MFA enforce at the workspace level" />
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {[
            { title: 'OAuth2 / OIDC', detail: 'Google, Okta, Azure AD', on: true },
            { title: 'SAML SSO', detail: 'Enterprise plan only', on: false },
            { title: 'Require MFA', detail: 'Enforce for all members', on: true },
          ].map((item) => (
            <div key={item.title} className="flex items-start justify-between rounded-lg border border-slate-100 p-3 dark:border-slate-800">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{item.detail}</p>
              </div>
              <span className={cn('mt-0.5 h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors', item.on ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700')}>
                <span className={cn('block h-3 w-3 rounded-full bg-white transition-transform', item.on && 'translate-x-3')} />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}