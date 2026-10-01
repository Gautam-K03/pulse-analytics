import { CalendarRange, GitCompareArrows } from 'lucide-react';
import { DIMENSIONS } from '@/lib/metrics';
import { cn } from '@/lib/cn';
import { useAppStore, RANGE_PRESETS, type RangePreset } from '@/store';
import { useGranularityOptions } from '@/hooks';
import { Select } from './ui';

export function FilterBar({ compact = false }: { compact?: boolean }) {
  const range = useAppStore((s) => s.range);
  const setPreset = useAppStore((s) => s.setPreset);
  const setRange = useAppStore((s) => s.setRange);
  const granularity = useAppStore((s) => s.granularity);
  const setGranularity = useAppStore((s) => s.setGranularity);
  const segment = useAppStore((s) => s.segment);
  const setSegment = useAppStore((s) => s.setSegment);
  const compare = useAppStore((s) => s.compare);
  const setCompare = useAppStore((s) => s.setCompare);
  const granularityOptions = useGranularityOptions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Date range preset">
        {RANGE_PRESETS.map((preset) => (
          <button key={preset.id} type="button" onClick={() => setPreset(preset.id)} aria-pressed={range.preset === preset.id}
            className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              range.preset === preset.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')}>
            {preset.label.replace('Last ', '').replace('Year to date', 'YTD')}
          </button>
        ))}
      </div>

      {!compact ? (
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
          <CalendarRange className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Custom date range</span>
          <input type="date" value={range.from} max={range.to}
            onChange={(e) => setRange({ ...range, from: e.target.value, preset: 'custom' as RangePreset })}
            className="w-[7.5rem] bg-transparent text-xs text-slate-700 focus:outline-none dark:text-slate-200" />
          <span className="text-xs text-slate-400">â†’</span>
          <input type="date" value={range.to} min={range.from}
            onChange={(e) => setRange({ ...range, to: e.target.value, preset: 'custom' as RangePreset })}
            className="w-[7.5rem] bg-transparent text-xs text-slate-700 focus:outline-none dark:text-slate-200" />
        </label>
      ) : null}

      <Select aria-label="Granularity" value={granularity} onChange={(e) => setGranularity(e.target.value as typeof granularity)}>
        {granularityOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </Select>

      <Select aria-label="Segment" value={segment} onChange={(e) => setSegment(e.target.value)}>
        {DIMENSIONS.map((dimension) => <option key={dimension.id} value={dimension.id}>{dimension.label}</option>)}
      </Select>

      <button type="button" onClick={() => setCompare(!compare)} aria-pressed={compare}
        className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
          compare ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-300'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')}>
        <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
        Compare
      </button>
    </div>
  );
}