import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Bell, BookOpenCheck, Database, FileCheck2, LayoutDashboard, Moon, Receipt, RotateCcw,
  Search, Settings, ShieldCheck, Sparkles, Sun, Users, UsersRound, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { TENANTS } from '@/lib/mockApi';
import { useAppStore, useDashboardStore, RANGE_PRESETS } from '@/store';

interface Command {
  id: string; label: string; hint?: string;
  group: 'Navigate' | 'Workspace' | 'Range' | 'Appearance' | 'Data';
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void; }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const store = useAppStore();
  const resetWidgets = useDashboardStore((s) => s.resetWidgets);

  const commands = useMemo<Command[]>(() => {
    const close = (fn: () => void) => () => { fn(); onOpenChange(false); setQuery(''); };
    return [
      { id: 'nav-dash', label: 'Go to Dashboard', group: 'Navigate', icon: LayoutDashboard, run: close(() => navigate('/')) },
      { id: 'nav-query', label: 'Go to Query workspace', group: 'Navigate', icon: Wand2, run: close(() => navigate('/query')) },
      { id: 'nav-cust', label: 'Go to Customers', group: 'Navigate', icon: Users, run: close(() => navigate('/customers')) },
      { id: 'nav-metrics', label: 'Go to Metric catalog', group: 'Navigate', icon: Activity, run: close(() => navigate('/metrics')) },
      { id: 'nav-alerts', label: 'Go to Alerts', group: 'Navigate', icon: Bell, run: close(() => navigate('/alerts')) },
      { id: 'nav-reports', label: 'Go to Reports', group: 'Navigate', icon: BookOpenCheck, run: close(() => navigate('/reports')) },
      { id: 'nav-data', label: 'Go to Data sources', group: 'Navigate', icon: Database, run: close(() => navigate('/data')) },
      { id: 'nav-dq', label: 'Go to Data quality', group: 'Navigate', icon: FileCheck2, run: close(() => navigate('/data-quality')) },
      { id: 'nav-audit', label: 'Go to Audit log', group: 'Navigate', icon: ShieldCheck, run: close(() => navigate('/audit')) },
      { id: 'nav-team', label: 'Go to Team', group: 'Navigate', icon: UsersRound, run: close(() => navigate('/team')) },
      { id: 'nav-billing', label: 'Go to Billing', group: 'Navigate', icon: Receipt, run: close(() => navigate('/billing')) },
      { id: 'nav-settings', label: 'Go to Settings', group: 'Navigate', icon: Settings, run: close(() => navigate('/settings')) },

      ...TENANTS.map<Command>((t) => ({
        id: `tenant-${t.id}`, label: `Switch to ${t.name}`, hint: t.plan, group: 'Workspace', icon: Sparkles,
        run: close(() => { store.setTenant(t.id); navigate('/'); }),
      })),

      ...RANGE_PRESETS.map<Command>((p) => ({
        id: `range-${p.id}`, label: p.label, group: 'Range', icon: Activity, run: close(() => store.setPreset(p.id)),
      })),

      { id: 'toggle-theme', label: `Switch to ${store.theme === 'dark' ? 'light' : 'dark'} mode`, group: 'Appearance', icon: store.theme === 'dark' ? Sun : Moon, run: close(() => store.toggleTheme()) },
      { id: 'toggle-ai', label: store.aiEnabled ? 'Turn AI insights off' : 'Turn AI insights on', group: 'Appearance', icon: Sparkles, run: close(() => store.setAiEnabled(!store.aiEnabled)) },
      { id: 'reset-layout', label: 'Reset dashboard layout', group: 'Data', icon: RotateCcw, run: close(() => resetWidgets(store.tenantId)) },
    ];
  }, [navigate, onOpenChange, resetWidgets, store]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setActiveIndex(0); }, [query, open]);

  useEffect(() => {
    if (open) { const id = window.setTimeout(() => inputRef.current?.focus(), 10); return () => window.clearTimeout(id); }
    setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); filtered[activeIndex]?.run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onOpenChange]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-fade-in dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search commands, pages, workspacesâ€¦"
            className="h-12 flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100" aria-label="Command search" />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-700">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-400">No matching commands</p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                {items.map((cmd) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const Icon = cmd.icon;
                  return (
                    <button key={cmd.id} data-index={index} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={cmd.run}
                      className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm',
                        index === activeIndex ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-slate-700 dark:text-slate-200')}>
                      <Icon className="h-4 w-4 shrink-0 opacity-70" />
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.hint ? <span className="text-[10px] uppercase text-slate-400">{cmd.hint}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}