import type { Granularity, NlqResult, Role } from '@/types';
import { METRICS, DIMENSIONS } from './metrics';
import { appendAudit } from './audit';

const METRIC_KEYWORDS: Record<string, string[]> = {
  mrr: ['mrr', 'monthly recurring', 'recurring revenue'],
  expansion_revenue: ['expansion', 'upsell', 'expansion revenue'],
  arpu: ['arpu', 'average revenue per user', 'revenue per user'],
  active_users: ['active users', 'dau', 'daily active', 'users'],
  trial_conversions: ['trial conversions', 'conversions', 'trials', 'trial'],
  churn_rate: ['churn rate', 'churn'],
  support_tickets: ['support tickets', 'tickets', 'ticket volume'],
  nps: ['nps', 'net promoter'],
};

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  enterprise: ['enterprise'],
  'mid-market': ['mid-market', 'midmarket', 'mid market'],
  smb: ['smb', 'small business', 'small businesses'],
  'self-serve': ['self-serve', 'self serve', 'selfserve', 'selfserved'],
};

interface RangeMatch {
  preset: '7d' | '30d' | '90d' | '12m' | 'ytd' | 'qtd' | 'last_month' | 'last_quarter';
  patterns: string[];
  granularity: Granularity;
}

const RANGE_KEYWORDS: RangeMatch[] = [
  { preset: '7d', patterns: ['last 7 days', 'last week', 'past week', 'this week'], granularity: 'day' },
  { preset: '30d', patterns: ['last 30 days', 'last month', 'past month', 'this month'], granularity: 'day' },
  { preset: '90d', patterns: ['last 90 days', 'last quarter', 'past quarter', 'this quarter', 'qtd'], granularity: 'week' },
  { preset: '12m', patterns: ['last 12 months', 'last year', 'past year', 'year over year', 'yoy'], granularity: 'month' },
  { preset: 'ytd', patterns: ['ytd', 'year to date'], granularity: 'month' },
  { preset: 'last_month', patterns: ['previous month', 'prior month'], granularity: 'day' },
  { preset: 'last_quarter', patterns: ['previous quarter', 'prior quarter'], granularity: 'week' },
];

const GRANULARITY_KEYWORDS: Array<{ g: Granularity; words: string[] }> = [
  { g: 'day', words: ['daily', 'by day', 'per day'] },
  { g: 'week', words: ['weekly', 'by week', 'per week'] },
  { g: 'month', words: ['monthly', 'by month', 'per month'] },
];

const BANNED_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /;\s*(drop|delete|update|insert|alter|truncate|create)\b/i, reason: 'Statement chaining with DDL/DML is not permitted.' },
  { re: /\b(drop|truncate|alter)\s+(table|database|schema)\b/i, reason: 'Schema mutation is not permitted.' },
  { re: /\b(union\s+(all\s+)?select)\b/i, reason: 'UNION injection patterns are blocked.' },
  { re: /\bor\s+1\s*=\s*1\b/i, reason: 'Tautology injection patterns are blocked.' },
  { re: /--|\/\*|\*\//, reason: 'SQL comment sequences are blocked.' },
  { re: /\b(xp_|sp_|information_schema|pg_catalog|sys\.)\w*/i, reason: 'System catalog access is blocked.' },
  { re: /\b(tenant_id|org_id)\s*[!=]/i, reason: 'Cross-tenant predicates are not user-settable.' },
  { re: /\b(select|from|where|join|group by|order by)\b/i, reason: 'Raw SQL is not accepted â€” use natural language.' },
  { re: /ignore (all )?(previous|prior) (instructions|rules)/i, reason: 'Prompt-injection attempt detected.' },
  { re: /system prompt|developer message|you are now/i, reason: 'Prompt-injection attempt detected.' },
];

export interface GuardrailResult { ok: boolean; reason?: string; }

export function checkGuardrails(text: string): GuardrailResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'Query is empty.' };
  if (trimmed.length > 280) return { ok: false, reason: 'Query exceeds 280 characters.' };
  for (const { re, reason } of BANNED_PATTERNS) {
    if (re.test(trimmed)) return { ok: false, reason };
  }
  return { ok: true };
}

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

export function consumeRateLimit(tenantId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hits = (buckets.get(tenantId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) { buckets.set(tenantId, hits); return { allowed: false, remaining: 0 }; }
  hits.push(now);
  buckets.set(tenantId, hits);
  return { allowed: true, remaining: RATE_LIMIT - hits.length };
}

export function remainingQueries(tenantId: string): number {
  const now = Date.now();
  const hits = (buckets.get(tenantId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  return Math.max(0, RATE_LIMIT - hits.length);
}

function matchMetric(text: string): { id: string; score: number } | null {
  const lower = text.toLowerCase();
  let best: { id: string; score: number } | null = null;
  for (const [id, words] of Object.entries(METRIC_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) {
        const score = w.length;
        if (!best || score > best.score) best = { id, score };
      }
    }
  }
  return best;
}

function matchSegment(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [id, words] of Object.entries(SEGMENT_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return id;
  }
  return undefined;
}

function matchRange(text: string): RangeMatch | undefined {
  const lower = text.toLowerCase();
  let best: RangeMatch | undefined;
  let bestLen = 0;
  for (const entry of RANGE_KEYWORDS) {
    for (const p of entry.patterns) {
      if (lower.includes(p) && p.length > bestLen) { best = entry; bestLen = p.length; }
    }
  }
  return best;
}

function matchGranularity(text: string): Granularity | undefined {
  const lower = text.toLowerCase();
  for (const { g, words } of GRANULARITY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return g;
  }
  return undefined;
}

const DAY = 86_400_000;

function resolveRange(preset: RangeMatch['preset']): { from: string; to: string } {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const iso = (ts: number) => new Date(ts).toISOString().slice(0, 10);

  switch (preset) {
    case '7d': return { from: iso(today - 6 * DAY), to: iso(today) };
    case '30d': return { from: iso(today - 29 * DAY), to: iso(today) };
    case '90d': return { from: iso(today - 89 * DAY), to: iso(today) };
    case '12m': return { from: iso(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)), to: iso(today) };
    case 'ytd': return { from: iso(Date.UTC(now.getUTCFullYear(), 0, 1)), to: iso(today) };
    case 'qtd': { const q = Math.floor(now.getUTCMonth() / 3) * 3; return { from: iso(Date.UTC(now.getUTCFullYear(), q, 1)), to: iso(today) }; }
    case 'last_month': {
      const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const m = (now.getUTCMonth() + 11) % 12;
      return { from: iso(Date.UTC(y, m, 1)), to: iso(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)) };
    }
    case 'last_quarter': {
      const q = Math.floor(now.getUTCMonth() / 3) * 3;
      const startMonth = (q + 9) % 12;
      const startYear = q === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      return { from: iso(Date.UTC(startYear, startMonth, 1)), to: iso(Date.UTC(now.getUTCFullYear(), q, 0)) };
    }
  }
}

export function translateQuery(
  text: string,
  ctx: { tenantId: string; actor: string; role: Role; ip: string },
): NlqResult {
  const started = performance.now();
  const id = `nlq_${Math.random().toString(36).slice(2, 10)}`;

  const base: Omit<NlqResult, 'status' | 'confidence' | 'explanation' | 'latencyMs'> = {
    id, text, createdAt: new Date().toISOString(),
  };

  const finish = (patch: Partial<NlqResult>): NlqResult => {
    const result: NlqResult = {
      ...base, status: 'ok', confidence: 0, explanation: '',
      latencyMs: Math.round(performance.now() - started), ...patch,
    };
    appendAudit({
      tenantId: ctx.tenantId, kind: 'ai', actor: ctx.actor, actorRole: ctx.role,
      action: 'nlq.translate', target: result.metricId ?? 'unknown',
      outcome: result.status === 'ok' ? 'success' : (result.status === 'blocked' || result.status === 'rate_limited') ? 'blocked' : 'failure',
      ip: ctx.ip,
      meta: { text: text.slice(0, 200), status: result.status, confidence: result.confidence, blockedReason: result.blockedReason },
    });
    return result;
  };

  const guard = checkGuardrails(text);
  if (!guard.ok) return finish({ status: 'blocked', blockedReason: guard.reason, explanation: 'The query was rejected by the input guardrail before reaching the model.' });

  const rate = consumeRateLimit(ctx.tenantId);
  if (!rate.allowed) return finish({ status: 'rate_limited', blockedReason: `Rate limit reached for this workspace (${RATE_LIMIT}/min). Try again shortly.`, explanation: 'Per-tenant NL query cap enforced to protect AI cost margins.' });

  const metric = matchMetric(text);
  if (!metric) {
    return finish({
      status: 'low_confidence',
      explanation: 'No known metric matched. Try naming a metric explicitly â€” e.g. "MRR by region last quarter", "churn rate this month", or "active users last 90 days".',
    });
  }

  const rangeMatch = matchRange(text);
  const range = rangeMatch ? resolveRange(rangeMatch.preset) : resolveRange('30d');
  const granularity = matchGranularity(text) ?? rangeMatch?.granularity ?? 'day';
  const segment = matchSegment(text) ?? 'all';

  let confidence = 0.62;
  if (rangeMatch) confidence += 0.18;
  if (segment !== 'all') confidence += 0.1;
  if (matchGranularity(text)) confidence += 0.06;
  confidence = Math.min(0.96, confidence);

  const metricDef = METRICS.find((m) => m.id === metric.id)!;
  const segmentLabel = DIMENSIONS.find((d) => d.id === segment)?.label ?? 'All segments';
  const parts = [
    `metric: ${metricDef.label} (${metricDef.id})`,
    `segment: ${segmentLabel}`,
    `range: ${range.from} â†’ ${range.to}`,
    `granularity: ${granularity}`,
  ];

  return finish({
    status: confidence >= 0.7 ? 'ok' : 'low_confidence',
    metricId: metric.id, segment, granularity, range, confidence,
    explanation:
      `Resolved against the tenant-scoped semantic layer. All predicates are bound to ` +
      `workspace "${ctx.tenantId}" â€” no user-supplied identifier can escape that scope. ` +
      `Parsed: ${parts.join(' Â· ')}.`,
  });
}