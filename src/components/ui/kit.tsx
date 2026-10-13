import type { ReactNode, CSSProperties } from 'react';
import AnimatedLogo from './AnimatedLogo';

// ---------- icons ----------
export const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  tasks: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9',
  inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 3h4l1-3h5',
  cal: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2zM8 3v4M16 3v4M4 11h16',
  users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  bell: 'M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 004 0',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
  logout: 'M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3M16 8l4 4-4 4M20 12H9',
  down: 'M6 9l6 6 6-6',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  check: 'M5 12l5 5L20 7',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  msg: 'M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sheet: 'M4 4h16v16H4zM4 10h16M10 4v16',
  refresh: 'M20 11a8 8 0 00-14.9-3M4 4v4h4M4 13a8 8 0 0014.9 3M20 20v-4h-4',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  userplus: 'M15 19v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M8.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19 8v6M22 11h-6',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  theme: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v18',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  wrench: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  key: 'M14 10a5 5 0 11-3.5 8.5L3 21v-3l3-3h3v-3l2.5-2.5A5 5 0 0114 10zM17 8h.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sidebar: 'M3 4h18v16H3zM9 4v16',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={size ? { width: size, height: size, ...style } : style}>
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---------- status, priority, people ----------
export type StatusKey = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'approved' | 'rejected' | 'inactive' | 'active';

const CHIP: Record<StatusKey, [string, string]> = {
  pending: ['c-pend', 'Pending'],
  in_progress: ['c-prog', 'In progress'],
  completed: ['c-done', 'Completed'],
  overdue: ['c-over', 'Overdue'],
  approved: ['c-appr', 'Approved'],
  rejected: ['c-over', 'Rejected'],
  inactive: ['c-neutral', 'Inactive'],
  active: ['c-done', 'Active'],
};

export function Chip({ status, label }: { status: StatusKey | string; label?: string }) {
  const c = CHIP[status as StatusKey] ?? ['c-neutral', status];
  return <span className={`chip ${c[0]}`}>{label ?? c[1]}</span>;
}

export function Pri({ level }: { level: string }) {
  const l = (level || 'medium').toLowerCase();
  return (
    <span className={`pri ${l}`}>
      <i />
      {l.charAt(0).toUpperCase() + l.slice(1)}
    </span>
  );
}

export const MEDIA_LABEL: Record<string, string> = {
  graphic_design: 'Graphic Design',
  photography: 'Photography',
  video_production: 'Video Production',
};

export function TypeTag({ type }: { type: string }) {
  return <span className="tag">{MEDIA_LABEL[type] ?? type}</span>;
}

export function initials(name?: string) {
  if (!name) return '?';
  const p = name.replace(/\./g, '').trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

export function Avatar({ name, size }: { name?: string; size?: 'sm' | 'lg' }) {
  return <span className={`av ${size ?? ''}`}>{initials(name)}</span>;
}

export const ROLE_LABEL: Record<string, string> = {
  coordinator: 'Coordinator',
  student_head: 'Student head',
  requestor: 'Requestor',
  team_member: 'Team member',
};

// ---------- layout atoms ----------
export function PageHead({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="t-h1">{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="row wrap">{actions}</div> : null}
    </div>
  );
}

export function CardHead({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-h">
      <h2 className="t-h2">{title}</h2>
      {right}
    </div>
  );
}

export function Stat({ icon, label, value, note }: { icon: IconName; label: string; value: ReactNode; note?: string }) {
  return (
    <div className="card stat">
      <div className="row">
        <span className="ico">
          <Icon name={icon} />
        </span>
        <small className="grow">{label}</small>
      </div>
      <div className="t-num">{value}</div>
      {note ? <span className="t-xs muted">{note}</span> : null}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="ico">
        <Icon name={icon} />
      </span>
      <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</b>
      {text ? <span className="t-sm">{text}</span> : null}
      {action}
    </div>
  );
}

export function Spinner({ full }: { full?: boolean }) {
  if (full) {
    return (
      <div role="status" aria-label="Loading" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
        <AnimatedLogo width={560} />
      </div>
    );
  }
  return (
    <div style={{ padding: 32, display: 'grid', placeItems: 'center' }}>
      <div className="spin" role="status" aria-label="Loading" />
    </div>
  );
}

export function Modal({ title, children, onClose, footer }: { title: ReactNode; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="modal">
        <div className="sp">
          <h2 className="t-h2">{title}</h2>
          <button type="button" className="icon-btn" style={{ width: 36, height: 36, boxShadow: 'none' }} onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        {children}
        {footer ? <div className="row wrap" style={{ justifyContent: 'flex-end' }}>{footer}</div> : null}
      </div>
    </div>
  );
}

export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />;
}

export function fmtDate(d?: string | null, withTime = true) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const date = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return withTime ? `${date}, ${time}` : date;
}

export function fmtAgo(d?: string | null) {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(d, false);
}
