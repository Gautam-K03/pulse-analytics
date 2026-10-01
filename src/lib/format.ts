import type { Granularity, MetricFormat } from '@/types';

export function compact(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + 'K';
  if (abs > 0 && abs < 1) return n.toFixed(2);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatMetric(value: number, format: MetricFormat): string {
  if (!Number.isFinite(value)) return 'â€”';
  switch (format) {
    case 'currency': return '$' + compact(value);
    case 'percent': return value.toFixed(1) + '%';
    case 'number': return compact(value);
    case 'duration': return value.toFixed(1) + 's';
  }
}

export function formatFull(value: number, format: MetricFormat): string {
  if (!Number.isFinite(value)) return 'â€”';
  switch (format) {
    case 'currency':
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    case 'percent': return value.toFixed(2) + '%';
    case 'number': return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'duration': return value.toFixed(1) + 's';
  }
}

export function formatDelta(delta: number): string {
  if (!Number.isFinite(delta)) return 'â€”';
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

export function formatDate(iso: string, granularity: Granularity = 'day'): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  if (Number.isNaN(d.getTime())) return iso;
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}