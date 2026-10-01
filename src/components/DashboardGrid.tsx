import { useState, type ReactNode } from 'react';
import { GripVertical, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Widget } from '@/types';
import { cn } from '@/lib/cn';
import { DEFAULT_WIDGETS, useAppStore, useDashboardStore, useWidgets } from '@/store';
import { METRIC_MAP, METRICS } from '@/lib/metrics';
import { useMetricSeries, useLiveMetric } from '@/hooks';
import { Badge, Button, Card, EmptyState } from './ui';
import { ChartStateWrapper, KpiCard, MetricBarChart, MetricLineChart } from './charts';
import { CustomerMiniTable } from './CustomerTable';

const SPAN_CLASS: Record<Widget['span'], string> = {
  1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4',
};

function WidgetFrame({ widget, index, onDragStart, onDrop, onRemove, canEdit, children }: {
  widget: Widget; index: number; onDragStart: (index: number) => void;
  onDrop: (index: number) => void; onRemove: (id: string) => void;
  canEdit: boolean; children: ReactNode;
}) {
  const metric = METRIC_MAP[widget.metricId];
  return (
    <Card className={cn('group relative flex flex-col overflow-hidden animate-fade-in', SPAN_CLASS[widget.span])}
      onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(index)}>
      {widget.type !== 'kpi' ? (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {canEdit ? (
                <span draggable onDragStart={() => onDragStart(index)}
                  className="cursor-grab text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600"
                  title="Drag to reorder" aria-hidden="true">
                  <GripVertical className="h-4 w-4" />
                </span>
              ) : null}
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{metric?.label ?? widget.metricId}</h3>
              {metric?.certified ? <Badge tone="brand">certified</Badge> : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{metric?.description}</p>
          </div>
          {canEdit ? (
            <Button variant="ghost" size="icon" aria-label={`Remove ${metric?.label ?? 'widget'}`}
              onClick={() => onRemove(widget.id)} className="opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function WidgetBody({ widget }: { widget: Widget }) {
  const query = useMetricSeries(widget.metricId);
  const metric = METRIC_MAP[widget.metricId];
  const live = useLiveMetric(widget.metricId, widget.type === 'kpi');

  if (!metric) return <EmptyState title="Unknown metric" description={`"${widget.metricId}" is not in the semantic layer catalog.`} />;
  if (widget.type === 'table') return <CustomerMiniTable />;

  return (
    <ChartStateWrapper
      isLoading={query.isLoading} isError={query.isError} error={query.error}
      onRetry={() => query.refetch()}
      isEmpty={!!query.data && query.data.points.length === 0}
      height={widget.type === 'kpi' ? 168 : 300}>
      {query.data ? (
        widget.type === 'kpi' ? (
          <KpiCard series={query.data} metric={metric} liveValue={live.tick?.value ?? null} liveStatus={live.status} />
        ) : widget.type === 'bar' ? (
          <MetricBarChart series={query.data} metric={metric} height={300} />
        ) : (
          <MetricLineChart series={query.data} metric={metric} height={300} />
        )
      ) : null}
    </ChartStateWrapper>
  );
}

function AddWidgetMenu({ onClose }: { onClose: () => void }) {
  const tenantId = useAppStore((s) => s.tenantId);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const options: Array<{ type: Widget['type']; label: string; span: Widget['span'] }> = [
    { type: 'kpi', label: 'KPI card', span: 1 },
    { type: 'line', label: 'Line chart', span: 2 },
    { type: 'bar', label: 'Bar chart', span: 2 },
    { type: 'table', label: 'Customer table', span: 2 },
  ];
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Add widget</p>
        <div className="max-h-72 overflow-y-auto">
          {options.map((option) => (
            <div key={option.type} className="mb-1 last:mb-0">
              <p className="px-2 py-1 text-[11px] text-slate-400">{option.label}</p>
              {METRICS.slice(0, 6).map((metric) => (
                <button key={`${option.type}-${metric.id}`} type="button"
                  onClick={() => { addWidget(tenantId, { type: option.type, metricId: metric.id, span: option.span }); onClose(); }}
                  className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  {metric.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function DashboardGrid({ canEdit }: { canEdit: boolean }) {
  const tenantId = useAppStore((s) => s.tenantId);
  const widgets = useWidgets();
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const resetWidgets = useDashboardStore((s) => s.resetWidgets);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const visible = widgets ?? DEFAULT_WIDGETS;

  if (visible.length === 0) {
    return (
      <Card>
        <EmptyState title="Your dashboard is empty" description="Add a widget to start tracking the metrics that matter for this workspace."
          action={
            <div className="relative inline-block">
              <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add your first widget
              </Button>
              {addOpen ? <AddWidgetMenu onClose={() => setAddOpen(false)} /> : null}
            </div>
          } />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">Drag the handle on a card to reorder. Layout is saved per workspace.</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => resetWidgets(tenantId)}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset layout
            </Button>
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setAddOpen((v) => !v)}>
                <Plus className="h-3.5 w-3.5" /> Add widget
              </Button>
              {addOpen ? <AddWidgetMenu onClose={() => setAddOpen(false)} /> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((widget, index) => (
          <WidgetFrame key={widget.id} widget={widget} index={index} canEdit={canEdit}
            onDragStart={setDragIndex}
            onDrop={(target) => { if (dragIndex != null && dragIndex !== target) moveWidget(tenantId, dragIndex, target); setDragIndex(null); }}
            onRemove={(id) => removeWidget(tenantId, id)}>
            <WidgetBody widget={widget} />
          </WidgetFrame>
        ))}
      </div>
    </div>
  );
}