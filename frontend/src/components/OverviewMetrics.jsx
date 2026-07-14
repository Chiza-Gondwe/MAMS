// components/OverviewMetrics.jsx
import { Users, UserCheck, TrendingUp, MessageCircle } from 'lucide-react';

const metrics = [
  { label: 'Total Members', key: 'totalMembers', icon: Users },
  { label: 'Active Members', key: 'activeMembers', icon: UserCheck },
  { label: 'Total Attendance Sessions', key: 'attendanceCount', icon: TrendingUp },
  { label: 'Total Announcements', key: 'totalAnnouncements', icon: MessageCircle},
];

export default function OverviewMetrics({ stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-200 pb-6 mb-6">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{metric.label}</p>
              <p className="text-2xl font-semibold text-slate-800 mt-2">
                {metric.suffix ? `${stats[metric.key] || 0}${metric.suffix}` : (stats[metric.key] || 0)}
              </p>
            </div>
            <div className="p-3 bg-sky-50 rounded-lg">
              <metric.icon className="w-6 h-6 text-sky-600" strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}