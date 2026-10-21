import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'create_announcement_screen.dart';

class AnnouncementsScreen extends StatefulWidget {
  final Map<String, dynamic>? initialAnnouncement;

  const AnnouncementsScreen({super.key, this.initialAnnouncement});

  static String? extractVideoUrl(dynamic item) {
    if (item is! Map) return null;
    final direct = (item['video_url'] ?? '').toString().trim();
    if (direct.isNotEmpty && direct.startsWith('http')) {
      return direct;
    }
    final content = (item['content'] ?? item['body'] ?? '').toString();
    final match = RegExp(r'https?://[^\s]+').firstMatch(content);
    if (match != null) {
      final candidate = match.group(0)!;
      if (candidate.contains('youtu') ||
          candidate.contains('vimeo') ||
          candidate.contains('drive.google') ||
          candidate.endsWith('.mp4') ||
          item['announcement_type'] == 'video') {
        return candidate;
      }
    }
    return null;
  }

  static String formatAudienceLabel(dynamic raw) {
    final val = (raw ?? 'all').toString().trim().toLowerCase();
    switch (val) {
      case 'all':
      case '':
        return 'All Members';
      case 'members':
        return 'Members Only';
      case 'leaders':
        return 'Leaders';
      case 'section_admins':
        return 'Section Leaders';
      case 'zone_admins':
        return 'Zone Leaders';
      case 'pta':
        return 'PTA Officials';
      default:
        return val.toUpperCase();
    }
  }

  static void showAnnouncementDetailSheet(
    BuildContext context,
    Map<String, dynamic> item,
  ) {
    final colors = MamsColors.of(context);
    final title = (item['title'] ?? 'Announcement').toString();
    final bodyText =
        (item['content'] ?? item['body'] ?? item['message'] ?? '').toString();
    final createdStr = (item['created_at'] ?? '').toString();
    final dateDisplay =
        createdStr.length >= 10 ? createdStr.substring(0, 10) : createdStr;
    final audienceLabel = formatAudienceLabel(
      item['target_audience'] ?? item['audience'],
    );
    final videoUrl = extractVideoUrl(item);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.82,
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: sheetColors.cardBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: TextStyle(
                                color: sheetColors.textPrimary,
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: sheetColors.iconBadgeBg,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'Audience: $audienceLabel',
                                    style: TextStyle(
                                      color: sheetColors.iconBadgeFg,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                if (dateDisplay.isNotEmpty)
                                  Text(
                                    dateDisplay,
                                    style: TextStyle(
                                      color: sheetColors.textMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: Icon(
                          Icons.close_rounded,
                          color: sheetColors.textSecondary,
                        ),
                        tooltip: 'Close',
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Divider(color: sheetColors.cardBorder, height: 1),
                  const SizedBox(height: 14),
                  Flexible(
                    child: SingleChildScrollView(
                      child: Text(
                        bodyText,
                        style: TextStyle(
                          color: sheetColors.textSecondary,
                          fontSize: 14.5,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      if (videoUrl != null) ...[
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              final uri = Uri.tryParse(videoUrl);
                              if (uri != null) {
                                await launchUrl(
                                  uri,
                                  mode: LaunchMode.externalApplication,
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFE11D48),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(
                              Icons.play_arrow_rounded,
                              size: 18,
                            ),
                            label: const Text(
                              'Watch Video',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                      ],
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            side: BorderSide(color: sheetColors.cardBorder),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: Text(
                            'Close / Cancel',
                            style: TextStyle(
                              color: sheetColors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen> {
  List<dynamic> _announcements = [];
  bool _isLoading = true;
  String? _userRole;

  @override
  void initState() {
    super.initState();
    _fetchAnnouncements();
    if (widget.initialAnnouncement != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          AnnouncementsScreen.showAnnouncementDetailSheet(
            context,
            widget.initialAnnouncement!,
          );
        }
      });
    }
  }

  Future<void> _fetchAnnouncements() async {
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }
    try {
      final user = await ApiService.getCurrentUser();
      final data = await ApiService.getAnnouncements();
      if (!mounted) return;
      setState(() {
        _userRole = user['role'];
        _announcements = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _isLeader() {
    return [
      'admin',
      'superadmin',
      'section_admin',
      'zone_admin',
      'group_leader',
    ].contains(_userRole);
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Announcements',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        backgroundColor: colors.cardSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: colors.cardBorder),
        ),
      ),
      floatingActionButton: _isLeader()
          ? FloatingActionButton(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const CreateAnnouncementScreen(),
                  ),
                );
                if (result == true) {
                  _fetchAnnouncements();
                }
              },
              backgroundColor: const Color(0xFF2563EB),
              child: const Icon(Icons.add_rounded, color: Colors.white),
            )
          : null,
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primaryNavy))
          : RefreshIndicator(
              color: colors.primaryNavy,
              onRefresh: _fetchAnnouncements,
              child: _announcements.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 120),
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.campaign_outlined,
                                size: 48,
                                color: colors.textMuted,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No recent announcements',
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _announcements.length,
                      itemBuilder: (context, index) {
                        final item = _announcements[index];
                        final bodyText =
                            (item['content'] ?? item['body'] ?? item['message'] ?? '')
                                .toString();
                        final createdStr = (item['created_at'] ?? '').toString();
                        final dateDisplay = createdStr.length >= 10
                            ? createdStr.substring(0, 10)
                            : createdStr;

                        final videoUrl = AnnouncementsScreen.extractVideoUrl(item);
                        final isVideo = item['announcement_type'] == 'video' || videoUrl != null;
                        final audienceLabel = AnnouncementsScreen.formatAudienceLabel(
                          item['target_audience'] ?? item['audience'],
                        );

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
                            onTap: () {
                              if (item is Map) {
                                AnnouncementsScreen.showAnnouncementDetailSheet(
                                  context,
                                  Map<String, dynamic>.from(item),
                                );
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: colors.cardSurface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: colors.cardBorder),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          (item['title'] ?? 'Notice').toString(),
                                          style: TextStyle(
                                            color: colors.textPrimary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      if (isVideo)
                                        Container(
                                          margin: const EdgeInsets.only(right: 6),
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 7,
                                            vertical: 3,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFFEE2E2),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Icon(Icons.play_circle_fill_rounded,
                                                  color: Color(0xFFDC2626), size: 12),
                                              SizedBox(width: 4),
                                              Text('VIDEO',
                                                  style: TextStyle(
                                                      color: Color(0xFFDC2626),
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.w800)),
                                            ],
                                          ),
                                        ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: colors.iconBadgeBg,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          audienceLabel,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: colors.iconBadgeFg,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    bodyText,
                                    style: TextStyle(
                                      color: colors.textSecondary,
                                      fontSize: 14,
                                      height: 1.4,
                                    ),
                                  ),
                                  if (videoUrl != null) ...[
                                    const SizedBox(height: 12),
                                    Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(10),
                                        onTap: () async {
                                          final uri = Uri.tryParse(videoUrl);
                                          if (uri != null) {
                                            if (!await launchUrl(uri,
                                                mode: LaunchMode.externalApplication)) {
                                              if (context.mounted) {
                                                ScaffoldMessenger.of(context).showSnackBar(
                                                  const SnackBar(
                                                      content: Text('Could not open video URL')),
                                                );
                                              }
                                            }
                                          }
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 14, vertical: 10),
                                          decoration: BoxDecoration(
                                            gradient: const LinearGradient(
                                              colors: [Color(0xFFE11D48), Color(0xFFBE123C)],
                                            ),
                                            borderRadius: BorderRadius.circular(10),
                                            boxShadow: [
                                              BoxShadow(
                                                color: const Color(0xFFE11D48).withValues(alpha: 0.25),
                                                blurRadius: 6,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Icon(Icons.play_arrow_rounded,
                                                  color: Colors.white, size: 20),
                                              SizedBox(width: 6),
                                              Text(
                                                'Watch Video Announcement',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.w700,
                                                  fontSize: 13,
                                                ),
                                              ),
                                              SizedBox(width: 8),
                                              Icon(Icons.open_in_new_rounded,
                                                  color: Colors.white70, size: 14),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 14),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        dateDisplay,
                                        style: TextStyle(
                                          color: colors.textMuted,
                                          fontSize: 12,
                                        ),
                                      ),
                                      if (_isLeader())
                                        IconButton(
                                          icon: Icon(
                                            Icons.delete_outline_rounded,
                                            color: colors.dangerRed,
                                            size: 20,
                                          ),
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          onPressed: () async {
                                            final confirm = await showDialog<bool>(
                                              context: context,
                                              builder: (ctx) => AlertDialog(
                                                backgroundColor: colors.cardSurface,
                                                title: Text(
                                                  'Delete Announcement?',
                                                  style: TextStyle(
                                                    color: colors.textPrimary,
                                                  ),
                                                ),
                                                content: Text(
                                                  'Are you sure you want to delete this announcement?',
                                                  style: TextStyle(
                                                    color: colors.textSecondary,
                                                  ),
                                                ),
                                                actions: [
                                                  TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(ctx, false),
                                                    child: const Text('Cancel'),
                                                  ),
                                                  TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(ctx, true),
                                                    child: Text(
                                                      'Delete',
                                                      style: TextStyle(
                                                        color: colors.dangerRed,
                                                        fontWeight: FontWeight.w700,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            );
                                            if (confirm == true) {
                                              final success =
                                                  await ApiService.deleteAnnouncement(
                                                    item['id'],
                                                  );
                                              if (success) {
                                                _fetchAnnouncements();
                                              } else if (context.mounted) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Failed to delete announcement',
                                                    ),
                                                  ),
                                                );
                                              }
                                            }
                                          },
                                        ),
                                    ],
                                  ),
                                ],
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
