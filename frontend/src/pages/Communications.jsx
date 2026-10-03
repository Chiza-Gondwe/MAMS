import { Mail, CheckCircle2, X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Communications() {
  const [emails, setEmails] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('warm');
  const [aiGenerating, setAiGenerating] = useState(false);

  const fetchEmails = () => {
    api.getEmails().then(data => {
      setEmails(data.results || data || []);
    }).catch(err => console.error(err));
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleGenerateWithAI = async () => {
    const topicText = aiPrompt.trim() || subject.trim() || body.trim();
    if (!topicText) {
      alert('Enter a few words or topic first (e.g. "Monthly newsletter & Sunday service reminder")');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await api.draftMessageWithAI({
        prompt: topicText,
        tone: aiTone,
        audience: 'all',
        message_type: 'email',
      });
      if (res.subject || res.title) setSubject(res.subject || res.title);
      if (res.body || res.content) setBody(res.body || res.content);
    } catch (err) {
      alert(err.message || 'Failed to generate with AI');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.sendEmail({ subject, body });
      setIsModalOpen(false);
      setSubject('');
      setBody('');
      setAiPrompt('');
      fetchEmails();
    } catch (err) {
      alert(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Communications</h1>
          <p className="text-sm text-slate-500 mt-1">Email logs and newsletters</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">Compose Email</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Email Log</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-white border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Subject</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Sent Date</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Recipients</th>
              <th className="px-6 py-4 font-semibold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {emails.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No emails sent yet.</td></tr>
            ) : emails.map((email) => (
              <tr key={email.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-700 font-medium flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {email.subject}
                </td>
                <td className="px-6 py-4 text-slate-500">{new Date(email.sent_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-slate-500">{email.recipient_count || 0}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded w-max">
                    <CheckCircle2 className="w-3 h-3" /> {email.status || 'Sent'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-semibold text-slate-800">Compose Email</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSend} className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* AI Smart Email Drafter */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      AI Smart Email Drafter
                    </span>
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-blue-200 bg-white text-slate-700 font-medium focus:outline-none"
                    >
                      <option value="warm">Warm & Welcoming</option>
                      <option value="formal">Official & Formal</option>
                      <option value="urgent">Urgent Notice</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Brief notes, e.g. Sunday service schedule & stewardship update..."
                      className="flex-1 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={aiGenerating}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiGenerating ? 'Drafting...' : 'Generate with AI'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
                  <input type="text" disabled value="All Members (BCC)" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 text-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="E.g., Sunday Service Update" className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea required rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Type your newsletter or message here..." className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-400 font-sans"></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={sending} className="btn-primary flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                  {sending ? 'Sending...' : 'Send Email to All Members'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
