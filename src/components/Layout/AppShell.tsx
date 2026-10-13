'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Avatar, Icon, ROLE_LABEL, type IconName } from '@/components/ui/kit';
import BrandLogo from '@/components/ui/BrandLogo';
import GlobalSearch from './GlobalSearch';

type NavKey = 'home' | 'tasks' | 'requests' | 'cal' | 'users' | 'admin' | 'alerts';

const NAV: Record<NavKey, { href: string; icon: IconName; label: string; tab: string }> = {
  home: { href: '/dashboard', icon: 'home', label: 'Dashboard', tab: 'Home' },
  tasks: { href: '/tasks', icon: 'tasks', label: 'Tasks', tab: 'Tasks' },
  requests: { href: '/requests', icon: 'inbox', label: 'Requests', tab: 'Requests' },
  cal: { href: '/calendar', icon: 'cal', label: 'Calendar', tab: 'Calendar' },
  users: { href: '/users', icon: 'users', label: 'Users', tab: 'Users' },
  admin: { href: '/admin', icon: 'sliders', label: 'Admin', tab: 'Admin' },
  alerts: { href: '/notifications', icon: 'bell', label: 'Notifications', tab: 'Alerts' },
};

const ROLE_NAV: Record<string, { nav: NavKey[]; tabs: NavKey[] }> = {
  coordinator: { nav: ['home', 'tasks', 'requests', 'cal', 'users', 'admin', 'alerts'], tabs: ['home', 'tasks', 'requests', 'users', 'admin'] },
  student_head: { nav: ['home', 'tasks', 'requests', 'cal', 'alerts'], tabs: ['home', 'tasks', 'requests', 'cal', 'alerts'] },
  requestor: { nav: ['home', 'requests', 'cal', 'alerts'], tabs: ['home', 'requests', 'cal', 'alerts'] },
  team_member: { nav: ['home', 'tasks', 'cal', 'alerts'], tabs: ['home', 'tasks', 'cal', 'alerts'] },
};

function label(role: string, k: NavKey) {
  if (role === 'requestor' && k === 'requests') return 'My requests';
  if (role === 'team_member' && k === 'tasks') return 'My tasks';
  return NAV[k].label;
}

function tabLabel(role: string, k: NavKey) {
  if (role === 'team_member' && k === 'tasks') return 'My tasks';
  return NAV[k].tab;
}

function pageTitle(role: string, pathname: string) {
  const hit = (Object.keys(NAV) as NavKey[]).find((k) => pathname === NAV[k].href || pathname.startsWith(NAV[k].href + '/'));
  if (pathname.startsWith('/tasks/new')) return 'New task';
  if (pathname.startsWith('/requests/new')) return 'New request';
  return hit ? label(role, hit) : 'ADSE Media Hub';
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, isCoordinator, isStudentHead } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [pending, setPending] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('hub:sb-collapsed') === '1');
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem('hub:sb-collapsed', c ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      return !c;
    });

  const role = user?.role ?? 'requestor';
  const cfg = ROLE_NAV[role] ?? ROLE_NAV.requestor;
  const staff = isCoordinator || isStudentHead;

  const poll = useCallback(async () => {
    if (document.hidden) return;
    try {
      const r = await fetch('/api/notifications?unreadOnly=true');
      const d = await r.json();
      if (d.success) setUnread(d.unreadCount);
      if (staff) {
        const rr = await fetch('/api/requests?status=pending&pageSize=1');
        const dd = await rr.json();
        if (dd.success) setPending(dd.count ?? 0);
      }
    } catch {
      /* ignore transient network errors */
    }
  }, [staff]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 60000);
    const onVis = () => !document.hidden && poll();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('hub:refresh-counts', poll);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('hub:refresh-counts', poll);
    };
  }, [poll]);

  // refresh counts on navigation, close drawer
  useEffect(() => {
    setDrawer(false);
    poll();
  }, [pathname, poll]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  const isActive = (k: NavKey) => {
    const h = NAV[k].href;
    if (pathname === h || pathname.startsWith(h + '/')) {
      // "New task"/"New request" still highlight their parent list
      return true;
    }
    return false;
  };

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const count = (k: NavKey) => (k === 'requests' && pending > 0 && staff ? pending : k === 'alerts' && unread > 0 ? unread : 0);

  const navLinks = (onNav?: () => void) =>
    cfg.nav.map((k) => (
      <Link key={k} href={NAV[k].href} className={`nav${isActive(k) ? ' active' : ''}`} onClick={onNav} title={label(role, k)}>
        <Icon name={NAV[k].icon} />
        <span className="nav-l">{label(role, k)}</span>
        {count(k) ? <span className="count">{count(k)}</span> : null}
      </Link>
    ));

  const userBlock = (
    <div className="sb-user">
      <Avatar name={user?.name} />
      <div className="col grow" style={{ minWidth: 0 }}>
        <b className="trunc t-sm">{user?.name}</b>
        <span className="t-xs muted">{ROLE_LABEL[role]}</span>
      </div>
      <button type="button" className="sb-out" onClick={logout} aria-label="Sign out" title="Sign out" style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }}>
        <Icon name="logout" />
      </button>
    </div>
  );

  const brandBlock = (compact: boolean) => (
    <div className="brand">
      {compact ? <BrandLogo variant="icon" height={44} /> : <BrandLogo height={66} />}
    </div>
  );

  return (
    <div className="app">
      <aside className={`sb${collapsed ? ' collapsed' : ''}`}>
        {brandBlock(collapsed)}
        {navLinks()}
        <button type="button" className="nav sb-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name="sidebar" />
          <span className="nav-l">Collapse</span>
        </button>
        {userBlock}
      </aside>

      <main className="main">
        <header className="dtop">
          <GlobalSearch role={role} />
          <div className="row">
            <button type="button" className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme}>
              <Icon name="theme" />
            </button>
            <Link href="/notifications" className="icon-btn" aria-label="Notifications">
              <Icon name="bell" />
              {unread > 0 ? <i className="dot" /> : null}
            </Link>
          </div>
        </header>

        <header className="mtop">
          <div className="row" style={{ gap: 10 }}>
            <BrandLogo variant="icon" height={30} />
            <b style={{ fontSize: 16, fontWeight: 600 }}>{pageTitle(role, pathname)}</b>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Link href="/notifications" className="icon-btn" aria-label="Notifications">
              <Icon name="bell" />
              {unread > 0 ? <i className="dot" /> : null}
            </Link>
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" style={{ display: 'grid', placeItems: 'center' }}>
              <Avatar name={user?.name} />
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>

      <nav className="tabbar" aria-label="Primary">
        {cfg.tabs.map((k) => (
          <Link key={k} href={NAV[k].href} className={isActive(k) ? 'active' : ''}>
            <Icon name={NAV[k].icon} />
            {tabLabel(role, k)}
          </Link>
        ))}
      </nav>

      {drawer ? (
        <div className="sheet-nav" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <aside>
            {brandBlock(true)}
            {navLinks(() => setDrawer(false))}
            <button type="button" className="nav" onClick={toggleTheme}>
              <Icon name="theme" />
              {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            {userBlock}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
