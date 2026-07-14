import { useState, useEffect } from 'react';
import { api } from '../api';
import { Users, BookOpen, UserPlus, Trash2 } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    class_room: '',
    parent_ids: []
  });

  const [classFormData, setClassFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, classesData, membersData] = await Promise.all([
        api.getStudents(),
        api.getClasses(),
        api.getMembers()
      ]);
      setStudents(studentsData.results || studentsData);
      setClasses(classesData.results || classesData);
      setMembers(membersData.results || membersData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.createStudent(formData);
      setShowAddModal(false);
      setFormData({ first_name: '', last_name: '', date_of_birth: '', class_room: '', parent_ids: [] });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to add student');
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await api.createClass(classFormData);
      setShowClassModal(false);
      setClassFormData({ name: '', description: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to add class');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student?')) return;
    try {
      await api.deleteStudent(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete student');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Students & PTA</h1>
          <p className="text-sm text-slate-500 mt-1">Manage school students, classes, and link parents.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowClassModal(true)} className="btn-secondary flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Add Class
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Classes
          </h3>
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="text-sm text-slate-500">No classes defined.</p>
            ) : classes.map(cls => (
              <div key={cls.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{cls.name}</span>
                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{cls.student_count || 0} students</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Student Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Class</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Parents/Guardians</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No students enrolled.</td></tr>
              ) : students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {student.class_room_details?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {student.parents_details?.map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                          <Users className="w-3 h-3" />
                          {p.first_name} {p.last_name}
                        </span>
                      )) || <span className="text-sm text-slate-400">None</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(student.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800">Add Class</h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleAddClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                <input required type="text" className="input-field" value={classFormData.name} onChange={e => setClassFormData({...classFormData, name: e.target.value})} placeholder="e.g. Grade 1A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea className="input-field" value={classFormData.description} onChange={e => setClassFormData({...classFormData, description: e.target.value})} rows="2" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowClassModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Class</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-semibold text-slate-800">Enroll Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input required type="text" className="input-field" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input required type="text" className="input-field" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input type="date" className="input-field" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                  <select className="input-field" value={formData.class_room} onChange={e => setFormData({...formData, class_room: e.target.value})}>
                    <option value="">-- Select Class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Link Parents/Guardians</label>
                <select multiple className="input-field h-32" value={formData.parent_ids} onChange={e => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                  setFormData({...formData, parent_ids: selectedOptions});
                }}>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.phone_number})</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple parents.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
