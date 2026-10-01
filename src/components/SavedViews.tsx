import { useState } from 'react';
import { Bookmark, BookmarkPlus, Link2, Pin, PinOff, Trash2 } from 'lucide-react';
import { useAppStore, useViewsStore, useCrossFilterStore } from '@/store';
import { Badge, Button } from './ui';

export function SavedViewsBar() {
  const tenantId = useAppStore((s) => s.tenantId);
  const range = useAppStore((s) => s.range);
  const granularity = useAppStore((s) => s.granularity);
  const segment = useAppStore((s) => s.segment);
  const compare = useAppStore((s) => s.compare);

  const views = useViewsStore((s) => s.viewsByTenant[tenantId] ?? []);
  const saveView = useViewsStore((s) => s.saveView);
  const deleteView = useViewsStore((s) => s.deleteView);
  const togglePin = useViewsStore((s) => s.togglePin);
  const applyView = useViewsStore((s) => s.applyView);

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  const sorted = [...views].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const copyShareLink = async () => {
    const params = new URLSearchParams({ from: range.from, to: range.to, g: granularity, seg: segment, cmp: String(compare) });
    const url = `${window.location.origin}${window.location.pathname}?${params}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt('Copy this link', url); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Bookmark className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Views</span>
      </div>

      {sorted.length === 0 && !saving ? <span className="text-[11px] text-slate-400">No saved views yet</span> : null}

      {sorted.map((view) => (
        <div key={view.id} className="group inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white pl-2.5 pr-1 py-1 text-xs dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => applyView(view)} className="font-medium text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
            title={`${view.range.from} â†’ ${view.range.to} Â· ${view.granularity} Â· ${view.segment}`}>
            {view.name}
          </button>
          {view.pinned ? <Badge tone="brand">pinned</Badge> : null}
          <button type="button" aria-label={view.pinned ? 'Unpin view' : 'Pin view'} onClick={() => togglePin(tenantId, view.id)}
            className="rounded p-0.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-300">
            {view.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>
          <button type="button" aria-label="Delete view" onClick={() => deleteView(tenantId, view.id)}
            className="rounded p-0.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}

      {saving ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          saveView({ tenantId, name: name.trim(), range: { from: range.from, to: range.to, preset: range.preset }, granularity, segment, compare, pinned: false });
          setName(''); setSaving(false);
        }} className="inline-flex items-center gap-1">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name && setSaving(false)} placeholder="View nameâ€¦"
            className="h-7 w-36 rounded-lg border border-brand-300 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-brand-700 dark:bg-slate-900" />
          <Button size="sm" variant="primary" type="submit">Save</Button>
        </form>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setSaving(true)}>
          <BookmarkPlus className="h-3.5 w-3.5" /> Save view
        </Button>
      )}

      <Button size="sm" variant="ghost" onClick={copyShareLink} title="Copy a shareable link to this view">
        <Link2 className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Share'}
      </Button>
    </div>
  );
}

export function CrossFilterBar() {
  const filter = useCrossFilterStore((s) => s.filter);
  const clear = useCrossFilterStore((s) => s.clear);
  if (!filter) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs dark:border-brand-800 dark:bg-brand-900/30">
      <span className="text-brand-700 dark:text-brand-300">Cross-filter:</span>
      <Badge tone="brand">{filter.label} = {filter.bucket}</Badge>
      <button type="button" onClick={clear} className="ml-1 text-brand-600 hover:underline dark:text-brand-400">Clear</button>
    </div>
  );
}