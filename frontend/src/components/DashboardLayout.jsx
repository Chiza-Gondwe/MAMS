// components/DashboardLayout.jsx
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import OverviewMetrics from './OverviewMetrics';
import MembersTable from './MembersTable';
import MemberMap from '../pages/MemberMap';
import AttendanceSection from './AttendanceSection';
import Announcements from '../pages/Announcements';
import AnalyticsSection from './AnalyticsSection';
import Events from '../pages/Events';
import Communications from '../pages/Communications';
import Settings from '../pages/Settings';
import Ministries from '../pages/Ministries';
import Sections from '../pages/Sections';
import Zones from '../pages/Zones';
import Students from '../pages/Students';
import Sermons from '../pages/Sermons';
import PrayerWall from '../pages/PrayerWall';
import MyProfile from '../pages/MyProfile';
import Organizations from '../pages/Organizations';
import Finances from '../pages/Finances';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ totalMembers: 0, activeMembers: 0, attendanceCount: 0, totalAnnouncements: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getMembers(),
      api.getAnnouncements(),
      api.getSessions(),
      api.getEvents()
    ]).then(([membersData, announcementsData, sessionsData, eventsData]) => {
      
      const members = membersData.results || membersData || [];
      const activeCount = members.filter(m => m.status === 'active').length;
      
      setStats({
        totalMembers: membersData.count || members.length || 0,
        activeMembers: activeCount || 0, 
        attendanceCount: sessionsData.count || (sessionsData.results?.length) || sessionsData.length || 0,
        totalAnnouncements: announcementsData.count || (announcementsData.results?.length) || announcementsData.length || 0
      });

      setRecentSessions((sessionsData.results || sessionsData || []).slice(0, 5));
      setRecentAnnouncements((announcementsData.results || announcementsData || []).slice(0, 5));
      setRecentEvents((eventsData.results || eventsData || []).slice(0, 5));
      
    }).catch(err => console.error(err));
  }, [location.pathname]);

  const handleSearch = (query) => {
    console.log('Search query:', query);
  };

  const { user } = useAuth();
  const activeUser = user || { username: 'Admin', role: 'admin' };

  return (
    <div className="flex h-screen bg-transparent animate-fade-in-up">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onSearch={handleSearch} />
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Routes>
            <Route path="/" element={
              <div className="space-y-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome back, {activeUser.first_name || activeUser.username}</h1>
                  <p className="text-sm text-slate-500 mt-1">Here's what's happening in your ministry today.</p>
                </div>
                
                {activeUser.role === 'member' ? (
                  <>
                  <div className="glass-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800">Recent Announcements</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {recentAnnouncements.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 text-center">No announcements found</div>
                      ) : recentAnnouncements.map(ann => (
                        <div key={ann.id} className="p-4 flex items-center justify-between transition-colors">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{ann.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{ann.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800">Upcoming Events & Meetings</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {recentEvents.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500 text-center">No events found</div>
                      ) : recentEvents.map(evt => (
                        <div key={evt.id} className="p-4 flex items-center justify-between transition-colors">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{evt.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{evt.date} • {evt.time} at {evt.location}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                            evt.event_type === 'Meeting' ? 'bg-purple-100 text-purple-700' :
                            evt.event_type === 'Activity' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {evt.event_type || 'Event'}
                          </span>
                        </div>
                      ))}
                    </div>
                    </div>
                  </>
                ) : (
                  <>
                    <OverviewMetrics stats={stats} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Recent Sessions */}
                      <div className="glass-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-semibold text-slate-800">Recent Attendance Sessions</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {recentSessions.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500 text-center">No sessions found</div>
                          ) : recentSessions.map(session => (
                            <div 
                              key={session.id} 
                              onClick={() => navigate('/dashboard/attendance')}
                              className="p-4 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">{session.title}</p>
                                <p className="text-xs text-slate-500">{session.date} • {session.session_type}</p>
                              </div>
                              <span className="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-md transition-colors">View</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Announcements */}
                      <div className="glass-card overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-semibold text-slate-800">Recent Announcements</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {recentAnnouncements.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500 text-center">No announcements found</div>
                          ) : recentAnnouncements.map(ann => (
                            <div 
                              key={ann.id} 
                              onClick={() => navigate('/dashboard/announcements')}
                              className="p-4 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div>
                                <p className="text-sm font-medium text-slate-800">{ann.title}</p>
                                <p className="text-xs text-slate-500">{ann.announcement_type} • Audience: {ann.audience}</p>
                              </div>
                              <span className="text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-md transition-colors">View</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            } />
            <Route path="/members" element={<MembersTable />} />
            <Route path="/map" element={<MemberMap />} />
            <Route path="/attendance" element={<AttendanceSection />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/analytics" element={<AnalyticsSection />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/sections" element={<Sections />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/students" element={<Students />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="/prayer" element={<PrayerWall />} />
            <Route path="/profile" element={<MyProfile />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/finances" element={<Finances />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}