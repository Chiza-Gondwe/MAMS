import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'create_announcement_screen.dart';

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});

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

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
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
                                      (item['target_audience'] ??
                                              item['audience'] ??
                                              'All')
                                          .toString()
                                          .toUpperCase(),
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
                        );
                      },
                    ),
            ),
    );
  }
}
