import type { AuditEvent } from '@/types';

type Listener = (events: AuditEvent[]) => void;
const events: AuditEvent[] = [];
const listeners = new Set<Listener>();
const MAX = 500;

export function appendAudit(input: Omit<AuditEvent, 'id' | 'ts'> & { ts?: string }): AuditEvent {
  const event: AuditEvent = {
    id: `aud_${Math.random().toString(36).slice(2, 10)}`,
    ts: input.ts ?? new Date().toISOString(),
    ...input,
  };
  events.unshift(event);
  if (events.length > MAX) events.length = MAX;
  listeners.forEach((fn) => fn([...events]));
  return event;
}

export function subscribeAudit(fn: Listener): () => void {
  listeners.add(fn);
  fn([...events]);
  return () => { listeners.delete(fn); };
}

export function getAudit(tenantId?: string): AuditEvent[] {
  return tenantId ? events.filter((e) => e.tenantId === tenantId) : [...events];
}

let seeded = false;
export function seedAudit(tenantId: string, actor: string) {
  if (seeded) return;
  seeded = true;
  const now = Date.now();

  const seed: Array<Partial<AuditEvent> & { action: string; kind: AuditEvent['kind']; target: string }> = [
    { kind: 'user', action: 'auth.login', target: 'session', meta: { mfa: true }, ts: new Date(now - 6 * 60_000).toISOString() },
    { kind: 'user', action: 'dashboard.view', target: 'Overview', ts: new Date(now - 5 * 60_000).toISOString() },
    { kind: 'ai', action: 'nlq.translate', target: 'mrr', meta: { text: 'Show MRR by region last quarter', confidence: 0.94 }, ts: new Date(now - 4 * 60_000).toISOString() },
    { kind: 'user', action: 'widget.add', target: 'active_users (line)', ts: new Date(now - 3 * 60_000).toISOString() },
    { kind: 'ai', action: 'insight.generate', target: 'mrr', meta: { confidence: 0.81 }, ts: new Date(now - 2 * 60_000).toISOString() },
    { kind: 'system', action: 'rollup.refresh', target: 'mv_daily_metrics', meta: { rows: 4_812_004, durationMs: 1180 }, ts: new Date(now - 90_000).toISOString() },
    { kind: 'user', action: 'export.csv', target: 'customers', ts: new Date(now - 60_000).toISOString() },
    { kind: 'ai', action: 'nlq.translate', target: 'unknown', outcome: 'blocked', meta: { text: 'DROP TABLE tenants', status: 'blocked', blockedReason: 'Schema mutation is not permitted.' }, ts: new Date(now - 30_000).toISOString() },
  ];

  for (const e of seed.reverse()) {
    appendAudit({
      tenantId, actor, actorRole: 'owner', outcome: 'success', ip: '203.0.113.42',
      ...e,
    } as Omit<AuditEvent, 'id' | 'ts'> & { ts?: string });
  }
}