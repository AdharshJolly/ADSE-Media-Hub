import type { DashboardStats } from '@/types/database';

type Seg = { label: string; value: number; color: string };

export function Donut({ segments, size = 128, center, sub }: { segments: Seg[]; size?: number; center: React.ReactNode; sub?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let acc = 0;
  const stops = total
    ? segments
        .filter((s) => s.value > 0)
        .map((s) => {
          const from = (acc / total) * 100;
          acc += s.value;
          return `${s.color} ${from}% ${(acc / total) * 100}%`;
        })
        .join(',')
    : 'var(--line) 0 100%';
  const inner = Math.round(size * 0.7);
  return (
    <div className="donut" style={{ width: size, height: size, background: `conic-gradient(${stops})` }} role="img" aria-label="Status breakdown">
      <div style={{ width: inner, height: inner }}>
        <div>
          <div className="t-num" style={{ fontSize: size > 110 ? 24 : 18 }}>{center}</div>
          {sub ? <span className="t-xs muted">{sub}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function Legend({ segments }: { segments: Seg[] }) {
  return (
    <div className="col grow" style={{ gap: 8, minWidth: 130 }}>
      {segments.map((s) => (
        <div key={s.label} className="legend">
          <i style={{ background: s.color }} />
          <span className="grow">{s.label}</span>
          <b className="mono" style={{ fontWeight: 500 }}>{s.value}</b>
        </div>
      ))}
    </div>
  );
}

export function taskSegments(s: DashboardStats['taskStats']): Seg[] {
  return [
    { label: 'Completed', value: s?.completed || 0, color: 'var(--s-done-dot)' },
    { label: 'In progress', value: s?.in_progress || 0, color: 'var(--s-prog-dot)' },
    { label: 'In review', value: s?.in_review || 0, color: 'var(--s-rev-dot)' },
    { label: 'Pending', value: s?.pending || 0, color: 'var(--s-pend-dot)' },
    { label: 'Overdue', value: s?.overdue || 0, color: 'var(--s-over-dot)' },
  ];
}

export function TaskStatusChart({ stats }: { stats: DashboardStats['taskStats'] }) {
  const segs = taskSegments(stats);
  return (
    <div className="row wrap" style={{ gap: 20 }}>
      <Donut segments={segs} center={stats?.total || 0} sub="tasks" />
      <Legend segments={segs} />
    </div>
  );
}

export function RequestStatusChart({ stats }: { stats: DashboardStats['requestStats'] }) {
  const rows: Seg[] = [
    { label: 'Completed', value: stats?.completed || 0, color: 'var(--s-done-dot)' },
    { label: 'Approved', value: stats?.approved || 0, color: 'var(--s-appr-dot)' },
    { label: 'Pending', value: stats?.pending || 0, color: 'var(--s-pend-dot)' },
    { label: 'Rejected', value: stats?.rejected || 0, color: 'var(--s-over-dot)' },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="col" style={{ gap: 14 }}>
      {rows.map((r) => (
        <div key={r.label} className="col" style={{ gap: 6 }}>
          <div className="sp t-sm">
            <span>{r.label}</span>
            <b className="mono" style={{ fontWeight: 500 }}>{r.value}</b>
          </div>
          <div className="bar">
            <i style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
