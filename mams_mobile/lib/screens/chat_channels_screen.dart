import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
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
        return Icons.group_work_outlined;
      case 'zone':
        return Icons.location_city_outlined;
      case 'ministry':
        return Icons.volunteer_activism_outlined;
      default:
        return Icons.forum_outlined;
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
    final colors = MamsColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: colors.textPrimary,
        title: Text(
          'Group Channels',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, color: colors.textPrimary),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: colors.textSecondary),
            tooltip: 'Refresh Channels',
            onPressed: _loadChannels,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primaryNavy))
          : _channels.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.speaker_notes_off_outlined, size: 56, color: colors.textMuted),
                      const SizedBox(height: 14),
                      Text(
                        'No Channels Available',
                        style: TextStyle(color: colors.textPrimary, fontSize: 17, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'You will automatically be added when assigned\nto a Section, Zone, or Department.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: colors.textSecondary, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: colors.primaryNavy,
                  onRefresh: _loadChannels,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: _channels.length,
                    itemBuilder: (context, index) {
                      final channel = _channels[index];
                      final channelId = channel['id'];
                      final name = channel['name'] ?? 'Group Chat';
                      final type = channel['channel_type'] ?? 'general';
                      final memberCount = channel['member_count'] ?? 0;
                      final lastMsg = channel['last_message'];
                      final icon = _getChannelIcon(type);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: colors.cardSurface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colors.cardBorder),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: colors.isDark ? 0.2 : 0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
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
                              _loadChannels();
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: colors.iconBadgeBg,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: colors.cardBorder),
                                    ),
                                    child: Icon(icon, color: colors.iconBadgeFg, size: 22),
                                  ),
                                  const SizedBox(width: 14),
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
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 15.5,
                                                  color: colors.textPrimary,
                                                ),
                                              ),
                                            ),
                                            if (lastMsg != null)
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.end,
                                                children: [
                                                  Text(
                                                    _formatTime(lastMsg['created_at']),
                                                    style: TextStyle(
                                                      color: colors.textMuted,
                                                      fontSize: 11.5,
                                                    ),
                                                  ),
                                                  if (lastMsg['is_me'] == false) ...[
                                                    const SizedBox(height: 5),
                                                    Container(
                                                      width: 8,
                                                      height: 8,
                                                      decoration: const BoxDecoration(
                                                        color: Color(0xFF2563EB),
                                                        shape: BoxShape.circle,
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          lastMsg != null
                                              ? '${lastMsg['sender_name']}: ${lastMsg['content']}'
                                              : (channel['description'] ?? 'Tap to view group messages'),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            color: lastMsg != null ? colors.textSecondary : colors.textMuted,
                                            fontSize: 13,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: colors.subtleSurface,
                                                borderRadius: BorderRadius.circular(6),
                                                border: Border.all(color: colors.cardBorder),
                                              ),
                                              child: Text(
                                                type.toUpperCase(),
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w700,
                                                  color: colors.textSecondary,
                                                  letterSpacing: 0.4,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              '$memberCount members',
                                              style: TextStyle(
                                                fontSize: 11.5,
                                                color: colors.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Icon(Icons.chevron_right_rounded, color: colors.textMuted, size: 20),
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

