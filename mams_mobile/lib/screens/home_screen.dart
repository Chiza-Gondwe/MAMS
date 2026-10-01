import 'package:flutter/material.dart';
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
  Map<String, dynamic>? _stats;
  Map<String, dynamic>? _userData;
  bool _loading = true;
  String _role = 'member';
  String _fullName = '';
  String _orgName = '';
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
      });
    }

    try {
      final results = await Future.wait([
        ApiService.getCurrentUser(),
        ApiService.getAnnouncements(),
      ]);
      final user = results[0] as Map<String, dynamic>;
      final announcements = results[1] as List<dynamic>;

      Map<String, dynamic>? stats;
      final effectiveRole = (!user.containsKey('error') && user['role'] != null)
          ? user['role'].toString()
          : _role;

      if (effectiveRole == 'admin' ||
          effectiveRole == 'superadmin' ||
          effectiveRole == 'section_admin') {
        stats = await ApiService.getMobileDashboardStats();
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
        _stats = stats;
        _announcements = announcements;
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

  void _showThemePickerModal() {
    final colors = MamsColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return ValueListenableBuilder<ThemeMode>(
          valueListenable: ThemeController.themeModeNotifier,
          builder: (context, currentMode, _) {
            final sheetColors = MamsColors.of(context);
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
                    Text(
                      'Appearance Mode',
                      style: TextStyle(
                        color: sheetColors.textPrimary,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Choose how MAMS looks on your device',
                      style: TextStyle(
                        color: sheetColors.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildThemeOptionTile(
                      sheetColors,
                      mode: ThemeMode.light,
                      currentMode: currentMode,
                      icon: Icons.light_mode_rounded,
                      title: 'Light Mode (Institutional)',
                      subtitle: 'Warm off-white surface with crisp white cards',
                    ),
                    const SizedBox(height: 10),
                    _buildThemeOptionTile(
                      sheetColors,
                      mode: ThemeMode.dark,
                      currentMode: currentMode,
                      icon: Icons.dark_mode_rounded,
                      title: 'Dark Mode (Matte Slate)',
                      subtitle: 'Low-glare charcoal surface with subtle borders',
                    ),
                    const SizedBox(height: 10),
                    _buildThemeOptionTile(
                      sheetColors,
                      mode: ThemeMode.system,
                      currentMode: currentMode,
                      icon: Icons.brightness_auto_rounded,
                      title: 'System Default',
                      subtitle: 'Automatically match your phone settings',
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

  Widget _buildThemeOptionTile(
    MamsColors colors, {
    required ThemeMode mode,
    required ThemeMode currentMode,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final selected = mode == currentMode;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        await ThemeController.setThemeMode(mode);
        if (mounted) Navigator.pop(context);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? colors.iconBadgeBg : colors.subtleSurface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? colors.accentBlue : colors.cardBorder,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: selected
                    ? colors.primaryNavy
                    : colors.cardSurface,
                shape: BoxShape.circle,
                border: Border.all(color: colors.cardBorder),
              ),
              child: Icon(
                icon,
                size: 20,
                color: selected ? Colors.white : colors.textSecondary,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              selected
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              color: selected ? colors.accentBlue : colors.textMuted,
              size: 22,
            ),
          ],
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

    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
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
      ),
      bottomNavigationBar: _buildBottomNavBar(colors),
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

  Widget _buildHeaderIconButton(
    MamsColors colors, {
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
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
        ],
      ),
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
          Container(
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
      _ActionItem(
        icon: Icons.forum_outlined,
        title: 'Group Chat',
        subtitle: 'Active channels',
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const ChatChannelsScreen()),
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

  Widget _buildBottomNavBar(MamsColors colors) {
    return Container(
      decoration: BoxDecoration(
        color: colors.cardSurface,
        border: Border(top: BorderSide(color: colors.cardBorder)),
      ),
      child: BottomNavigationBar(
        currentIndex: 0,
        type: BottomNavigationBarType.fixed,
        backgroundColor: colors.cardSurface,
        selectedItemColor: colors.accentBlue,
        unselectedItemColor: colors.textSecondary,
        selectedLabelStyle: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w500,
        ),
        elevation: 0,
        onTap: (index) {
          switch (index) {
            case 0:
              break;
            case 1:
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MembersScreen()),
              );
              break;
            case 2:
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ScanQrScreen()),
              );
              break;
            case 3:
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ChatChannelsScreen()),
              );
              break;
            case 4:
              _openProfile();
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_filled),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline_rounded),
            label: 'Directory',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.qr_code_scanner_rounded),
            label: 'Scan QR',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline_rounded),
            label: 'Chat',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded),
            label: 'Profile',
          ),
        ],
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
