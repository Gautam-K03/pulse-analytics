import type { ReportFormat, ScheduledReport, MetricSeries, TableRow } from '@/types';

export const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'rep_exec', tenantId: 'acme', name: 'Weekly executive digest', format: 'pdf', cadence: 'weekly', recipients: ['cfo@acme.com', 'ceo@acme.com'], nextRun: new Date(Date.now() + 2 * 86_400_000).toISOString(), lastRun: new Date(Date.now() - 5 * 86_400_000).toISOString(), status: 'active', dashboardId: 'overview' },
  { id: 'rep_rev', tenantId: 'acme', name: 'Monthly revenue breakdown', format: 'xlsx', cadence: 'monthly', recipients: ['finance@acme.com'], nextRun: new Date(Date.now() + 12 * 86_400_000).toISOString(), lastRun: new Date(Date.now() - 18 * 86_400_000).toISOString(), status: 'active', dashboardId: 'overview' },
  { id: 'rep_churn', tenantId: 'acme', name: 'Daily churn watch', format: 'csv', cadence: 'daily', recipients: ['growth@acme.com', 'cs@acme.com'], nextRun: new Date(Date.now() + 8 * 3600_000).toISOString(), lastRun: new Date(Date.now() - 16 * 3600_000).toISOString(), status: 'paused', dashboardId: 'overview' },
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportSeriesCsv(series: MetricSeries, metricLabel: string) {
  const header = ['date', metricLabel, 'previous_period'];
  const rows = series.points.map((p) => [p.t, p.value, p.compare ?? '']);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${series.metricId}-${series.granularity}.csv`);
}

export function exportTableCsv(rows: TableRow[], filename = 'customers.csv') {
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]) as Array<keyof TableRow>;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(','))].join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportPdfReport(title: string, sections: Array<{ heading: string; rows: Array<[string, string]> }>) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#0f172a;padding:40px;max-width:760px;margin:0 auto}
    h1{font-size:22px;margin:0 0 4px}
    .meta{color:#64748b;font-size:12px;margin-bottom:28px}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{padding:6px 0;border-bottom:1px solid #f1f5f9}
    td:last-child{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
    .footer{margin-top:40px;color:#94a3b8;font-size:11px}
  </style></head><body>
    <h1>${title}</h1>
    <p class="meta">Generated ${new Date().toLocaleString()}</p>
    ${sections.map((s) => `<h2>${s.heading}</h2><table>${s.rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`).join('')}
    <p class="footer">Confidential â€” contains tenant-scoped business metrics.</p>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

export function exportSpreadsheet(title: string, sheets: Array<{ name: string; rows: Array<Record<string, unknown>> }>) {
  const escape = (s: unknown) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const sheetXml = sheets.map((sheet) => {
    const keys = sheet.rows.length ? Object.keys(sheet.rows[0]) : [];
    const header = `<Row>${keys.map((k) => `<Cell><Data ss:Type="String">${escape(k)}</Data></Cell>`).join('')}</Row>`;
    const body = sheet.rows.map((row) => {
      const cells = keys.map((k) => {
        const v = row[k];
        const type = typeof v === 'number' ? 'Number' : 'String';
        return `<Cell><Data ss:Type="${type}">${escape(v)}</Data></Cell>`;
      }).join('');
      return `<Row>${cells}</Row>`;
    }).join('');
    return `<Worksheet ss:Name="${escape(sheet.name)}"><Table>${header}${body}</Table></Worksheet>`;
  }).join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheetXml}
</Workbook>`;

  download(new Blob([xml], { type: 'application/vnd.ms-excel' }), `${title.replace(/\s+/g, '-').toLowerCase()}.xls`);
}

export function exportJson(payload: unknown, filename: string) {
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), filename);
}