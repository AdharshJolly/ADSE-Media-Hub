import type { CSSProperties } from 'react';

export function Skeleton({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  return <div className={`sk ${className}`} style={style} aria-hidden="true" />;
}

export function StatCardSkeleton() {
  return (
    <div className="card stat">
      <Skeleton style={{ height: 14, width: 96 }} />
      <Skeleton style={{ height: 30, width: 56 }} />
      <Skeleton style={{ height: 12, width: 80 }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', gap: 16 }}>
          <Skeleton style={{ height: 14, flex: 2 }} />
          <Skeleton style={{ height: 14, flex: 1 }} />
          <Skeleton style={{ height: 14, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card card-p col" style={{ gap: 12 }}>
      <Skeleton style={{ height: 18, width: 160 }} />
      <Skeleton style={{ height: 14 }} />
      <Skeleton style={{ height: 14, width: '70%' }} />
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', gap: 12 }}>
          <Skeleton style={{ height: 36, width: 36, borderRadius: 99 }} />
          <div className="col grow" style={{ gap: 6 }}>
            <Skeleton style={{ height: 14, width: '55%' }} />
            <Skeleton style={{ height: 12, width: '35%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
