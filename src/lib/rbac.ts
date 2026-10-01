import type { Role } from '@/types';

export const ROLES: Role[] = ['owner', 'admin', 'editor', 'viewer'];

export const PERMISSIONS: Record<Role, string[]> = {
  owner: ['*'],
  admin: [
    'dashboard.view',
    'dashboard.edit',
    'metrics.view',
    'metrics.edit',
    'datasource.manage',
    'alerts.manage',
    'settings.manage',
    'export.data',
    'members.manage',
  ],
  editor: [
    'dashboard.view',
    'dashboard.edit',
    'metrics.view',
    'metrics.edit',
    'alerts.manage',
    'export.data',
  ],
  viewer: ['dashboard.view', 'metrics.view'],
};

export function can(role: Role, permission: string): boolean {
  const granted = PERMISSIONS[role] ?? [];
  return granted.includes('*') || granted.includes(permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};