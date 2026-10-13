'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Icon, Spinner } from '@/components/ui/kit';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, maintenance, logout, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.must_change_password) {
        router.push('/change-password');
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return <Spinner full />;
  }

  if (!user || user.must_change_password) {
    return null;
  }

  if (maintenance) {
    return (
      <div className="app" style={{ alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ maxWidth: 460, width: "100%", padding: 36, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, boxShadow: "var(--sh-3)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--primary-soft)", color: "var(--primary-text)", display: "grid", placeItems: "center", border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)" }}>
            <Icon name="wrench" size={30} />
          </div>
          <div className="col" style={{ gap: 8 }}>
            <h1 className="t-h1">We are tuning things up</h1>
            <p className="muted">ADSE Media Hub is in maintenance mode. Your requests and tasks are safe, and everything returns shortly.</p>
          </div>
          <div className="row" style={{ gap: 10, padding: "10px 14px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <span className="chip c-pend">Maintenance</span>
            <span className="t-sm muted">Only coordinators can sign in right now</span>
          </div>
          <div className="row wrap" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn-primary" onClick={() => refreshUser()}>Check again</button>
            <button type="button" className="btn" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
