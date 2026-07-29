import { Calendar as CalendarIcon, Clock, MapPin, Trash2, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [sections, setSections] = useState([]);
  const [zones, setZones] = useState([]);
  const [ministries, setMinistries] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', date: '', time: '', location: '', event_type: 'Service',
    audience: 'all', target_sections: [], target_zones: [], target_ministries: []
  });
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('month');

  const fetchEvents = () => {
    api.getEvents().then(data => setEvents(data.results || data || [])).catch(err => console.error(err));
  };

  useEffect(() => {
    fetchEvents();
    if (user?.role !== 'member') {
      api.getSections().then(data => setSections(data.results || data || [])).catch(() => {});
      api.getZones().then(data => setZones(data.results || data || [])).catch(() => {});
      api.getMinistries().then(data => setMinistries(data.results || data || [])).catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createEvent(formData);
      setIsModalOpen(false);
      setFormData({ 
        title: '', date: '', time: '', location: '', event_type: 'Service',
        audience: 'all', target_sections: [], target_zones: [], target_ministries: []
      });
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await api.deleteEvent(id);
      fetchEvents();
    } catch (err) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const calendarEvents = events.map(evt => {
    const startDateTime = new Date(`${evt.date}T${evt.time}`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);
    return {
      id: evt.id,
      title: evt.title,
      start: startDateTime,
      end: endDateTime,
      allDay: false,
      resource: evt
    };
  });

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';
    if (event.resource.event_type === 'Meeting') backgroundColor = '#8b5cf6';
    if (event.resource.event_type === 'Activity') backgroundColor = '#10b981';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px'
      }
    };
  };

  const handleSelectSlot = ({ start }) => {
    setFormData({ ...formData, date: moment(start).format('YYYY-MM-DD') });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Events & Meetings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your church calendar</p>
        </div>
        {user?.role !== 'member' && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4"/> Add Event</button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            selectable
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            view={viewState}
            onView={setViewState}
            className="text-sm font-sans"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[648px]">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Upcoming Schedule</h2>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No events scheduled.</div>
            ) : events.map((evt) => (
              <div key={evt.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-slate-800 font-semibold">{evt.title}</h3>
                  {user?.role !== 'member' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(evt.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-xs font-medium text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {moment(evt.date).format('MMM D, YYYY')}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {moment(evt.time, 'HH:mm:ss').format('h:mm A')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="w-3.5 h-3.5" /> {evt.location}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    evt.event_type === 'Meeting' ? 'bg-purple-100 text-purple-700' :
                    evt.event_type === 'Activity' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {evt.event_type || 'Event'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">Add New Event</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                  <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400">
                    <option value="Service">Service</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Activity">Activity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
                  <select value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400">
                    {user?.role === 'admin' && <option value="all">Everyone {user?.org_type === 'PTA' ? '(Students & PTA)' : '(Entire Congregation)'}</option>}
                    <option value="members">{user?.org_type === 'PTA' ? 'Parents/Students Only' : 'Church Members Only'}</option>
                    {user?.role !== 'group_leader' && <option value="leaders">{user?.org_type === 'PTA' ? 'All Teachers/Officials' : 'All Leaders'}</option>}
                    {user?.role === 'admin' || user?.role === 'section_admin' ? <option value="section_admins">{user?.org_type === 'PTA' ? 'Grade Leaders Only' : 'Section Leaders Only'}</option> : null}
                    {user?.role === 'admin' || user?.role === 'zone_admin' ? <option value="zone_admins">{user?.org_type === 'PTA' ? 'Department Heads Only' : 'Zone Leaders Only'}</option> : null}
                    {user?.role === 'admin' && user?.org_type === 'PTA' && <option value="pta">PTA Officials Only</option>}
                  </select>
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'superadmin') && (formData.audience === 'all' || formData.audience === 'members' || formData.audience === 'section_admins' || formData.audience === 'zone_admins') ? (
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific {user?.org_type === 'PTA' ? 'Classes' : 'Sections'} (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {sections.map(s => (
                        <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_sections.includes(s.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_sections: [...formData.target_sections, s.id]});
                            else setFormData({...formData, target_sections: formData.target_sections.filter(id => id !== s.id)});
                          }} className="rounded border-slate-300" /> {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific {user?.org_type === 'PTA' ? 'Grades' : 'Zones'} (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {zones.map(z => (
                        <label key={z.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_zones.includes(z.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_zones: [...formData.target_zones, z.id]});
                            else setFormData({...formData, target_zones: formData.target_zones.filter(id => id !== z.id)});
                          }} className="rounded border-slate-300" /> {z.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Specific {user?.org_type === 'PTA' ? 'Committees & Activities' : 'Groups/Ministries'} (Optional)</label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-md">
                      {ministries.map(m => (
                        <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={formData.target_ministries.includes(m.id)} onChange={(e) => {
                            if (e.target.checked) setFormData({...formData, target_ministries: [...formData.target_ministries, m.id]});
                            else setFormData({...formData, target_ministries: formData.target_ministries.filter(id => id !== m.id)});
                          }} className="rounded border-slate-300" /> {m.name}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mt-8 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary disabled:opacity-70">{loading ? 'Saving...' : 'Save Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
