import { latestValue } from './mockApi';

export interface LiveEvent { metricId: string; value: number; t: string; }
export type LiveStatus = 'connecting' | 'open' | 'closed';

type EventListener = (e: LiveEvent) => void;
type StatusListener = (s: LiveStatus) => void;

interface Sub { tenantId: string; metricId: string; onEvent: EventListener; onStatus: StatusListener; }

class LiveFeed {
  private timer: number | null = null;
  private subs = new Map<string, Sub>();
  private seq = 0;

  subscribe(tenantId: string, metricId: string, onEvent: EventListener, onStatus: StatusListener): () => void {
    const id = `sub_${++this.seq}`;
    onStatus('connecting');
    this.subs.set(id, { tenantId, metricId, onEvent, onStatus });

    window.setTimeout(() => {
      const sub = this.subs.get(id);
      if (sub) sub.onStatus('open');
    }, 350 + Math.random() * 700);

    this.ensureTimer();

    return () => {
      this.subs.delete(id);
      if (this.subs.size === 0) this.stop();
    };
  }

  private ensureTimer() {
    if (this.timer == null) this.timer = window.setInterval(() => this.tick(), 3000);
  }

  private stop() {
    if (this.timer != null) { window.clearInterval(this.timer); this.timer = null; }
  }

  private tick() {
    if (Math.random() < 0.02) {
      for (const sub of this.subs.values()) sub.onStatus('closed');
      window.setTimeout(() => { for (const sub of this.subs.values()) sub.onStatus('open'); }, 1600);
      return;
    }
    for (const sub of this.subs.values()) {
      const base = latestValue(sub.tenantId, sub.metricId);
      const jitter = 1 + (Math.random() - 0.5) * 0.012;
      sub.onEvent({ metricId: sub.metricId, value: base * jitter, t: new Date().toISOString() });
    }
  }
}

export const liveFeed = new LiveFeed();