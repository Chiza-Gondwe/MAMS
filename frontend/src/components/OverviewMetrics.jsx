// components/OverviewMetrics.jsx
import { Users, UserCheck, TrendingUp, MessageCircle } from 'lucide-react';

const metrics = [
  { label: 'Total Members', key: 'total', icon: Users },
  { label: 'Active Members', key: 'active', icon: UserCheck },
  { label: 'Attendance Rate', key: 'attendanceRate', icon: TrendingUp },
  { label: 'Pending Announcements', key: 'pending', icon: MessageCircle},
];

export default function OverviewMetrics({ stats }) {
  return (
    <div className="grid grid-cols-4 gap-0 border-b border-slate-200">
      {metrics.map((metric, idx) => (
        <div key={metric.label} className={`py-5 px-0 ${idx < 3 ? 'border-r border-slate-200' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{metric.label}</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">
                {metric.suffix ? `${stats[metric.key]}${metric.suffix}` : stats[metric.key]}
              </p>
            </div>
            <metric.icon className="w-8 h-8 text-sky-800/60" strokeWidth={1.5} />
          </div>
        </div>
      ))}
    </div>
  );
}