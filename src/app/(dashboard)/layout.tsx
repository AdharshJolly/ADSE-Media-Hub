'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
