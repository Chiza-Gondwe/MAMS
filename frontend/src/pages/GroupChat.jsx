import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Send, 
  Users, 
  RefreshCw, 
  Shield, 
  Layers, 
  Compass, 
  HeartHandshake,
  CheckCheck,
  Trash2,
  Bell,
  Volume2
} from 'lucide-react';

export default function GroupChat() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);

  // Load authorized channels on mount
  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const res = await api.getChatChannels();
      const channelList = res.results || res || [];
      setChannels(channelList);
      if (channelList.length > 0 && !activeChannel) {
        setActiveChannel(channelList[0]);
      }
    } catch (err) {
      console.error('Failed to load chat channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Load messages when activeChannel changes
  useEffect(() => {
    if (!activeChannel) return;
    
    let isSubscribed = true;
    lastMessageIdRef.current = null;
    
    const fetchInitialMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await api.getChannelMessages(activeChannel.id);
        if (isSubscribed) {
          const msgList = res.results || res || [];
          setMessages(msgList);
          if (msgList.length > 0) {
            lastMessageIdRef.current = msgList[msgList.length - 1].id;
          }
        }
      } catch (err) {
        console.error('Failed to load channel messages:', err);
      } finally {
        if (isSubscribed) setLoadingMessages(false);
      }
    };

    fetchInitialMessages();

    // Polling timer: check for new messages every 3 seconds
    const interval = setInterval(async () => {
      if (!lastMessageIdRef.current) return;
      try {
        const newMsgs = await api.getChannelMessages(activeChannel.id, lastMessageIdRef.current);
        const msgList = newMsgs.results || newMsgs || [];
        if (isSubscribed && msgList.length > 0) {
          setMessages(prev => [...prev, ...msgList]);
          lastMessageIdRef.current = msgList[msgList.length - 1].id;

          // If any new message arrived from someone else, play a chime sound
          const hasIncoming = msgList.some(m => !m.is_me);
          if (hasIncoming) {
            playNotificationSound();
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeChannel?.id]);

  // Audio chime for new incoming chat messages
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.28);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteChatMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message. You may not have permission.');
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChannel || sending) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const newMsg = await api.sendChatMessage(activeChannel.id, content);
      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
        lastMessageIdRef.current = newMsg.id;
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getChannelBadge = (type) => {
    switch (type) {
      case 'section':
        return { label: 'Section', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Layers };
      case 'zone':
        return { label: 'Zone', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Compass };
      case 'ministry':
        return { label: 'Ministry', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: HeartHandshake };
      default:
        return { label: 'General', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: Shield };
    }
  };

  const getRoleBadge = (role) => {
    if (!role) return null;
    const r = role.toLowerCase();
    if (r.includes('admin') || r.includes('superadmin')) {
      return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-200">Admin</span>;
    }
    if (r.includes('leader')) {
      return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 border border-teal-200">Leader</span>;
    }
    if (r.includes('pta')) {
      return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-200">PTA</span>;
    }
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden glass-card border border-slate-200/80 shadow-xl bg-white/70 backdrop-blur-md">
      {/* Left Sidebar: Channel List */}
      <div className="w-80 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-slate-800 text-base">Group Channels</h2>
          </div>
          <button 
            onClick={loadChannels}
            title="Refresh channels"
            className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loadingChannels ? (
            <div className="p-6 text-center text-sm text-slate-400">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No channels available for your profile.
            </div>
          ) : (
            channels.map(channel => {
              const badge = getChannelBadge(channel.channel_type);
              const IconComponent = badge.icon;
              const isSelected = activeChannel?.id === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                    isSelected 
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 border-sky-600' 
                      : 'hover:bg-slate-100/80 text-slate-700 border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-semibold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {channel.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        isSelected ? 'bg-white/20 text-white border-white/30' : badge.color
                      }`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 truncate ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                      {channel.last_message 
                        ? `${channel.last_message.sender_name}: ${channel.last_message.content}`
                        : channel.description || 'No messages yet'}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 text-[11px] ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                      <Users className="w-3 h-3" />
                      <span>{channel.member_count} members</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side: Active Chat View */}
      <div className="flex-1 flex flex-col bg-white">
        {activeChannel ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-lg">{activeChannel.name}</h3>
                  {(() => {
                    const badge = getChannelBadge(activeChannel.channel_type);
                    return (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label} Channel
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeChannel.description || 'Group discussion and team coordination'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{activeChannel.member_count} active in group</span>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/40 to-white">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Loading discussion...
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <MessageSquare className="w-12 h-12 text-slate-300" />
                  <p className="font-medium text-slate-600">No messages yet in this group</p>
                  <p className="text-xs text-slate-400">Be the first to say hello to the group!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.is_me;
                  const canDelete = isMe || user?.role === 'admin' || user?.role === 'superadmin';
                  const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 items-end group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center border border-sky-200 shrink-0">
                          {msg.sender_profile_picture ? (
                            <img src={msg.sender_profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            msg.sender_name?.[0]?.toUpperCase() || 'M'
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`relative max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                        isMe 
                          ? 'bg-sky-600 text-white rounded-br-none' 
                          : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                      }`}>
                        {/* Delete button (shows on hover) */}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            title="Delete message"
                            className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 p-1 rounded-full shadow-md border border-slate-200`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!isMe && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold text-xs text-slate-900">{msg.sender_name}</span>
                            {getRoleBadge(msg.sender_role)}
                          </div>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                          <span>{time}</span>
                          {isMe && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/80 bg-white flex items-center gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Message #${activeChannel.name}...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 text-sm bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || sending}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>Send</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a channel to join the conversation
          </div>
        )}
      </div>
    </div>
  );
}
