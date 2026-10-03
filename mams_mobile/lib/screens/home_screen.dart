import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'member_map_screen.dart';
import 'profile_screen.dart';
import 'scan_qr_screen.dart';
import 'announcements_screen.dart';
import 'members_screen.dart';
import 'contributions_screen.dart';
import 'holding_tank_screen.dart';
import 'chat_channels_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _announcements = [];
  List<Map<String, dynamic>> _notifications = [];
  int _unreadNotifCount = 0;
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _userData;
  bool _loading = true;
  int _selectedNavIndex = 0;
  String _role = 'member';
  String _fullName = '';
  String _orgName = '';
  String _orgCode = '';
  String? _profilePic;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedFirst = (prefs.getString('first_name') ?? '').trim();
    final cachedLast = (prefs.getString('last_name') ?? '').trim();
    final cachedName = '$cachedFirst $cachedLast'.trim();
    if (mounted) {
      setState(() {
        _role = prefs.getString('role') ?? 'member';
        if (_fullName.isEmpty && cachedName.isNotEmpty) {
          _fullName = cachedName;
        }
        if (_orgName.isEmpty) {
          _orgName = prefs.getString('org_name') ?? '';
        }
        if (_orgCode.isEmpty) {
          _orgCode = prefs.getString('org_code') ?? '';
        }
      });
    }

    try {
      final results = await Future.wait([
        ApiService.getCurrentUser(),
        ApiService.getAnnouncements(),
        ApiService.getChatChannels(),
      ]);
      final user = results[0] as Map<String, dynamic>;
      final announcements = results[1] as List<dynamic>;
      final channels = results[2] as List<dynamic>;

      Map<String, dynamic>? stats;
      final effectiveRole = (!user.containsKey('error') && user['role'] != null)
          ? user['role'].toString()
          : _role;

      if (effectiveRole == 'admin' ||
          effectiveRole == 'superadmin' ||
          effectiveRole == 'section_admin') {
        stats = await ApiService.getMobileDashboardStats();
      }

      // Build unified notifications list for both Admins and Members
      final notifs = <Map<String, dynamic>>[];
      final pendingCount = stats?['pending_members'] ?? 0;
      if ((effectiveRole == 'admin' ||
              effectiveRole == 'superadmin' ||
              effectiveRole == 'section_admin') &&
          pendingCount is int &&
          pendingCount > 0) {
        notifs.add({
          'id': 'pending_$pendingCount',
          'type': 'pending',
          'title':
              '$pendingCount Pending Member Approval${pendingCount == 1 ? '' : 's'}',
          'subtitle': 'Tap to review new registrations in the Holding Tank',
        });
      }

      for (final ch in channels) {
        if (ch is Map<String, dynamic> && ch['last_message'] is Map) {
          final lastMsg = Map<String, dynamic>.from(ch['last_message'] as Map);
          final isMe = lastMsg['is_me'] == true;
          if (!isMe) {
            final chName = (ch['name'] ?? 'Group Chat').toString();
            final sender = (lastMsg['sender_name'] ?? 'Member').toString();
            final content = (lastMsg['content'] ?? '').toString();
            notifs.add({
              'id': 'chat_${ch['id']}_msg_${lastMsg['id']}',
              'type': 'chat',
              'title': '$chName • $sender',
              'subtitle': content,
            });
          }
        }
      }

      for (final a in announcements.take(5)) {
        if (a is Map<String, dynamic>) {
          notifs.add({
            'id': 'ann_${a['id']}',
            'type': 'announcement',
            'title': (a['title'] ?? 'New Announcement').toString(),
            'subtitle': (a['content'] ?? a['body'] ?? '').toString(),
          });
        }
      }

      final userKey = (user['username'] ?? prefs.getString('username') ?? 'user')
          .toString();
      final readIds = prefs.getStringList('read_notifs_$userKey') ?? <String>[];
      final unread = notifs
          .where((n) => !readIds.contains(n['id'].toString()))
          .length;

      final fetchedOrgCode =
          (user['org_code'] ?? stats?['org_code'] ?? _orgCode).toString().trim();
      if (fetchedOrgCode.isNotEmpty) {
        await prefs.setString('org_code', fetchedOrgCode);
      }

      if (!mounted) return;
      setState(() {
        if (!user.containsKey('error')) {
          _userData = user;
          _profilePic = user['profile_picture'];
          _role = effectiveRole;
          final first = (user['first_name'] ?? '').toString().trim();
          final last = (user['last_name'] ?? '').toString().trim();
          _fullName = '$first $last'.trim();
          if (_fullName.isEmpty) {
            _fullName = (user['username'] ?? 'Member').toString();
          }
          _orgName = (user['org_name'] ?? '').toString().trim();
        }
        if (fetchedOrgCode.isNotEmpty) {
          _orgCode = fetchedOrgCode;
        }
        _stats = stats;
        _announcements = announcements;
        _notifications = notifs;
        _unreadNotifCount = unread;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await ApiService.clearTokens();
    if (mounted) Navigator.pushReplacementNamed(context, '/login');
  }

  Future<void> _openProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final fallbackData = <String, dynamic>{
      'first_name': prefs.getString('first_name') ?? '',
      'last_name': prefs.getString('last_name') ?? '',
      'username': prefs.getString('username') ?? '',
      'role': _role,
      'profile_picture': _profilePic,
    };
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProfileScreen(userData: _userData ?? fallbackData),
      ),
    );
    _loadData();
  }

  String _getTimeGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _getInitials() {
    if (_fullName.isEmpty) return 'CG';
    final parts = _fullName
        .split(RegExp(r'\s+'))
        .where((s) => s.isNotEmpty)
        .toList();
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return parts[0].substring(0, parts[0].length >= 2 ? 2 : 1).toUpperCase();
  }

  String _formatRoleLabel(String role) {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Church Admin';
      case 'superadmin':
        return 'Super Admin';
      case 'section_admin':
        return 'Section Leader';
      case 'group_leader':
        return 'Ministry Leader';
      default:
        return 'Congregation Member';
    }
  }

  String _formatCurrency(dynamic value) {
    final numVal = double.tryParse(value?.toString() ?? '0') ?? 0;
    if (numVal <= 0) return 'K0';
    final intVal = numVal.round();
    final str = intVal.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final formatted = str.replaceAllMapped(reg, (Match m) => '${m[1]},');
    return 'K$formatted';
  }

  Future<void> _showThemePickerModal() async {
    final isCurrentlyDark = Theme.of(context).brightness == Brightness.dark;
    final nextMode = isCurrentlyDark ? ThemeMode.light : ThemeMode.dark;
    await ThemeController.setThemeMode(nextMode);
    if (mounted) {
      setState(() {});
    }
  }

  Widget _buildActiveTabBody(
    MamsColors colors, {
    required bool isAdmin,
    required String displayName,
    required String displayOrg,
    required String displayRole,
  }) {
    if (_selectedNavIndex == 1) {
      return const MembersScreen();
    }
    if (_selectedNavIndex == 3) {
      return const ChatChannelsScreen();
    }
    if (_selectedNavIndex == 4) {
      return ProfileScreen(
        userData: _userData ??
            <String, dynamic>{
              'first_name': _fullName.split(' ').first,
              'last_name': _fullName.split(' ').skip(1).join(' '),
              'username': _fullName,
              'role': _role,
              'profile_picture': _profilePic,
              'org_name': _orgName,
              'org_code': _orgCode,
            },
      );
    }

    return SafeArea(
      child: _loading
          ? Center(
              child: CircularProgressIndicator(color: colors.primaryNavy),
            )
          : RefreshIndicator(
              color: colors.primaryNavy,
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. Top Institutional Header (Avatar + Personalized Greeting + Mode Toggle)
                    _buildTopHeader(
                      colors,
                      displayName: displayName,
                      displayOrg: displayOrg,
                      displayRole: displayRole,
                    ),
                    const SizedBox(height: 18),

                    // 2. Unified Deep-Navy Summary Card
                    if (isAdmin) ...[
                      _buildUnifiedSummaryCard(colors),
                      const SizedBox(height: 18),
                    ] else ...[
                      _buildMemberWelcomeBanner(colors, displayOrg),
                      const SizedBox(height: 18),
                    ],

                    // 3. Today's Session Live Strip
                    _buildLiveSessionStrip(colors),
                    const SizedBox(height: 22),

                    // 4. Quick Actions (Uniform 2x3 Institutional Grid)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Quick Actions',
                          style: TextStyle(
                            color: colors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        GestureDetector(
                          onTap: _showThemePickerModal,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: colors.cardSurface,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: colors.cardBorder),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  ThemeController.modeIcon,
                                  size: 13,
                                  color: colors.iconBadgeFg,
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  ThemeController.modeLabel,
                                  style: TextStyle(
                                    color: colors.textSecondary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildQuickActionsGrid(colors),
                    const SizedBox(height: 24),

                    // 5. Latest Announcements
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Latest Announcements',
                          style: TextStyle(
                            color: colors.textPrimary,
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                        TextButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const AnnouncementsScreen(),
                            ),
                          ),
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            minimumSize: const Size(50, 28),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'View all',
                            style: TextStyle(
                              color: colors.accentBlue,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _buildAnnouncementsSection(colors),
                  ],
                ),
              ),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    final isAdmin =
        _role == 'admin' || _role == 'superadmin' || _role == 'section_admin';
    final displayOrg =
        _orgName.isNotEmpty ? _orgName : 'UCZ Changachanga Congregation';
    final displayRole = _formatRoleLabel(_role);
    final displayName = _fullName.isNotEmpty ? _fullName : 'Chiza Gondwe';

    return PopScope(
      canPop: _selectedNavIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _selectedNavIndex != 0) {
          setState(() => _selectedNavIndex = 0);
        }
      },
      child: Scaffold(
        backgroundColor: colors.background,
        body: _buildActiveTabBody(
          colors,
          isAdmin: isAdmin,
          displayName: displayName,
          displayOrg: displayOrg,
          displayRole: displayRole,
        ),
        bottomNavigationBar: _buildBottomNavBar(colors, isAdmin: isAdmin),
      ),
    );
  }

  Widget _buildTopHeader(
    MamsColors colors, {
    required String displayName,
    required String displayOrg,
    required String displayRole,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        GestureDetector(
          onTap: _openProfile,
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: colors.primaryNavy,
              shape: BoxShape.circle,
              border: Border.all(
                color: colors.cardBorder,
                width: 1.5,
              ),
              image: _profilePic != null && _profilePic!.isNotEmpty
                  ? DecorationImage(
                      image: NetworkImage(
                        '$_profilePic?v=${DateTime.now().millisecondsSinceEpoch}',
                      ),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            alignment: Alignment.center,
            child: (_profilePic == null || _profilePic!.isEmpty)
                ? Text(
                    _getInitials(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      letterSpacing: 0.5,
                    ),
                  )
                : null,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${_getTimeGreeting()}, $displayName',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colors.textPrimary,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$displayOrg • $displayRole',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        // Notifications Bell Button (with unread badge for Chat, Announcements, and Admin Approvals)
        _buildHeaderIconButton(
          colors,
          icon: _unreadNotifCount > 0
              ? Icons.notifications_active_rounded
              : Icons.notifications_none_rounded,
          tooltip: 'Notifications',
          badgeCount: _unreadNotifCount,
          onTap: _showNotificationsSheet,
        ),
        const SizedBox(width: 8),
        // Theme Switcher Button (Light / Dark / System)
        _buildHeaderIconButton(
          colors,
          icon: ThemeController.modeIcon,
          tooltip: 'Change Theme (${ThemeController.modeLabel})',
          onTap: _showThemePickerModal,
        ),
        const SizedBox(width: 8),
        // Logout Action
        _buildHeaderIconButton(
          colors,
          icon: Icons.logout_rounded,
          tooltip: 'Sign out',
          onTap: _logout,
        ),
      ],
    );
  }

  Future<void> _markAllNotificationsRead() async {
    final prefs = await SharedPreferences.getInstance();
    final userKey =
        (_userData?['username'] ?? prefs.getString('username') ?? 'user')
            .toString();
    final allIds = _notifications.map((n) => n['id'].toString()).toList();
    await prefs.setStringList('read_notifs_$userKey', allIds);
    if (mounted) {
      setState(() => _unreadNotifCount = 0);
    }
  }

  Future<void> _handleNotificationTap(Map<String, dynamic> notif) async {
    final prefs = await SharedPreferences.getInstance();
    final userKey =
        (_userData?['username'] ?? prefs.getString('username') ?? 'user')
            .toString();
    final readIds = prefs.getStringList('read_notifs_$userKey') ?? <String>[];
    final id = notif['id'].toString();
    if (!readIds.contains(id)) {
      readIds.add(id);
      await prefs.setStringList('read_notifs_$userKey', readIds);
    }
    if (!mounted) return;
    Navigator.pop(context);

    final type = notif['type']?.toString() ?? 'announcement';
    if (type == 'chat') {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ChatChannelsScreen()),
      );
    } else if (type == 'pending') {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const HoldingTankScreen()),
      );
    } else {
      await Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
      );
    }
    _loadData();
  }

  void _showNotificationsSheet() {
    final colors = MamsColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
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
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Notifications',
                          style: TextStyle(
                            color: sheetColors.textPrimary,
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (_unreadNotifCount > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: sheetColors.iconBadgeBg,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '$_unreadNotifCount new',
                              style: TextStyle(
                                color: sheetColors.accentBlue,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (_notifications.isNotEmpty)
                      TextButton(
                        onPressed: () async {
                          await _markAllNotificationsRead();
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        child: Text(
                          'Mark all read',
                          style: TextStyle(
                            color: sheetColors.accentBlue,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                if (_notifications.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text(
                        'No new chat messages or announcements',
                        style: TextStyle(
                          color: sheetColors.textSecondary,
                          fontSize: 13.5,
                        ),
                      ),
                    ),
                  )
                else
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 340),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: _notifications.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final n = _notifications[index];
                        final type = n['type']?.toString() ?? 'announcement';
                        final IconData icon = type == 'chat'
                            ? Icons.forum_rounded
                            : type == 'pending'
                            ? Icons.how_to_reg_rounded
                            : Icons.campaign_rounded;
                        return InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _handleNotificationTap(n),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: sheetColors.subtleSurface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: sheetColors.cardBorder),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: sheetColors.iconBadgeBg,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    icon,
                                    color: sheetColors.iconBadgeFg,
                                    size: 19,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        (n['title'] ?? '').toString(),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: sheetColors.textPrimary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 13.5,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        (n['subtitle'] ?? '').toString(),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: sheetColors.textSecondary,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right_rounded,
                                  color: sheetColors.textMuted,
                                  size: 18,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeaderIconButton(
    MamsColors colors, {
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: colors.cardSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.cardBorder),
              ),
              child: Icon(
                icon,
                size: 19,
                color: colors.textPrimary,
              ),
            ),
            if (badgeCount > 0)
              Positioned(
                top: -3,
                right: -3,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1.5,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: colors.cardSurface, width: 1.5),
                  ),
                  child: Text(
                    badgeCount > 9 ? '9+' : '$badgeCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnifiedSummaryCard(MamsColors colors) {
    final totalMembers = _stats?['total_members'] ?? 0;
    final pendingMembers = _stats?['pending_members'] ?? 0;
    final contributions = _formatCurrency(_stats?['monthly_contributions']);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E3A8A), Color(0xFF172554)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E3A8A).withValues(alpha: 0.22),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _buildSummaryMetric(
                  value: '$totalMembers',
                  label: 'Active Members',
                ),
              ),
              Container(
                width: 1,
                height: 36,
                color: Colors.white.withValues(alpha: 0.16),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 10),
                  child: _buildSummaryMetric(
                    value: '$pendingMembers',
                    label: 'Pending Review',
                  ),
                ),
              ),
              Container(
                width: 1,
                height: 36,
                color: Colors.white.withValues(alpha: 0.16),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 10),
                  child: _buildSummaryMetric(
                    value: contributions,
                    label: 'Contributions',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          InkWell(
            onTap: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const HoldingTankScreen()),
              );
              _loadData();
            },
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.18),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.how_to_reg_rounded,
                    color: Colors.white,
                    size: 17,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      pendingMembers > 0
                          ? 'Review $pendingMembers Pending Approval${pendingMembers == 1 ? '' : 's'}'
                          : 'Member Holding Tank (0 Pending)',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          InkWell(
            onTap: _showOrgJoinQrSheet,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.qr_code_2_rounded,
                    color: Colors.white,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      _orgCode.isNotEmpty
                          ? 'Show Organization Join QR ($_orgCode)'
                          : 'Show Organization Join QR Code',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          InkWell(
            onTap: _showAiInsightsSheet,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 17,
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      (_stats?['ai_insights'] is Map)
                          ? 'AI Forecast: ${_stats!['ai_insights']['predicted_next_attendance'] ?? 0} Turnout • ${(_stats!['ai_insights']['at_risk_count'] ?? 0) + (_stats!['ai_insights']['inactive_count'] ?? 0)} At Risk'
                          : 'AI Smart Forecast & Member Absence Risk',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAiInsightsSheet() {
    final aiRaw = _stats?['ai_insights'];
    final ai = aiRaw is Map<String, dynamic>
        ? aiRaw
        : (aiRaw is Map ? Map<String, dynamic>.from(aiRaw) : <String, dynamic>{});
    final nextAttendance = ai['predicted_next_attendance'] ?? 0;
    final nextContributions = _formatCurrency(ai['predicted_next_month_contributions']);
    final engagedCount = ai['engaged_count'] ?? 0;
    final atRiskCount = ai['at_risk_count'] ?? 0;
    final inactiveCount = ai['inactive_count'] ?? 0;
    final summaryText = (ai['engagement_summary'] ??
            'AI analyzed recent session attendance and contribution history to forecast turnout and identify members who need pastoral follow-up.')
        .toString();
    final riskList = (ai['member_risk_list'] is List)
        ? (ai['member_risk_list'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];

    final colors = MamsColors.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.78,
          minChildSize: 0.5,
          maxChildSize: 0.92,
          builder: (context, scrollController) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
                child: Column(
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
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: sheetColors.iconBadgeBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            Icons.auto_awesome_rounded,
                            color: sheetColors.accentBlue,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AI Smart Insights & Risk Scoring',
                                style: TextStyle(
                                  color: sheetColors.textPrimary,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                'Predictive turnout, financial forecast & absence tracking',
                                style: TextStyle(
                                  color: sheetColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Top Forecast Cards
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: sheetColors.subtleSurface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: sheetColors.cardBorder),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'PREDICTED TURNOUT',
                                  style: TextStyle(
                                    color: sheetColors.textMuted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '$nextAttendance Members',
                                  style: TextStyle(
                                    color: sheetColors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Next Session Forecast',
                                  style: TextStyle(
                                    color: sheetColors.textSecondary,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: sheetColors.subtleSurface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: sheetColors.cardBorder),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'NEXT MONTH FORECAST',
                                  style: TextStyle(
                                    color: sheetColors.textMuted,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  nextContributions,
                                  style: TextStyle(
                                    color: sheetColors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Projected Contributions',
                                  style: TextStyle(
                                    color: sheetColors.textSecondary,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: sheetColors.subtleSurface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: sheetColors.cardBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            summaryText,
                            style: TextStyle(
                              color: sheetColors.textPrimary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildRiskPill(
                                label: 'Engaged: $engagedCount',
                                color: const Color(0xFF10B981),
                              ),
                              const SizedBox(width: 8),
                              _buildRiskPill(
                                label: 'At Risk: $atRiskCount',
                                color: const Color(0xFFF59E0B),
                              ),
                              const SizedBox(width: 8),
                              _buildRiskPill(
                                label: 'Follow-Up: $inactiveCount',
                                color: const Color(0xFFEF4444),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Member Engagement & Absence Risk',
                      style: TextStyle(
                        color: sheetColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: riskList.isEmpty
                          ? Center(
                              child: Text(
                                'No member attendance records analyzed yet.',
                                style: TextStyle(
                                  color: sheetColors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                            )
                          : ListView.separated(
                              controller: scrollController,
                              itemCount: riskList.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 8),
                              itemBuilder: (context, index) {
                                final m = riskList[index];
                                final fullName = (m['full_name'] ?? 'Member').toString();
                                final sectionName = (m['section_name'] ?? 'Unassigned').toString();
                                final score = m['engagement_score'] ?? 0;
                                final status = (m['risk_status'] ?? 'active').toString();
                                final label = (m['risk_label'] ??
                                        (status == 'inactive'
                                            ? 'High Risk'
                                            : status == 'at_risk'
                                            ? 'At Risk'
                                            : 'Engaged'))
                                    .toString();
                                final rec = (m['recommendation'] ?? '').toString();
                                final Color badgeColor = (status == 'inactive' || status == 'High Risk')
                                    ? const Color(0xFFEF4444)
                                    : (status == 'at_risk' || status == 'At Risk')
                                    ? const Color(0xFFF59E0B)
                                    : const Color(0xFF10B981);

                                return Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: sheetColors.subtleSurface,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: sheetColors.cardBorder),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '$fullName • $sectionName',
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(
                                                color: sheetColors.textPrimary,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13.5,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 3,
                                            ),
                                            decoration: BoxDecoration(
                                              color: badgeColor.withValues(alpha: 0.14),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              '$label ($score%)',
                                              style: TextStyle(
                                                color: badgeColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (rec.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          rec,
                                          style: TextStyle(
                                            color: sheetColors.textSecondary,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildRiskPill({required String label, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Future<void> _showOrgJoinQrSheet() async {
    if (_orgCode.isEmpty) {
      final user = await ApiService.getCurrentUser();
      if (!mounted) return;
      final fetched = (user['org_code'] ?? '').toString().trim();
      if (fetched.isNotEmpty) {
        setState(() {
          _orgCode = fetched;
          if (_orgName.isEmpty && user['org_name'] != null) {
            _orgName = user['org_name'].toString();
          }
        });
      }
    }

    if (!mounted) return;
    if (_orgCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Could not load Organization Code yet. Check server connection and pull down to refresh.',
          ),
        ),
      );
      return;
    }

    final colors = MamsColors.of(context);
    final qrPayload = 'MAMS-JOIN:$_orgCode';
    final displayOrg = _orgName.isNotEmpty ? _orgName : 'Organization';

    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  displayOrg,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: sheetColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Scan on the MAMS Register screen to join this organization (works 100% offline)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: sheetColors.textSecondary,
                    fontSize: 12.5,
                  ),
                ),
                const SizedBox(height: 18),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: sheetColors.cardBorder),
                  ),
                  child: QrImageView(
                    data: qrPayload,
                    version: QrVersions.auto,
                    size: 215,
                    backgroundColor: Colors.white,
                    eyeStyle: const QrEyeStyle(
                      eyeShape: QrEyeShape.square,
                      color: Color(0xFF0F172A),
                    ),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: sheetColors.iconBadgeBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _orgCode,
                    style: TextStyle(
                      color: sheetColors.accentBlue,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryMetric({required String value, required String label}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.82),
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildMemberWelcomeBanner(MamsColors colors, String displayOrg) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E3A8A), Color(0xFF172554)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayOrg,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Scan the service QR code to check in or view your member pass.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 12.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          InkWell(
            onTap: _showOrgJoinQrSheet,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.qr_code_2_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLiveSessionStrip(MamsColors colors) {
    final rawTitle =
        _stats?['active_session_title'] ?? _userData?['active_session_title'];
    final sessionTitle = rawTitle?.toString().trim() ?? '';
    final hasActiveSession = sessionTitle.isNotEmpty;
    final checkedInToday = _userData?['checked_in_today'] == true;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Today's Session",
          style: TextStyle(
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 10),
        InkWell(
          onTap: hasActiveSession
              ? () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ScanQrScreen()),
                  );
                  _loadData();
                }
              : null,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            decoration: BoxDecoration(
              color: colors.cardSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.cardBorder),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: hasActiveSession
                        ? colors.successBg
                        : colors.subtleSurface,
                    borderRadius: BorderRadius.circular(6),
                    border: hasActiveSession
                        ? null
                        : Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: hasActiveSession
                              ? colors.successGreen
                              : colors.textMuted,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        hasActiveSession ? 'LIVE' : 'OFFLINE',
                        style: TextStyle(
                          color: hasActiveSession
                              ? colors.successGreen
                              : colors.textSecondary,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    hasActiveSession
                        ? sessionTitle
                        : 'No active session today',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: hasActiveSession
                          ? colors.textPrimary
                          : colors.textSecondary,
                      fontSize: 13.5,
                      fontWeight: hasActiveSession
                          ? FontWeight.w600
                          : FontWeight.w500,
                    ),
                  ),
                ),
                if (hasActiveSession) ...[
                  const SizedBox(width: 8),
                  Text(
                    checkedInToday ? 'Checked In ✓' : 'Check In',
                    style: TextStyle(
                      color: checkedInToday
                          ? colors.successGreen
                          : colors.accentBlue,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (!checkedInToday) ...[
                    const SizedBox(width: 2),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: colors.accentBlue,
                      size: 18,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionsGrid(MamsColors colors) {
    final totalMembers = _stats?['total_members'];
    final directorySub = totalMembers != null && totalMembers > 0
        ? '$totalMembers active members'
        : 'Active members';
    final noticesSub = _announcements.isNotEmpty
        ? '${_announcements.length} recent notice${_announcements.length == 1 ? '' : 's'}'
        : 'Recent notices';

    final actions = [
      _ActionItem(
        icon: Icons.qr_code_scanner_rounded,
        title: 'Scan QR',
        subtitle: 'Record check-in',
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ScanQrScreen()),
        ),
      ),
      _ActionItem(
        icon: Icons.qr_code_2_rounded,
        title: 'Join QR Code',
        subtitle: _orgCode.isNotEmpty ? _orgCode : 'Invite new members',
        onTap: _showOrgJoinQrSheet,
      ),
      _ActionItem(
        icon: Icons.campaign_outlined,
        title: 'Announcements',
        subtitle: noticesSub,
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const AnnouncementsScreen()),
        ),
      ),
      _ActionItem(
        icon: Icons.people_outline_rounded,
        title: 'Directory',
        subtitle: directorySub,
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MembersScreen()),
        ),
      ),
      _ActionItem(
        icon: Icons.account_balance_wallet_outlined,
        title: 'Contributions',
        subtitle: 'Tithes & pledges',
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ContributionsScreen()),
        ),
      ),
      _ActionItem(
        icon: Icons.location_on_outlined,
        title: 'Member Map',
        subtitle: 'Lusaka GIS pins',
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const MemberMapScreen()),
        ),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: actions.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.48,
      ),
      itemBuilder: (context, index) {
        final item = actions[index];
        return InkWell(
          onTap: item.onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: colors.cardSurface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.cardBorder),
              boxShadow: colors.isDark
                  ? null
                  : [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colors.iconBadgeBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    item.icon,
                    color: colors.iconBadgeFg,
                    size: 19,
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAnnouncementsSection(MamsColors colors) {
    if (_announcements.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        decoration: BoxDecoration(
          color: colors.cardSurface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colors.cardBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: colors.iconBadgeBg,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.notifications_none_rounded,
                color: colors.iconBadgeFg,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'No recent announcements',
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Official parish & committee notices will appear here.',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 12.5,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      children: _announcements.take(3).map((a) {
        final isUrgent = a['priority'] == 'URGENT';
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: colors.cardSurface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isUrgent
                  ? colors.warningAmber.withValues(alpha: 0.5)
                  : colors.cardBorder,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (isUrgent)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 2,
                      ),
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color: colors.warningBg,
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        'URGENT',
                        style: TextStyle(
                          color: colors.warningAmber,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  Expanded(
                    child: Text(
                      a['title'] ?? '',
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 14.5,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                a['body'] ?? a['content'] ?? '',
                style: TextStyle(
                  color: colors.textSecondary,
                  fontSize: 13,
                  height: 1.35,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  void _showCenterQuickActionsSheet(MamsColors colors, bool isAdmin) {
    if (!isAdmin) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ScanQrScreen()),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Quick Actions',
                  style: TextStyle(
                    color: sheetColors.textPrimary,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 14),
                ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF2563EB)),
                  ),
                  title: Text(
                    'Scan Attendance QR Code',
                    style: TextStyle(color: sheetColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5),
                  ),
                  subtitle: Text(
                    'Check into an active service or meeting',
                    style: TextStyle(color: sheetColors.textSecondary, fontSize: 12),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ScanQrScreen()),
                    );
                  },
                ),
                ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: sheetColors.iconBadgeBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.qr_code_2_rounded, color: sheetColors.iconBadgeFg),
                  ),
                  title: Text(
                    'Show Organization Join QR',
                    style: TextStyle(color: sheetColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5),
                  ),
                  subtitle: Text(
                    'Let new members scan to join ${_orgName.isNotEmpty ? _orgName : 'your organization'}',
                    style: TextStyle(color: sheetColors.textSecondary, fontSize: 12),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    _showOrgJoinQrSheet();
                  },
                ),
                ListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  leading: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: sheetColors.warningBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.how_to_reg_rounded, color: sheetColors.warningAmber),
                  ),
                  title: Text(
                    'Holding Tank Approvals',
                    style: TextStyle(color: sheetColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 14.5),
                  ),
                  subtitle: Text(
                    'Approve or assign pending members',
                    style: TextStyle(color: sheetColors.textSecondary, fontSize: 12),
                  ),
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const HoldingTankScreen()),
                    ).then((_) => _loadData());
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomNavBar(MamsColors colors, {required bool isAdmin}) {
    const activeBlue = Color(0xFF2563EB);

    Widget buildNavSlot({
      required int index,
      required IconData icon,
      required IconData activeIcon,
      required String label,
    }) {
      final isSelected = _selectedNavIndex == index;
      final itemColor = isSelected ? activeBlue : colors.textSecondary;

      return Expanded(
        child: InkWell(
          onTap: () {
            if (_selectedNavIndex != index) {
              setState(() => _selectedNavIndex = index);
              if (index == 0) {
                _loadData();
              }
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isSelected ? activeIcon : icon,
                  color: itemColor,
                  size: 23,
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(
                    color: itemColor,
                    fontSize: 11.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: colors.cardSurface,
        border: Border(top: BorderSide(color: colors.cardBorder)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: colors.isDark ? 0.25 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              buildNavSlot(
                index: 0,
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: 'Home',
              ),
              buildNavSlot(
                index: 1,
                icon: Icons.people_outline_rounded,
                activeIcon: Icons.people_rounded,
                label: 'Directory',
              ),
              // Center Solid Blue Circular Button (like reference design)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                child: GestureDetector(
                  onTap: () => _showCenterQuickActionsSheet(colors, isAdmin),
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: activeBlue,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: activeBlue.withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(
                      isAdmin ? Icons.add_rounded : Icons.qr_code_scanner_rounded,
                      color: Colors.white,
                      size: 25,
                    ),
                  ),
                ),
              ),
              buildNavSlot(
                index: 3,
                icon: Icons.groups_outlined,
                activeIcon: Icons.groups_rounded,
                label: 'Groups',
              ),
              buildNavSlot(
                index: 4,
                icon: Icons.more_horiz_rounded,
                activeIcon: Icons.more_horiz_rounded,
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionItem {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });
}
