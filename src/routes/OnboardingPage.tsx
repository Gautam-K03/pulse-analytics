import { ArrowRight, CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useOnboardingStore } from '@/store';
import { cn } from '@/lib/cn';
import { Button, Card } from '@/components/ui';
import type { OnboardingStep } from '@/types';

const STEPS: OnboardingStep[] = [
  { id: 'connect', title: 'Connect a data source', description: 'Attach Postgres, Stripe or a webhook to start ingesting.', done: false, href: '/data', cta: 'Add source' },
  { id: 'metrics', title: 'Review your metric catalog', description: 'Confirm the definitions your team will rely on.', done: false, href: '/metrics', cta: 'Open catalog' },
  { id: 'dashboard', title: 'Arrange your dashboard', description: 'Add widgets and reorder cards to match how you work.', done: false, href: '/', cta: 'Open dashboard' },
  { id: 'alerts', title: 'Set your first alert', description: 'Get notified on Slack or email when a metric crosses a threshold.', done: false, href: '/alerts', cta: 'Configure alerts' },
  { id: 'invite', title: 'Invite a teammate', description: 'Share the workspace with the people who need it.', done: false, href: '/team', cta: 'Invite' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const tenantId = useAppStore((s) => s.tenantId);
  const done = useOnboardingStore((s) => s.completedByTenant[tenantId] ?? []);
  const completeStep = useOnboardingStore((s) => s.completeStep);
  const dismiss = useOnboardingStore((s) => s.dismiss);
  const reset = useOnboardingStore((s) => s.reset);

  const progress = (done.length / STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-[820px] space-y-4 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-500" />
            <h1 className="text-lg font-semibold tracking-tight">Get started with Pulse</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Five steps to a useful workspace. Each one takes under two minutes.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { dismiss(tenantId); navigate('/'); }}>
          <X className="h-3.5 w-3.5" /> Skip
        </Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{done.length} of {STEPS.length} complete</span>
          <span className="tabular text-xs font-semibold text-brand-600 dark:text-brand-400">{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = done.includes(step.id);
          return (
            <Card key={step.id} className={cn('flex items-start gap-3 p-5 transition-colors', isDone && 'opacity-70')}>
              <div className="mt-0.5 shrink-0">
                {isDone ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400">STEP {i + 1}</span>
                  <span className={cn('text-sm font-semibold', isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>{step.title}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{step.description}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button size="sm" variant={isDone ? 'ghost' : 'primary'}
                    onClick={() => { completeStep(tenantId, step.id); navigate(step.href); }}>
                    {step.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  {!isDone ? (
                    <button type="button" onClick={() => completeStep(tenantId, step.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      Mark as done
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={() => reset(tenantId)}>Reset onboarding</Button>
      </div>
    </div>
  );
}