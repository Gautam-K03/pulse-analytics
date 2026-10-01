import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, BookOpenCheck, Command, Database, FileCheck2, LayoutDashboard, Moon,
  PanelLeftClose, PanelLeftOpen, Receipt, Settings, ShieldCheck, Sparkles, Sun, Users, UsersRound, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { can, ROLE_LABEL, ROLES } from '@/lib/rbac';
import { TENANTS, control } from '@/lib/mockApi';
import { remainingQueries } from '@/lib/nlq';
import { useAppStore } from '@/store';
import { useHotkey, useThemeSync } from '@/hooks';
import { Badge, Button, Select } from './ui';
import { CommandPalette } from './CommandPalette';

interface NavItem {
  to: string; label: string; icon: typeof LayoutDashboard; permission: string;
  end?: boolean; section: 'Analyze' | 'Operate' | 'Manage';
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', end: true, section: 'Analyze' },
  { to: '/query', label: 'Query workspace', icon: Wand2, permission: 'metrics.view', section: 'Analyze' },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'dashboard.view', section: 'Analyze' },
  { to: '/metrics', label: 'Metric catalog', icon: Activity, permission: 'metrics.view', section: 'Analyze' },

  { to: '/alerts', label: 'Alerts', icon: Bell, permission: 'alerts.manage', section: 'Operate' },
  { to: '/reports', label: 'Reports', icon: BookOpenCheck, permission: 'dashboard.view', section: 'Operate' },
  { to: '/data', label: 'Data sources', icon: Database, permission: 'datasource.manage', section: 'Operate' },
  { to: '/data-quality', label: 'Data quality', icon: FileCheck2, permission: 'datasource.manage', section: 'Operate' },

  { to: '/audit', label: 'Audit log', icon: ShieldCheck, permission: 'settings.manage', section: 'Manage' },
  { to: '/team', label: 'Team', icon: UsersRound, permission: 'members.manage', section: 'Manage' },
  { to: '/billing', label: 'Billing', icon: Receipt, permission: 'settings.manage', section: 'Manage' },
  { to: '/settings', label: 'Settings', icon: Settings, permission: 'settings.manage', section: 'Manage' },
];

export function AppShell() {
  useThemeSync();
  const navigate = useNavigate();
  const tenantId = useAppStore((s) => s.tenantId);
  const setTenant = useAppStore((s) => s.setTenant);
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const aiEnabled = useAppStore((s) => s.aiEnabled);

  const [paletteOpen, setPaletteOpen] = useState(false);
  useHotkey({ key: 'k', meta: true }, () => setPaletteOpen(true));

  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];
  const visibleNav = NAV.filter((item) => can(role, item.permission));

  return (
    <div className="flex h-full">
      <aside className={cn('flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900',
        collapsed ? 'w-[68px]' : 'w-60')}>
        <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4 dark:border-slate-800">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          {!collapsed ? <span className="truncate text-sm font-semibold tracking-tight">Pulse</span> : null}
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-2" aria-label="Main">
          {(['Analyze', 'Operate', 'Manage'] as const).map((section) => {
            const items = visibleNav.filter((i) => i.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section}>
                {!collapsed ? (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{section}</p>
                ) : (
                  <div className="mx-3 mb-1 border-t border-slate-100 dark:border-slate-800" />
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? item.label : undefined}
                        className={({ isActive }) => cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                          collapsed && 'justify-center px-0',
                        )}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-2 dark:border-slate-800">
          <button type="button" onClick={toggleSidebar}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <Select aria-label="Workspace" value={tenantId} onChange={(e) => { setTenant(e.target.value); navigate('/'); }} className="min-w-[10rem]">
            {TENANTS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>

          <Badge tone="neutral">{tenant.plan}</Badge>
          <Badge tone="neutral" className="hidden sm:inline-flex">{tenant.region}</Badge>

          {aiEnabled ? (
            <Badge tone="brand" className="hidden md:inline-flex"><Sparkles className="h-3 w-3" /> AI on</Badge>
          ) : (
            <Badge tone="neutral" className="hidden md:inline-flex">AI off</Badge>
          )}

          {aiEnabled ? (
            <Badge tone="neutral" className="hidden lg:inline-flex" >
              <Sparkles className="h-3 w-3" /> {remainingQueries(tenantId)} / 20
            </Badge>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 sm:flex dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Open command palette">
              <Command className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="rounded border border-slate-200 px-1 font-mono text-[10px] dark:border-slate-700">âŒ˜K</kbd>
            </button>

            <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}
              title="Demo control â€” in production this comes from your session">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>

            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export function usePermission(permission: string): boolean {
  const role = useAppStore((s) => s.role);
  return can(role, permission);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__pulseControl = control;
}