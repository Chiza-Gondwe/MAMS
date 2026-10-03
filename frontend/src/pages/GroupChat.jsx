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
  Paperclip,
  Mic,
  Square,
  Video,
  Image as ImageIcon,
  X
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

  // Media attachment state (Video / Audio / Image / Document)
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Voice Note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const lastMessageIdRef = useRef(null);

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

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      const res = await api.getChatChannels();
      const channelList = res.results || res || [];
      setChannels(channelList);
      setActiveChannel(prev => prev || (channelList.length > 0 ? channelList[0] : null));
    } catch (err) {
      console.error('Failed to load chat channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Load authorized channels on mount
  useEffect(() => {
    let isMounted = true;
    api.getChatChannels()
      .then((res) => {
        if (!isMounted) return;
        const channelList = res.results || res || [];
        setChannels(channelList);
        setActiveChannel(prev => prev || (channelList.length > 0 ? channelList[0] : null));
      })
      .catch((err) => {
        console.error('Failed to load chat channels:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingChannels(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
  }, [activeChannel]);

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

  const clearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setSelectedFileType(null);
    setFilePreviewUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type = 'file';
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (mime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.mkv')) {
      type = 'video';
    } else if (mime.startsWith('audio/') || name.endsWith('.m4a') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.webm')) {
      type = 'audio';
    } else if (mime.startsWith('image/') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.gif') || name.endsWith('.webp')) {
      type = 'image';
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(file);
    setSelectedFileType(type);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioChunksRef.current.length > 0) {
          const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          const voiceFile = new File([blob], `voice_note_${Date.now()}.${ext}`, {
            type: mimeType || 'audio/webm',
          });
          setSelectedFile(voiceFile);
          setSelectedFileType('audio');
          setFilePreviewUrl(URL.createObjectURL(blob));
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone. Please allow microphone permissions.');
    }
  };

  const stopVoiceRecording = (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || !activeChannel || sending) return;

    const content = inputMessage.trim();
    const fileToSend = selectedFile;
    const typeToSend = selectedFileType;

    setInputMessage('');
    clearSelectedFile();
    setSending(true);

    try {
      const newMsg = await api.sendChatMessage(activeChannel.id, content, fileToSend, typeToSend);
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
                  <p className="text-xs text-slate-400">Send a text, voice note, or video to start the conversation!</p>
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
                            className={`absolute -top-2 ${isMe ? '-left-2' : '-right-2'} opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 p-1 rounded-full shadow-md border border-slate-200 z-10`}
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

                        {/* Rich Media Attachment */}
                        {msg.attachment_url && (
                          <div className="mb-2">
                            {msg.attachment_type === 'audio' ? (
                              <div className={`p-2 rounded-xl ${isMe ? 'bg-sky-700/60' : 'bg-white border border-slate-200'}`}>
                                <div className={`flex items-center gap-1.5 text-[11px] font-semibold mb-1 ${isMe ? 'text-sky-100' : 'text-sky-700'}`}>
                                  <Mic className="w-3.5 h-3.5" />
                                  <span>Voice Note</span>
                                </div>
                                <audio
                                  controls
                                  src={msg.attachment_url}
                                  className="h-9 w-56 sm:w-64 max-w-full"
                                />
                              </div>
                            ) : msg.attachment_type === 'video' ? (
                              <div className="rounded-xl overflow-hidden bg-black max-w-xs sm:max-w-sm">
                                <video
                                  controls
                                  preload="metadata"
                                  src={msg.attachment_url}
                                  className="w-full max-h-64 object-contain"
                                />
                              </div>
                            ) : msg.attachment_type === 'image' ? (
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer">
                                <img
                                  src={msg.attachment_url}
                                  alt="Attachment"
                                  className="rounded-xl max-h-64 max-w-xs sm:max-w-sm object-cover border border-white/20"
                                />
                              </a>
                            ) : (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium underline ${
                                  isMe ? 'bg-sky-700 text-white' : 'bg-white text-sky-700 border border-slate-200'
                                }`}
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>Open Attachment</span>
                              </a>
                            )}
                          </div>
                        )}

                        {msg.content && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
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

            {/* Selected Media Preview Banner */}
            {selectedFile && (
              <div className="px-4 py-2.5 bg-sky-50 border-t border-sky-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedFileType === 'audio' ? (
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-lg bg-sky-600 text-white">
                        <Mic className="w-4 h-4" />
                      </span>
                      <audio controls src={filePreviewUrl} className="h-8 w-48 sm:w-64" />
                    </div>
                  ) : selectedFileType === 'video' ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
                        <Video className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        Video ready: {selectedFile.name}
                      </span>
                    </div>
                  ) : selectedFileType === 'image' ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0"
                        />
                      ) : (
                        <span className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        Photo ready: {selectedFile.name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-2 rounded-lg bg-amber-600 text-white shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        Document ready: {selectedFile.name}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="p-1.5 rounded-lg hover:bg-sky-200/60 text-slate-500 hover:text-red-600 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/80 bg-white flex items-center gap-2">
              {/* Hidden File Inputs for Photos, Videos, and Documents */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,video/*,audio/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Attach Photo Button */}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isRecording || sending}
                title="Send Photo / Image"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-emerald-50 text-emerald-600 disabled:opacity-40 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Attach Video Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRecording || sending}
                title="Send Video"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-indigo-50 text-indigo-600 disabled:opacity-40 transition-colors"
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Attach Document Button */}
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={isRecording || sending}
                title="Attach Document (PDF, Word, Excel, etc.)"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-amber-50 text-amber-600 disabled:opacity-40 transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Record Voice Note Button */}
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={sending}
                  title="Record Voice Note"
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-rose-600 disabled:opacity-40 transition-colors"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-bold">{formatDuration(recordingSeconds)}</span>
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(false)}
                    title="Stop & Attach Voice Note"
                    className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    title="Cancel Recording"
                    className="p-1 text-slate-500 hover:text-rose-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedFile ? 'Add an optional caption...' : `Message #${activeChannel.name}...`}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 text-sm bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={(!inputMessage.trim() && !selectedFile) || sending || isRecording}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm"
              >
                <span>{sending ? 'Sending...' : 'Send'}</span>
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

