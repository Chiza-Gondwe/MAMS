import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import OverviewMetrics from '../components/OverviewMetrics';
import MembersTable from '../components/MembersTable';
import AttendanceSection from '../components/AttendanceSection';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import AnalyticsSection from '../components/AnalyticsSection';
import { api } from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, attendanceRate: 78, pendingAnnouncements: 3 });
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const members = await api.getMembers();
      setStats(prev => ({ ...prev, totalMembers: members.count || 0, activeMembers: Math.floor((members.count || 0) * 0.85) }));
    };
    fetchStats();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <Topbar onSearch={setGlobalSearch} />
        <main className="p-6">
          <OverviewMetrics stats={stats} />
          <Routes>
            <Route path="/" element={<><MembersTable /><AttendanceSection /><AnnouncementsPanel /></>} />
            <Route path="/members" element={<MembersTable />} />
            <Route path="/attendance" element={<AttendanceSection />} />
            <Route path="/announcements" element={<AnnouncementsPanel />} />
            <Route path="/analytics" element={<AnalyticsSection />} />
            <Route path="/settings" element={<div className="py-12 text-center text-slate-500">Settings panel (profile, org preferences)</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}