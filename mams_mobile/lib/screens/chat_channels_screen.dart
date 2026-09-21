import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'chat_room_screen.dart';

class ChatChannelsScreen extends StatefulWidget {
  const ChatChannelsScreen({super.key});

  @override
  State<ChatChannelsScreen> createState() => _ChatChannelsScreenState();
}

class _ChatChannelsScreenState extends State<ChatChannelsScreen> {
  List<dynamic> _channels = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadChannels();
  }

  Future<void> _loadChannels() async {
    setState(() => _isLoading = true);
    final channels = await ApiService.getChatChannels();
    if (mounted) {
      setState(() {
        _channels = channels;
        _isLoading = false;
      });
    }
  }

  IconData _getChannelIcon(String? type) {
    switch (type) {
      case 'section':
        return Icons.group_work_rounded;
      case 'zone':
        return Icons.location_city_rounded;
      case 'ministry':
        return Icons.volunteer_activism_rounded;
      default:
        return Icons.campaign_rounded;
    }
  }

  Color _getChannelColor(String? type) {
    switch (type) {
      case 'section':
        return const Color(0xFF10B981); // Emerald Green
      case 'zone':
        return const Color(0xFFF59E0B); // Warm Amber
      case 'ministry':
        return const Color(0xFF8B5CF6); // Royal Purple
      default:
        return const Color(0xFF3B82F6); // Electric Blue
    }
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
        final hour = dt.hour.toString().padLeft(2, '0');
        final minute = dt.minute.toString().padLeft(2, '0');
        return '$hour:$minute';
      }
      return '${dt.day}/${dt.month}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1C2541),
        elevation: 0,
        title: const Text(
          'Group Channels',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Refresh Channels',
            onPressed: _loadChannels,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
          : _channels.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.speaker_notes_off_outlined,
                          size: 64, color: Colors.white.withValues(alpha: 0.2)),
                      const SizedBox(height: 16),
                      const Text(
                        'No Channels Available',
                        style: TextStyle(color: Colors.white70, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'You will automatically be added when assigned\nto a Section, Zone, or Department.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white38, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: const Color(0xFF4F46E5),
                  onRefresh: _loadChannels,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    itemCount: _channels.length,
                    itemBuilder: (context, index) {
                      final channel = _channels[index];
                      final channelId = channel['id'];
                      final name = channel['name'] ?? 'Group Chat';
                      final type = channel['channel_type'] ?? 'general';
                      final memberCount = channel['member_count'] ?? 0;
                      final lastMsg = channel['last_message'];
                      final color = _getChannelColor(type);
                      final icon = _getChannelIcon(type);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1C2541),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white10),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 6,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ChatRoomScreen(
                                    channelId: channelId,
                                    channelName: name,
                                    channelType: type,
                                  ),
                                ),
                              );
                              // Refresh channels when returning to update last message preview
                              _loadChannels();
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  // Channel Icon Badge
                                  Container(
                                    width: 52,
                                    height: 52,
                                    decoration: BoxDecoration(
                                      color: color.withValues(alpha: 0.15),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
                                    ),
                                    child: Icon(icon, color: color, size: 26),
                                  ),
                                  const SizedBox(width: 14),

                                  // Channel Information
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                  color: Colors.white,
                                                ),
                                              ),
                                            ),
                                            if (lastMsg != null)
                                              Text(
                                                _formatTime(lastMsg['created_at']),
                                                style: const TextStyle(
                                                  color: Colors.white38,
                                                  fontSize: 11,
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 5),

                                        // Last message or description
                                        Text(
                                          lastMsg != null
                                              ? '${lastMsg['sender_name']}: ${lastMsg['content']}'
                                              : (channel['description'] ?? 'Tap to view group messages'),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: lastMsg != null ? Colors.white70 : Colors.white38,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 8),

                                        // Tags: Type and Member count
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                  horizontal: 8, vertical: 2.5),
                                              decoration: BoxDecoration(
                                                color: color.withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                type.toUpperCase(),
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: color,
                                                  letterSpacing: 0.5,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '$memberCount members',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: Colors.white38,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Icon(Icons.arrow_forward_ios_rounded,
                                      color: Colors.white24, size: 14),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
