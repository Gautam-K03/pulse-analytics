import type { CohortRow } from '@/types';

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCohorts(tenantId: string, months = 12, periods = 12): CohortRow[] {
  const rnd = mulberry32(hash(tenantId + ':cohorts'));
  const rows: CohortRow[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const label = d.toISOString().slice(0, 7);
    const size = 120 + Math.floor(rnd() * 680);
    const available = Math.min(periods, i + 1);
    const retention: number[] = [100];
    let level = 100;
    for (let p = 1; p < available; p++) {
      const decay = p === 1 ? 0.42 + rnd() * 0.14 : 0.86 + rnd() * 0.1;
      level = Math.max(4, level * decay);
      retention.push(Math.round(level * 10) / 10);
    }
    rows.push({ cohort: label, size, retention });
  }
  return rows;
}