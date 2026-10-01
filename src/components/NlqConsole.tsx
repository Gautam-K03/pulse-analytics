import { useState } from 'react';
import { CornerDownLeft, ShieldAlert, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { translateQuery, remainingQueries } from '@/lib/nlq';
import { useAppStore } from '@/store';
import type { NlqResult } from '@/types';
import { cn } from '@/lib/cn';
import { Badge, Button } from './ui';

const EXAMPLES = [
  'Show MRR last quarter',
  'Churn rate for SMB this month',
  'Active users daily last 30 days',
  'Trial conversions by week last 90 days',
];

export function NlqConsole({ onApply }: { onApply: (result: NlqResult) => void }) {
  const tenantId = useAppStore((s) => s.tenantId);
  const role = useAppStore((s) => s.role);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NlqResult | null>(null);
  const [remaining, setRemaining] = useState(() => remainingQueries(tenantId));

  const run = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 260 + Math.random() * 340));
    const res = translateQuery(text, { tenantId, actor: 'you@pulse.dev', role, ip: '203.0.113.42' });
    setResult(res);
    setRemaining(remainingQueries(tenantId));
    if (res.status === 'ok') onApply(res);
    setBusy(false);
  };

  const blocked = result?.status === 'blocked' || result?.status === 'rate_limited';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ask anything</span>
          <Badge tone="brand">tenant-scoped</Badge>
        </div>
        <span className="tabular text-[11px] text-slate-400">{remaining} / 20 queries left this minute</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void run(); } }}
            placeholder='e.g. "Show MRR by region last quarter"' aria-label="Natural language query"
            className={cn('h-10 w-full rounded-lg border bg-white pl-3 pr-10 text-sm text-slate-800 placeholder:text-slate-400',
              'focus:outline-none focus:ring-1 dark:bg-slate-950 dark:text-slate-100',
              blocked ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-800'
                : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700')} />
          <CornerDownLeft className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
        </div>
        <Button variant="primary" onClick={run} disabled={busy || !text.trim()}>
          {busy ? <Zap className="h-3.5 w-3.5 animate-pulse" /> : null}
          {busy ? 'Thinkingâ€¦' : 'Ask'}
        </Button>
      </div>

      {!result && !busy ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setText(ex)}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300">
              {ex}
            </button>
          ))}
        </div>
      ) : null}

      {result ? (
        <div className={cn('mt-3 rounded-lg border p-3 text-xs',
          blocked ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30'
            : 'border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40')}
          role={blocked ? 'alert' : 'status'}>
          <div className="flex items-start gap-2">
            {blocked ? <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
              : <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {blocked ? 'Query blocked' : result.status === 'low_confidence' ? 'Low confidence â€” clarify' : 'Query resolved'}
                </span>
                {!blocked && result.metricId ? <Badge tone="brand">{Math.round(result.confidence * 100)}% confidence</Badge> : null}
                <span className="tabular text-[11px] text-slate-400">{result.latencyMs}ms</span>
              </div>
              <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">{result.blockedReason ?? result.explanation}</p>
              {!blocked && result.metricId ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">metric={result.metricId}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">segment={result.segment}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">{result.range?.from} â†’ {result.range?.to}</span>
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">{result.granularity}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}