import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Annotation, CrossFilter, Granularity, Role, SavedView, Widget } from './types';

const DAY = 86_400_000;
const iso = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'ytd' | 'custom';

export interface DateRange { from: string; to: string; preset: RangePreset; }

export function presetRange(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const to = iso(today);

  switch (preset) {
    case '7d': return { from: iso(today - 6 * DAY), to, preset };
    case '30d': return { from: iso(today - 29 * DAY), to, preset };
    case '90d': return { from: iso(today - 89 * DAY), to, preset };
    case '12m': return { from: iso(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)), to, preset };
    case 'ytd': return { from: iso(Date.UTC(now.getUTCFullYear(), 0, 1)), to, preset };
  }
}

export function defaultGranularity(preset: RangePreset): Granularity {
  if (preset === '7d' || preset === '30d') return 'day';
  if (preset === '90d') return 'week';
  return 'month';
}

export const RANGE_PRESETS: Array<{ id: Exclude<RangePreset, 'custom'>; label: string }> = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'ytd', label: 'Year to date' },
];

interface AppState {
  tenantId: string;
  role: Role;
  theme: 'light' | 'dark';
  range: DateRange;
  granularity: Granularity;
  segment: string;
  compare: boolean;
  sidebarCollapsed: boolean;
  aiEnabled: boolean;

  setTenant: (id: string) => void;
  setRole: (role: Role) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setRange: (range: DateRange) => void;
  setPreset: (preset: Exclude<RangePreset, 'custom'>) => void;
  setGranularity: (g: Granularity) => void;
  setSegment: (s: string) => void;
  setCompare: (v: boolean) => void;
  toggleSidebar: () => void;
  setAiEnabled: (v: boolean) => void;
}

const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tenantId: 'acme',
      role: 'owner',
      theme: prefersDark ? 'dark' : 'light',
      range: presetRange('90d'),
      granularity: 'week',
      segment: 'all',
      compare: true,
      sidebarCollapsed: false,
      aiEnabled: true,

      setTenant: (tenantId) => set({ tenantId }),
      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setRange: (range) => set({ range, granularity: defaultGranularity(range.preset) }),
      setPreset: (preset) => { const range = presetRange(preset); set({ range, granularity: defaultGranularity(preset) }); },
      setGranularity: (granularity) => set({ granularity }),
      setSegment: (segment) => set({ segment }),
      setCompare: (compare) => set({ compare }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
    }),
    {
      name: 'pulse-app',
      partialize: (s) => ({
        tenantId: s.tenantId, role: s.role, theme: s.theme, range: s.range,
        granularity: s.granularity, segment: s.segment, compare: s.compare,
        sidebarCollapsed: s.sidebarCollapsed, aiEnabled: s.aiEnabled,
      }),
    },
  ),
);

export const DEFAULT_WIDGETS: Widget[] = [
  { id: 'w-mrr', type: 'kpi', metricId: 'mrr', span: 1 },
  { id: 'w-users', type: 'kpi', metricId: 'active_users', span: 1 },
  { id: 'w-churn', type: 'kpi', metricId: 'churn_rate', span: 1 },
  { id: 'w-trials', type: 'kpi', metricId: 'trial_conversions', span: 1 },
  { id: 'w-line', type: 'line', metricId: 'mrr', span: 3 },
  { id: 'w-table', type: 'table', metricId: 'mrr', span: 1 },
  { id: 'w-bar', type: 'bar', metricId: 'expansion_revenue', span: 2 },
  { id: 'w-line-2', type: 'line', metricId: 'active_users', span: 2 },
];

interface DashboardState {
  widgetsByTenant: Record<string, Widget[]>;
  addWidget: (tenantId: string, widget: Omit<Widget, 'id'>) => void;
  removeWidget: (tenantId: string, id: string) => void;
  moveWidget: (tenantId: string, from: number, to: number) => void;
  updateWidget: (tenantId: string, id: string, patch: Partial<Widget>) => void;
  resetWidgets: (tenantId: string) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgetsByTenant: {},
      addWidget: (tenantId, widget) => {
        const current = get().widgetsByTenant[tenantId] ?? DEFAULT_WIDGETS;
        const id = `w-${Date.now().toString(36)}`;
        set({ widgetsByTenant: { ...get().widgetsByTenant, [tenantId]: [...current, { ...widget, id }] } });
      },
      removeWidget: (tenantId, id) => {
        const current = get().widgetsByTenant[tenantId] ?? DEFAULT_WIDGETS;
        set({ widgetsByTenant: { ...get().widgetsByTenant, [tenantId]: current.filter((w) => w.id !== id) } });
      },
      moveWidget: (tenantId, from, to) => {
        const current = [...(get().widgetsByTenant[tenantId] ?? DEFAULT_WIDGETS)];
        if (from < 0 || to < 0 || from >= current.length || to >= current.length || from === to) return;
        const [moved] = current.splice(from, 1);
        current.splice(to, 0, moved);
        set({ widgetsByTenant: { ...get().widgetsByTenant, [tenantId]: current } });
      },
      updateWidget: (tenantId, id, patch) => {
        const current = get().widgetsByTenant[tenantId] ?? DEFAULT_WIDGETS;
        set({ widgetsByTenant: { ...get().widgetsByTenant, [tenantId]: current.map((w) => (w.id === id ? { ...w, ...patch } : w)) } });
      },
      resetWidgets: (tenantId) => { set({ widgetsByTenant: { ...get().widgetsByTenant, [tenantId]: DEFAULT_WIDGETS } }); },
    }),
    { name: 'pulse-dashboard' },
  ),
);

export function useWidgets(): Widget[] {
  const tenantId = useAppStore((s) => s.tenantId);
  return useDashboardStore((s) => s.widgetsByTenant[tenantId]) ?? DEFAULT_WIDGETS;
}

interface ViewsState {
  viewsByTenant: Record<string, SavedView[]>;
  saveView: (v: Omit<SavedView, 'id' | 'createdAt'>) => void;
  deleteView: (tenantId: string, id: string) => void;
  togglePin: (tenantId: string, id: string) => void;
  applyView: (view: SavedView) => void;
}

export const useViewsStore = create<ViewsState>()(
  persist(
    (set, get) => ({
      viewsByTenant: {},
      saveView: (view) => {
        const id = `view_${Date.now().toString(36)}`;
        const list = get().viewsByTenant[view.tenantId] ?? [];
        set({ viewsByTenant: { ...get().viewsByTenant, [view.tenantId]: [{ ...view, id, createdAt: new Date().toISOString() }, ...list].slice(0, 20) } });
      },
      deleteView: (tenantId, id) => {
        const list = get().viewsByTenant[tenantId] ?? [];
        set({ viewsByTenant: { ...get().viewsByTenant, [tenantId]: list.filter((v) => v.id !== id) } });
      },
      togglePin: (tenantId, id) => {
        const list = get().viewsByTenant[tenantId] ?? [];
        set({ viewsByTenant: { ...get().viewsByTenant, [tenantId]: list.map((v) => (v.id === id ? { ...v, pinned: !v.pinned } : v)) } });
      },
      applyView: (view) => {
        useAppStore.setState({
          range: { from: view.range.from, to: view.range.to, preset: view.range.preset as RangePreset },
          granularity: view.granularity, segment: view.segment, compare: view.compare,
        });
      },
    }),
    { name: 'pulse-views' },
  ),
);

interface AnnotationsState {
  annotations: Annotation[];
  addAnnotation: (a: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeAnnotation: (id: string) => void;
  forMetric: (tenantId: string, metricId: string) => Annotation[];
}

export const useAnnotationsStore = create<AnnotationsState>()(
  persist(
    (set, get) => ({
      annotations: [],
      addAnnotation: (a) => set({ annotations: [...get().annotations, { ...a, id: `ann_${Date.now().toString(36)}`, createdAt: new Date().toISOString() }] }),
      removeAnnotation: (id) => set({ annotations: get().annotations.filter((a) => a.id !== id) }),
      forMetric: (tenantId, metricId) => get().annotations.filter((a) => a.tenantId === tenantId && a.metricId === metricId),
    }),
    { name: 'pulse-annotations' },
  ),
);

interface CrossFilterState {
  filter: CrossFilter | null;
  setFilter: (f: CrossFilter | null) => void;
  clear: () => void;
}

export const useCrossFilterStore = create<CrossFilterState>()((set) => ({
  filter: null,
  setFilter: (filter) => set({ filter }),
  clear: () => set({ filter: null }),
}));

interface OnboardingState {
  dismissedByTenant: Record<string, boolean>;
  completedByTenant: Record<string, string[]>;
  dismiss: (tenantId: string) => void;
  completeStep: (tenantId: string, stepId: string) => void;
  reset: (tenantId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      dismissedByTenant: {},
      completedByTenant: {},
      dismiss: (tenantId) => set({ dismissedByTenant: { ...get().dismissedByTenant, [tenantId]: true } }),
      completeStep: (tenantId, stepId) => {
        const done = get().completedByTenant[tenantId] ?? [];
        if (done.includes(stepId)) return;
        set({ completedByTenant: { ...get().completedByTenant, [tenantId]: [...done, stepId] } });
      },
      reset: (tenantId) => set({
        dismissedByTenant: { ...get().dismissedByTenant, [tenantId]: false },
        completedByTenant: { ...get().completedByTenant, [tenantId]: [] },
      }),
    }),
    { name: 'pulse-onboarding' },
  ),
);