'use client';

interface ChartBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

function ChartBar({ label, value, maxValue, color }: ChartBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 text-right">{label}</span>
      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-foreground w-8">{value}</span>
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

function PieChart({ data, size = 120 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="text-muted-foreground text-sm">No data</div>;

  let currentAngle = 0;
  const segments = data
    .filter(item => item.value > 0)
    .map(item => {
      const angle = (item.value / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return { ...item, startAngle, angle };
    });

  const gradientParts = segments.map((seg, i) => {
    const start = seg.startAngle;
    const end = seg.startAngle + seg.angle;
    return `${seg.color} ${start}deg ${end}deg`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradientParts.join(', ')})`,
        }}
      />
      <div className="space-y-1">
        {data.filter(item => item.value > 0).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TaskStatusChartProps {
  stats: {
    pending: number;
    in_progress: number;
    completed: number;
    overdue: number;
  };
}

export function TaskStatusChart({ stats }: TaskStatusChartProps) {
  const maxValue = Math.max(stats.pending, stats.in_progress, stats.completed, stats.overdue, 1);

  return (
    <div className="space-y-3">
      <ChartBar label="Pending" value={stats.pending} maxValue={maxValue} color="bg-amber-500" />
      <ChartBar label="In Progress" value={stats.in_progress} maxValue={maxValue} color="bg-primary" />
      <ChartBar label="Completed" value={stats.completed} maxValue={maxValue} color="bg-emerald-500" />
      <ChartBar label="Overdue" value={stats.overdue} maxValue={maxValue} color="bg-red-500" />
    </div>
  );
}

export function TaskStatusPieChart({ stats }: TaskStatusChartProps) {
  const data = [
    { label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { label: 'In Progress', value: stats.in_progress, color: '#1e40af' },
    { label: 'Completed', value: stats.completed, color: '#10b981' },
    { label: 'Overdue', value: stats.overdue, color: '#ef4444' },
  ];

  return <PieChart data={data} />;
}

interface RequestStatusChartProps {
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  };
}

export function RequestStatusChart({ stats }: RequestStatusChartProps) {
  const data = [
    { label: 'Pending', value: stats.pending, color: '#f59e0b' },
    { label: 'Approved', value: stats.approved, color: '#10b981' },
    { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { label: 'Completed', value: stats.completed, color: '#3b82f6' },
  ];

  return <PieChart data={data} />;
}

interface UserRoleChartProps {
  stats: {
    coordinators: number;
    studentHeads: number;
    teamMembers: number;
    requestors: number;
  };
}

export function UserRoleChart({ stats }: UserRoleChartProps) {
  const maxValue = Math.max(stats.coordinators, stats.studentHeads, stats.teamMembers, stats.requestors, 1);

  return (
    <div className="space-y-3">
      <ChartBar label="Coordinators" value={stats.coordinators} maxValue={maxValue} color="bg-purple-500" />
      <ChartBar label="Student Heads" value={stats.studentHeads} maxValue={maxValue} color="bg-blue-500" />
      <ChartBar label="Team Members" value={stats.teamMembers} maxValue={maxValue} color="bg-orange-500" />
      <ChartBar label="Requestors" value={stats.requestors} maxValue={maxValue} color="bg-green-500" />
    </div>
  );
}
