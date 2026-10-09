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
import GroupChat from '../pages/GroupChat';
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
  const [showJoinQRModal, setShowJoinQRModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgSettings, setOrgSettings] = useState({ org_code: '', name: '', org_type: '' });

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    api.getSettings()
      .then(data => {
        if (data && (data.org_code || data.name)) {
          setOrgSettings({
            org_code: data.org_code || '',
            name: data.name || '',
            org_type: data.org_type || 'CHURCH',
          });
        }
      })
      .catch(() => {});
  }, []);

  const dynamicOrgCode = activeUser.org_code || orgSettings.org_code || '';
  const dynamicOrgName = activeUser.org_name || orgSettings.name || 'Organization';
  const isPTA = (activeUser.org_type || orgSettings.org_type) === 'PTA';
  const joinQrTargetUrl = dynamicOrgCode
    ? `${window.location.origin}/register?org_code=${encodeURIComponent(dynamicOrgCode)}`
    : '';
  const joinQrImageUrl = dynamicOrgCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(joinQrTargetUrl)}`
    : '';

  const printOrgJoinPoster = () => {
    if (!dynamicOrgCode) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${dynamicOrgName} - Join QR Poster</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
            .poster { max-width: 650px; margin: 0 auto; border: 4px solid #0284c7; border-radius: 24px; padding: 40px 30px; box-sizing: border-box; }
            h1 { font-size: 30px; color: #0f172a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 20px; color: #0284c7; margin: 0 0 24px 0; font-weight: 600; }
            .qr-wrapper { margin: 15px auto; padding: 16px; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; display: inline-block; }
            .qr-wrapper img { width: 300px; height: 300px; display: block; }
            .code-box { font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #0369a1; background: #e0f2fe; padding: 10px 24px; border-radius: 12px; display: inline-block; margin-top: 16px; }
            .instructions { font-size: 17px; color: #334155; margin: 20px 0 8px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="poster">
            <h1>${dynamicOrgName}</h1>
            <h2>Scan to Join Our ${isPTA ? 'School / PTA' : 'Congregation'} on MAMS</h2>
            <div class="qr-wrapper">
              <img src="${joinQrImageUrl}" alt="Join QR Code" />
            </div>
            <br />
            <div class="code-box">${dynamicOrgCode}</div>
            <p class="instructions">Scan this QR code in the MAMS Mobile App (or with your phone camera) to register!</p>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex h-screen bg-transparent animate-fade-in-up relative overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onSearch={handleSearch} />
        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
          {showJoinQRModal && dynamicOrgCode && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200">
                <h3 className="text-xl font-bold text-slate-800">{dynamicOrgName}</h3>
                <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mt-1">
                  {isPTA ? 'School / PTA' : 'Church'} Registration Join QR Code
                </p>
                <div className="my-5 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl inline-block">
                  <img src={joinQrImageUrl} alt="Join QR Code" className="w-60 h-60 mx-auto" />
                </div>
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-1">Organization Join Code</p>
                  <span className="inline-block bg-sky-50 border border-sky-200 text-sky-800 font-mono font-bold text-xl px-5 py-2 rounded-xl tracking-widest">
                    {dynamicOrgCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-5">
                  New {isPTA ? 'parents & teachers' : 'members'} can scan this QR code on the MAMS Register screen or enter the code above to join <strong>{dynamicOrgName}</strong>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={printOrgJoinPoster}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Print Join Poster
                  </button>
                  <button
                    onClick={() => setShowJoinQRModal(false)}
                    className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={
              <div className="space-y-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome back, {activeUser.first_name || activeUser.username}</h1>
                    <p className="text-sm text-slate-500 mt-1">Here's what's happening in your {isPTA ? 'school / PTA' : 'ministry'} today.</p>
                  </div>
                  {activeUser.role !== 'member' && dynamicOrgCode && (
                    <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md border border-sky-200/80 px-4 py-2.5 rounded-xl shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Join Code</p>
                        <p className="text-sm font-mono font-bold text-sky-700 tracking-wider">{dynamicOrgCode}</p>
                      </div>
                      <button
                        onClick={() => setShowJoinQRModal(true)}
                        className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        Show Join QR
                      </button>
                    </div>
                  )}
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
            <Route path="/chat" element={<GroupChat />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}