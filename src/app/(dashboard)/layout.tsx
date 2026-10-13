'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import AppShell from '@/components/Layout/AppShell';

// Pages that only some roles may open. Data is also protected server-side;
// this keeps other roles from landing on an empty shell.
const ROUTE_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/users', roles: ['coordinator'] },
  { prefix: '/admin', roles: ['coordinator'] },
  { prefix: '/tasks/new', roles: ['coordinator', 'student_head'] },
  { prefix: '/requests', roles: ['coordinator', 'student_head', 'requestor'] },
  { prefix: '/tasks', roles: ['coordinator', 'student_head', 'team_member'] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'));

  return (
    <ProtectedRoute allowedRoles={rule?.roles}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
