// components/AnalyticsSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Users, DollarSign } from 'lucide-react';

const COLORS = ['#0ea5e9', '#d946ef', '#94a3b8']; // Blue (Male), Pink (Female), Gray (Unspecified)

export default function AnalyticsSection() {
  const [data, setData] = useState({ demographics: [], attendance_trend: [], financial_trend: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(res => {
      setData(res);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Advanced Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Deep insights into your church's growth and health.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">12-Month Attendance</h3>
          </div>
          <div className="h-72 w-full">
            {data.attendance_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data to display trend</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.attendance_trend} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Financial Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">Donations Overview</h3>
          </div>
          <div className="h-72 w-full">
            {data.financial_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Not enough data to display trend</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.financial_trend} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => `$${val}`} />
                  <Bar dataKey="amount" name="Donations" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Member Demographics */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 text-lg">Member Demographics</h3>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            {data.demographics.reduce((acc, curr) => acc + curr.value, 0) === 0 ? (
              <div className="text-slate-400 text-sm">No members registered yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.demographics}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.demographics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '14px', color: '#475569' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}