// components/DashboardLayout.jsx
import { Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OverviewMetrics from './OverviewMetrics';
import MembersTable from './MembersTable';
import AttendanceSection from './AttendanceSection';
import AnnouncementsPanel from './AnnouncementsPanel';
import AnalyticsSection from './AnalyticsSection';
import { api } from '../api';

export default function DashboardLayout() {
  const [stats, setStats] = useState({ total: 0, active: 0, attendanceRate: 78, pending: 3 });
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    api.getMembers().then(data => {
      setStats(prev => ({
        ...prev,
        total: data.count || 0,
        active: Math.floor((data.count || 0) * 0.82)
      }));
    });
  }, []);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onSearch={setGlobalSearch} />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <OverviewMetrics stats={stats} />
          <Routes>
            <Route path="/" element={
              <>
                <MembersTable />
                <AttendanceSection />
                <AnnouncementsPanel />
              </>
            } />
            <Route path="/members" element={<MembersTable />} />
            <Route path="/attendance" element={<AttendanceSection />} />
            <Route path="/announcements" element={<AnnouncementsPanel />} />
            <Route path="/analytics" element={<AnalyticsSection />} />
            <Route path="/settings" element={<div className="py-12 text-center text-slate-400 text-sm">Settings panel</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}