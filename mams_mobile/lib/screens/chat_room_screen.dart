import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';

class ChatRoomScreen extends StatefulWidget {
  final int channelId;
  final String channelName;
  final String channelType;

  const ChatRoomScreen({
    super.key,
    required this.channelId,
    required this.channelName,
    required this.channelType,
  });

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<dynamic> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  Timer? _pollingTimer;
  int? _lastMessageId;

  @override
  void initState() {
    super.initState();
    _loadInitialMessages();
    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _startPolling() {
    // Poll every 2.5 seconds for new messages
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      _pollNewMessages();
    });
  }

  Future<void> _loadInitialMessages() async {
    final msgs = await ApiService.getChannelMessages(widget.channelId);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
        if (_messages.isNotEmpty) {
          _lastMessageId = _messages.last['id'];
        }
      });
      _scrollToBottom();
    }
  }

  Future<void> _pollNewMessages() async {
    if (_lastMessageId == null) {
      if (_messages.isEmpty) {
        _loadInitialMessages();
      }
      return;
    }

    final newMsgs = await ApiService.getChannelMessages(
      widget.channelId,
      sinceId: _lastMessageId,
    );

    if (mounted && newMsgs.isNotEmpty) {
      setState(() {
        _messages.addAll(newMsgs);
        _lastMessageId = _messages.last['id'];
      });
      SystemSound.play(SystemSoundType.click);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending) return;

    _textController.clear();
    setState(() => _isSending = true);

    final newMsg = await ApiService.sendChatMessage(widget.channelId, text);

    if (mounted) {
      setState(() => _isSending = false);
      if (newMsg != null) {
        setState(() {
          _messages.add(newMsg);
          _lastMessageId = newMsg['id'];
        });
        _scrollToBottom();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send message. Please try again.')),
        );
      }
    }
  }

  Color _getRoleColor(String? role) {
    if (role == null) return Colors.white70;
    final r = role.toLowerCase();
    if (r.contains('admin') || r.contains('superadmin')) {
      return const Color(0xFFF59E0B); // Amber / Gold
    } else if (r.contains('leader')) {
      return const Color(0xFF06B6D4); // Cyan
    } else if (r.contains('pta')) {
      return const Color(0xFFA855F7); // Purple
    }
    return const Color(0xFF38BDF8); // Sky blue
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return '';
    }
  }

  void _confirmDeleteMessage(Map<String, dynamic> msg) {
    final isMe = msg['is_me'] == true;
    final messageId = msg['id'];
    if (messageId == null) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                if (isMe)
                  ListTile(
                    leading: const Icon(Icons.delete_outline, color: Colors.redAccent),
                    title: const Text(
                      'Delete Message',
                      style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold),
                    ),
                    subtitle: const Text(
                      'This will delete the message for everyone.',
                      style: TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                    onTap: () async {
                      final messenger = ScaffoldMessenger.of(context);
                      Navigator.pop(context);
                      final success = await ApiService.deleteChatMessage(messageId);
                      if (success) {
                        setState(() {
                          _messages.removeWhere((m) => m['id'] == messageId);
                        });
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Message deleted'),
                            backgroundColor: Colors.green,
                            duration: Duration(seconds: 2),
                          ),
                        );
                      } else {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Could not delete message'),
                            backgroundColor: Colors.red,
                          ),
                        );
                      }
                    },
                  ),
                ListTile(
                  leading: const Icon(Icons.close, color: Colors.white70),
                  title: const Text('Cancel', style: TextStyle(color: Colors.white70)),
                  onTap: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1C2541),
        elevation: 1,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.channelName,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Text(
                  widget.channelType.toUpperCase(),
                  style: const TextStyle(fontSize: 11, color: Colors.white60, letterSpacing: 0.5),
                ),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Messages List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
                  : _messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.forum_outlined, size: 64, color: Colors.white.withValues(alpha: 0.2)),
                              const SizedBox(height: 12),
                              const Text(
                                'No messages yet in this channel.',
                                style: TextStyle(color: Colors.white70, fontSize: 16),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Start the group discussion below!',
                                style: TextStyle(color: Colors.white38, fontSize: 13),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isMe = msg['is_me'] == true;
                            final senderName = msg['sender_name'] ?? 'Member';
                            final senderRole = msg['sender_role'] ?? 'Member';
                            final content = msg['content'] ?? '';
                            final time = _formatTime(msg['created_at']);
                            final profilePic = msg['sender_profile_picture'];

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                mainAxisAlignment:
                                    isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  if (!isMe) ...[
                                    CircleAvatar(
                                      radius: 16,
                                      backgroundColor: const Color(0xFF334155),
                                      backgroundImage:
                                          profilePic != null ? NetworkImage(profilePic) : null,
                                      child: profilePic == null
                                          ? Text(
                                              senderName.isNotEmpty ? senderName[0].toUpperCase() : '?',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            )
                                          : null,
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Flexible(
                                    child: GestureDetector(
                                      onLongPress: () => _confirmDeleteMessage(msg),
                                      child: Container(
                                        constraints: BoxConstraints(
                                          maxWidth: MediaQuery.of(context).size.width * 0.75,
                                        ),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 10,
                                        ),
                                        decoration: BoxDecoration(
                                          color: isMe
                                              ? const Color(0xFF1E3A8A) // Royal MAMS Blue
                                              : const Color(0xFF1F2937), // Dark slate
                                          borderRadius: BorderRadius.only(
                                            topLeft: const Radius.circular(16),
                                            topRight: const Radius.circular(16),
                                            bottomLeft: Radius.circular(isMe ? 16 : 4),
                                            bottomRight: Radius.circular(isMe ? 4 : 16),
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.15),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            ),
                                          ],
                                        ),
                                        child: Column(
                                          crossAxisAlignment: isMe
                                              ? CrossAxisAlignment.end
                                              : CrossAxisAlignment.start,
                                          children: [
                                            if (!isMe) ...[
                                              Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Text(
                                                    senderName,
                                                    style: const TextStyle(
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 13,
                                                      color: Colors.white,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    '• $senderRole',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      color: _getRoleColor(senderRole),
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                            ],
                                            Text(
                                              content,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 15,
                                                height: 1.3,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              time,
                                              style: TextStyle(
                                                fontSize: 10,
                                                color: isMe
                                                    ? Colors.white.withValues(alpha: 0.7)
                                                    : Colors.white38,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),

            // Bottom Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF1C2541),
                border: Border(top: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFF0B132B),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: TextField(
                        controller: _textController,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        textCapitalization: TextCapitalization.sentences,
                        minLines: 1,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Type a message to the group...',
                          hintStyle: TextStyle(color: Colors.white38, fontSize: 14),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: InputBorder.none,
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: Color(0xFF2563EB), // Vibrant Blue
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: _isSending ? null : _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
