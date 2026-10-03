// components/AnalyticsSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Users, DollarSign, Sparkles, AlertTriangle, CheckCircle2, PhoneCall } from 'lucide-react';

const COLORS = ['#0ea5e9', '#d946ef', '#94a3b8']; // Blue (Male), Pink (Female), Gray (Unspecified)

export default function AnalyticsSection() {
  const [data, setData] = useState({ demographics: [], attendance_trend: [], financial_trend: [], ai_insights: null });
  const [loading, setLoading] = useState(true);
  const [refreshingAI, setRefreshingAI] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');

  const fetchAnalyticsData = (isRefresh = false) => {
    if (isRefresh) setRefreshingAI(true);
    api.getAnalytics().then(res => {
      setData(res);
      setLoading(false);
      setRefreshingAI(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      setRefreshingAI(false);
    });
  };

  useEffect(() => {
    fetchAnalyticsData(false);
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading analytics & AI insights...</div>;
  }

  const ai = data.ai_insights || {};
  const riskList = (ai.member_risk_list || []).filter(m => {
    if (riskFilter === 'all') return true;
    return m.risk_status === riskFilter;
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Advanced Analytics & AI Insights</h1>
        <p className="text-sm text-slate-500 mt-1">Predictive turnout forecasting, financial projections, and automated member absence risk scoring.</p>
      </div>

      {/* AI Predictive Forecasting Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Turnout & Financial Forecasting</h2>
              <p className="text-xs text-slate-500">{ai.engagement_summary || 'Real-time regression & exponential smoothing predictions'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAnalyticsData(true)}
              disabled={refreshingAI}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {refreshingAI ? 'Running AI...' : 'Re-Run AI Analysis'}
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
              Smart Predictive Engine
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Predicted Next Attendance</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{ai.predicted_next_attendance ?? 0}</span>
              <span className="text-xs font-semibold text-slate-500">attendees</span>
              {ai.attendance_growth_pct !== undefined && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  ai.attendance_growth_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {ai.attendance_growth_pct >= 0 ? `+${ai.attendance_growth_pct}%` : `${ai.attendance_growth_pct}%`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Based on recent service check-in velocity</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Month Contribution Forecast</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                ZMW {Number(ai.predicted_next_month_contributions || 0).toLocaleString()}
              </span>
              {ai.financial_growth_pct !== undefined && (
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                  ai.financial_growth_pct >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {ai.financial_growth_pct >= 0 ? `+${ai.financial_growth_pct}%` : `${ai.financial_growth_pct}%`}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Projected from monthly tithes & pledges</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Member Retention & Risk Split</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-extrabold text-emerald-600">{ai.overall_engagement_rate ?? 100}%</span>
              <span className="text-xs font-semibold text-slate-500">engaged</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold">
              <span className="text-emerald-600">{ai.engaged_count ?? 0} Active</span>
              <span className="text-amber-600">{ai.at_risk_count ?? 0} At Risk</span>
              <span className="text-rose-600">{ai.inactive_count ?? 0} Follow-Up</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Member Engagement & Absence Risk Scoring Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">AI Member Engagement & Absence Risk Scoring</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically flags members who miss consecutive sessions so Section & Zone Leaders can follow up.
            </p>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All Members' },
              { id: 'inactive', label: `High Risk (${ai.inactive_count ?? 0})` },
              { id: 'at_risk', label: `At Risk (${ai.at_risk_count ?? 0})` },
              { id: 'active', label: `Engaged (${ai.engaged_count ?? 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRiskFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  riskFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {riskList.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No members match the selected risk filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Section & Zone</th>
                  <th className="py-2.5 px-3">Engagement Score</th>
                  <th className="py-2.5 px-3">Risk Status</th>
                  <th className="py-2.5 px-3">AI Pastoral / Leader Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {riskList.map(m => {
                  const photoUrl = m.profile_picture_relative || (
                    m.profile_picture ? m.profile_picture.replace(/^https?:\/\/[^/]+/, '') : null
                  );
                  const badgeStyle = m.risk_status === 'inactive'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : m.risk_status === 'at_risk'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {photoUrl ? (
                            <img src={photoUrl} alt={m.full_name} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(m.full_name || 'M').slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 leading-tight">{m.full_name}</p>
                            {m.phone_number && (
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <PhoneCall className="w-3 h-3" /> {m.phone_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 font-medium">
                        {m.section_name} • {m.zone_name}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                m.risk_status === 'inactive'
                                  ? 'bg-rose-500'
                                  : m.risk_status === 'at_risk'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${m.engagement_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{m.engagement_score}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${badgeStyle}`}>
                          {m.risk_status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {m.risk_label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {m.recommendation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `K${val}`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val) => `ZMW ${val}`} />
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