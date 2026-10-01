import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAlerts, fetchApiKeys, fetchCustomers, fetchMetricSeries, fetchUsage, type CustomerQuery } from './lib/mockApi';
import { useAppStore } from './store';
import type { Granularity } from './types';
import { liveFeed, type LiveEvent, type LiveStatus } from './lib/live';

export function useThemeSync() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const id = window.setTimeout(() => setDebounced(value), ms); return () => window.clearTimeout(id); }, [value, ms]);
  return debounced;
}

export function useMetricSeries(metricId: string, options?: { enabled?: boolean }) {
  const tenantId = useAppStore((s) => s.tenantId);
  const range = useAppStore((s) => s.range);
  const granularity = useAppStore((s) => s.granularity);
  const segment = useAppStore((s) => s.segment);
  const compare = useAppStore((s) => s.compare);

  return useQuery({
    queryKey: ['series', tenantId, metricId, range.from, range.to, granularity, segment, compare],
    queryFn: () => fetchMetricSeries({ tenantId, metricId, from: range.from, to: range.to, granularity, segment, compare }),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useCustomers(params: Omit<CustomerQuery, 'tenantId'>) {
  const tenantId = useAppStore((s) => s.tenantId);
  const debouncedQ = useDebounced(params.q ?? '', 300);
  return useQuery({
    queryKey: ['customers', tenantId, { ...params, q: debouncedQ }],
    queryFn: () => fetchCustomers({ ...params, q: debouncedQ, tenantId }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useAlerts() {
  const tenantId = useAppStore((s) => s.tenantId);
  return useQuery({ queryKey: ['alerts', tenantId], queryFn: () => fetchAlerts(tenantId), staleTime: 60_000 });
}

export function useUsage() {
  const tenantId = useAppStore((s) => s.tenantId);
  return useQuery({ queryKey: ['usage', tenantId], queryFn: () => fetchUsage(tenantId), staleTime: 120_000 });
}

export function useApiKeys() {
  const tenantId = useAppStore((s) => s.tenantId);
  return useQuery({ queryKey: ['api-keys', tenantId], queryFn: () => fetchApiKeys(tenantId), staleTime: 120_000 });
}

export function useLiveMetric(metricId: string, enabled = true) {
  const tenantId = useAppStore((s) => s.tenantId);
  const [status, setStatus] = useState<LiveStatus>('closed');
  const [tick, setTick] = useState<LiveEvent | null>(null);

  useEffect(() => {
    if (!enabled) { setStatus('closed'); setTick(null); return; }
    setTick(null);
    return liveFeed.subscribe(tenantId, metricId, setTick, setStatus);
  }, [tenantId, metricId, enabled]);

  return { tick, status };
}

export function useVirtualRows(count: number, rowHeight: number, containerRef: React.RefObject<HTMLDivElement>, overscan = 8) {
  const [range, setRange] = useState({ start: 0, end: 40 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recompute = () => {
      const visible = Math.ceil(el.clientHeight / rowHeight) + overscan * 2;
      const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - overscan);
      setRange({ start, end: Math.min(count, start + visible) });
    };
    recompute();
    el.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute);
    return () => { el.removeEventListener('scroll', recompute); window.removeEventListener('resize', recompute); };
  }, [count, rowHeight, containerRef, overscan]);
  return range;
}

export function useHotkey(combo: { key: string; meta?: boolean; shift?: boolean }, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const metaOk = combo.meta ? e.metaKey || e.ctrlKey : true;
      const shiftOk = combo.shift ? e.shiftKey : true;
      if (metaOk && shiftOk && e.key.toLowerCase() === combo.key.toLowerCase()) { e.preventDefault(); handlerRef.current(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [combo.key, combo.meta, combo.shift]);
}

export function useGranularityOptions(): Array<{ id: Granularity; label: string }> {
  return useMemo(() => [
    { id: 'day' as Granularity, label: 'Daily' },
    { id: 'week' as Granularity, label: 'Weekly' },
    { id: 'month' as Granularity, label: 'Monthly' },
  ], []);
}