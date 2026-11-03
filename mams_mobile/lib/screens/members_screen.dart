import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class MembersScreen extends StatefulWidget {
  const MembersScreen({super.key});

  @override
  State<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends State<MembersScreen> {
  List<dynamic> _allMembers = [];
  List<dynamic> _filteredMembers = [];
  List<dynamic> _sections = [];
  List<dynamic> _zones = [];
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  String _currentUserRole = 'member';
  int? _currentUserSectionId;
  int? _currentUserZoneId;

  @override
  void initState() {
    super.initState();
    _initData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initData() async {
    await _fetchCurrentUser();
    await Future.wait([
      _fetchMembers(),
      _fetchSectionsAndZones(),
    ]);
  }

  Future<void> _fetchCurrentUser() async {
    try {
      final user = await ApiService.getCurrentUser();
      if (mounted) {
        setState(() {
          _currentUserRole = (user['role'] ?? 'member').toString().toLowerCase();
          _currentUserSectionId = user['section'] is int
              ? user['section']
              : (user['section'] is Map ? user['section']['id'] : null);
          _currentUserZoneId = user['zone'] is int
              ? user['zone']
              : (user['zone'] is Map ? user['zone']['id'] : null);
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchSectionsAndZones() async {
    try {
      final results = await Future.wait([
        ApiService.getSections(),
        ApiService.getZones(),
      ]);
      if (mounted) {
        setState(() {
          _sections = results[0];
          _zones = results[1];
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchMembers() async {
    if (mounted) setState(() => _isLoading = true);
    final data = await ApiService.getMembers();
    if (!mounted) return;
    setState(() {
      _allMembers = data;
      _filterMembers(_searchController.text);
      _isLoading = false;
    });
  }

  void _filterMembers(String query) {
    if (query.isEmpty) {
      setState(() {
        _filteredMembers = _allMembers;
      });
    } else {
      setState(() {
        _filteredMembers = _allMembers.where((m) {
          final name = '${m['first_name']} ${m['last_name']}'.toLowerCase();
          final role = (m['role'] ?? '').toString().toLowerCase();
          final section = (m['section_name'] ?? '').toString().toLowerCase();
          return name.contains(query.toLowerCase()) ||
              role.contains(query.toLowerCase()) ||
              section.contains(query.toLowerCase());
        }).toList();
      });
    }
  }

  bool _canManageMember(Map<String, dynamic> member) {
    if (['admin', 'superadmin', 'treasurer'].contains(_currentUserRole)) {
      return true;
    }
    final memberSecId = member['section'] is int
        ? member['section']
        : (member['section'] is Map ? member['section']['id'] : null);
    final memberZoneId = member['zone'] is int
        ? member['zone']
        : (member['zone'] is Map ? member['zone']['id'] : null);

    if (['zone_admin', 'zone_treasurer'].contains(_currentUserRole)) {
      return _currentUserZoneId != null && memberZoneId == _currentUserZoneId;
    }
    if (['section_admin', 'section_treasurer'].contains(_currentUserRole)) {
      return _currentUserSectionId != null && memberSecId == _currentUserSectionId;
    }
    return false;
  }

  String _formatRole(String? rawRole) {
    switch ((rawRole ?? 'member').toLowerCase()) {
      case 'admin':
        return 'Church Admin';
      case 'superadmin':
        return 'Super Admin';
      case 'treasurer':
        return 'Church Treasurer';
      case 'zone_treasurer':
        return 'Zone Treasurer';
      case 'section_treasurer':
        return 'Section Treasurer';
      case 'section_admin':
        return 'Section Elder';
      case 'zone_admin':
        return 'Zone Elder';
      case 'group_leader':
        return 'Ministry Leader';
      default:
        return 'Congregation Member';
    }
  }

  void _openEditMemberSheet(Map<String, dynamic> member) {
    final colors = MamsColors.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);
    final memberId = member['id'] as int;

    final firstNameController =
        TextEditingController(text: (member['first_name'] ?? '').toString());
    final lastNameController =
        TextEditingController(text: (member['last_name'] ?? '').toString());
    final phoneController =
        TextEditingController(text: (member['phone_number'] ?? '').toString());

    String selectedRole = (member['role'] ?? 'member').toString();
    int? selectedSection = member['section'] is int
        ? member['section']
        : (member['section'] is Map ? member['section']['id'] : null);
    int? selectedZone = member['zone'] is int
        ? member['zone']
        : (member['zone'] is Map ? member['zone']['id'] : null);

    final termStatusDisplay =
        (member['term_status_display'] ?? _formatRole(member['role'])).toString();
    final termEndDate = (member['term_end_date'] ?? '').toString();

    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                left: 20,
                right: 20,
                top: 20,
              ),
              decoration: BoxDecoration(
                color: colors.cardSurface,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: colors.cardBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: colors.iconBadgeBg,
                          child: Icon(Icons.person_rounded, color: colors.iconBadgeFg),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Edit Member',
                                style: TextStyle(
                                  color: colors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              ),
                              Text(
                                '${member['first_name'] ?? ''} ${member['last_name'] ?? ''}'.trim(),
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(Icons.close_rounded, color: colors.textSecondary),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Divider(color: colors.cardBorder, height: 1),
                    const SizedBox(height: 16),

                    // First & Last Name
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: firstNameController,
                            style: TextStyle(color: colors.textPrimary),
                            decoration: InputDecoration(
                              labelText: 'First Name',
                              labelStyle: TextStyle(color: colors.textSecondary),
                              filled: true,
                              fillColor: colors.subtleSurface,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: colors.cardBorder),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: lastNameController,
                            style: TextStyle(color: colors.textPrimary),
                            decoration: InputDecoration(
                              labelText: 'Last Name',
                              labelStyle: TextStyle(color: colors.textSecondary),
                              filled: true,
                              fillColor: colors.subtleSurface,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: BorderSide(color: colors.cardBorder),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Phone Number
                    TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: colors.textPrimary),
                      decoration: InputDecoration(
                        labelText: 'Phone Number',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.phone_rounded, color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Role Dropdown
                    DropdownButtonFormField<String>(
                      initialValue: [
                        'member',
                        'section_admin',
                        'section_treasurer',
                        'zone_admin',
                        'zone_treasurer',
                        'treasurer',
                        'group_leader',
                        'admin',
                      ].contains(selectedRole)
                          ? selectedRole
                          : 'member',
                      dropdownColor: colors.cardSurface,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Church Role',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.badge_rounded, color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: 'member',
                          child: Text('Congregation Member'),
                        ),
                        const DropdownMenuItem(
                          value: 'section_admin',
                          child: Text('Section Elder'),
                        ),
                        const DropdownMenuItem(
                          value: 'section_treasurer',
                          child: Text('Section Treasurer'),
                        ),
                        const DropdownMenuItem(
                          value: 'zone_admin',
                          child: Text('Zone Elder'),
                        ),
                        const DropdownMenuItem(
                          value: 'zone_treasurer',
                          child: Text('Zone Treasurer'),
                        ),
                        const DropdownMenuItem(
                          value: 'treasurer',
                          child: Text('Church Treasurer'),
                        ),
                        const DropdownMenuItem(
                          value: 'group_leader',
                          child: Text('Ministry Leader'),
                        ),
                        if (['admin', 'superadmin'].contains(_currentUserRole))
                          const DropdownMenuItem(
                            value: 'admin',
                            child: Text('Church Admin'),
                          ),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedRole = val);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Section Dropdown
                    DropdownButtonFormField<int?>(
                      initialValue: _sections.any((s) => s['id'] == selectedSection)
                          ? selectedSection
                          : null,
                      dropdownColor: colors.cardSurface,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Section',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.place_rounded, color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('No Section Assigned'),
                        ),
                        ..._sections.map<DropdownMenuItem<int?>>((s) {
                          return DropdownMenuItem<int?>(
                            value: s['id'] as int?,
                            child: Text(s['name']?.toString() ?? 'Section ${s['id']}'),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setModalState(() => selectedSection = val);
                      },
                    ),
                    const SizedBox(height: 12),

                    // Zone Dropdown
                    DropdownButtonFormField<int?>(
                      initialValue: _zones.any((z) => z['id'] == selectedZone)
                          ? selectedZone
                          : null,
                      dropdownColor: colors.cardSurface,
                      style: TextStyle(color: colors.textPrimary, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'Zone',
                        labelStyle: TextStyle(color: colors.textSecondary),
                        prefixIcon: Icon(Icons.map_rounded, color: colors.accentBlue, size: 20),
                        filled: true,
                        fillColor: colors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                      items: [
                        const DropdownMenuItem<int?>(
                          value: null,
                          child: Text('No Zone Assigned'),
                        ),
                        ..._zones.map<DropdownMenuItem<int?>>((z) {
                          return DropdownMenuItem<int?>(
                            value: z['id'] as int?,
                            child: Text(z['name']?.toString() ?? 'Zone ${z['id']}'),
                          );
                        }),
                      ],
                      onChanged: (val) {
                        setModalState(() => selectedZone = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    // Leadership Term Section (if leadership role)
                    if (selectedRole != 'member') ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colors.subtleSurface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.timer_outlined, size: 18, color: colors.accentBlue),
                                const SizedBox(width: 8),
                                Text(
                                  'Leadership Term & Elections',
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              termEndDate.isNotEmpty
                                  ? 'Current Term: $termStatusDisplay • Ends $termEndDate'
                                  : 'Status: $termStatusDisplay (No end date recorded)',
                              style: TextStyle(color: colors.textSecondary, fontSize: 12),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: colors.successGreen,
                                      side: BorderSide(color: colors.successGreen),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    icon: const Icon(Icons.refresh_rounded, size: 16),
                                    label: const Text('Renew (3 Yrs)', style: TextStyle(fontSize: 12)),
                                    onPressed: isSubmitting
                                        ? null
                                        : () async {
                                            setModalState(() => isSubmitting = true);
                                            final ok = await ApiService.renewMemberTerm(memberId, years: 3);
                                            setModalState(() => isSubmitting = false);
                                            if (ok) {
                                              nav.pop();
                                              messenger.showSnackBar(
                                                const SnackBar(
                                                  content: Text('Leadership term renewed for 3 years!'),
                                                  backgroundColor: Color(0xFF10B981),
                                                ),
                                              );
                                              _fetchMembers();
                                            }
                                          },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: colors.dangerRed,
                                      side: BorderSide(color: colors.dangerRed),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    icon: const Icon(Icons.arrow_downward_rounded, size: 16),
                                    label: const Text('Step Down', style: TextStyle(fontSize: 12)),
                                    onPressed: isSubmitting
                                        ? null
                                        : () async {
                                            setModalState(() => isSubmitting = true);
                                            final ok = await ApiService.concludeMemberTerm(memberId);
                                            setModalState(() => isSubmitting = false);
                                            if (ok) {
                                              nav.pop();
                                              messenger.showSnackBar(
                                                const SnackBar(
                                                  content: Text('Member term concluded and stepped down.'),
                                                  backgroundColor: Color(0xFF6B7280),
                                                ),
                                              );
                                              _fetchMembers();
                                            }
                                          },
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colors.primaryNavy,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                setModalState(() => isSubmitting = true);
                                final payload = {
                                  'first_name': firstNameController.text.trim(),
                                  'last_name': lastNameController.text.trim(),
                                  'phone_number': phoneController.text.trim(),
                                  'role': selectedRole,
                                  'section': selectedSection,
                                  'zone': selectedZone,
                                };
                                final ok = await ApiService.updateMember(memberId, payload);
                                setModalState(() => isSubmitting = false);
                                if (ok) {
                                  nav.pop();
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Member updated successfully!'),
                                      backgroundColor: Color(0xFF10B981),
                                    ),
                                  );
                                  _fetchMembers();
                                } else {
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Failed to update member. Check permissions.'),
                                      backgroundColor: Color(0xFFEF4444),
                                    ),
                                  );
                                }
                              },
                        child: isSubmitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Save Changes',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
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

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Member Directory',
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
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            color: colors.cardSurface,
            child: TextField(
              controller: _searchController,
              onChanged: _filterMembers,
              style: TextStyle(color: colors.textPrimary, fontSize: 14.5),
              decoration: InputDecoration(
                hintText: 'Search members by name or role...',
                hintStyle: TextStyle(color: colors.textMuted, fontSize: 14),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: colors.textSecondary,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(
                          Icons.close_rounded,
                          size: 18,
                          color: colors.textSecondary,
                        ),
                        onPressed: () {
                          _searchController.clear();
                          _filterMembers('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: colors.subtleSurface,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.cardBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.accentBlue, width: 1.4),
                ),
              ),
            ),
          ),
          Divider(height: 1, color: colors.cardBorder),
          if (ApiService.isOfflineMode)
            GestureDetector(
              onTap: _fetchMembers,
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.cloud_off_rounded, size: 16, color: Color(0xFFB45309)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Offline Mode • Showing saved directory. Tap to refresh.',
                        style: TextStyle(
                          color: Color(0xFF92400E),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Icon(Icons.refresh_rounded, size: 16, color: Color(0xFFB45309)),
                  ],
                ),
              ),
            ),
          Expanded(
            child: _isLoading
                ? Center(
                    child: CircularProgressIndicator(color: colors.primaryNavy),
                  )
                : _filteredMembers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.people_outline_rounded,
                              size: 48,
                              color: colors.textMuted,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No members found',
                              style: TextStyle(
                                color: colors.textSecondary,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: colors.primaryNavy,
                        onRefresh: _fetchMembers,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredMembers.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final m = _filteredMembers[index];
                            final firstStr =
                                (m['first_name'] ?? '').toString().trim();
                            final lastStr =
                                (m['last_name'] ?? '').toString().trim();
                            final fullName = '$firstStr $lastStr'.trim();
                            final initial = firstStr.isNotEmpty
                                ? firstStr[0].toUpperCase()
                                : '?';
                            final picUrl = m['profile_picture']?.toString();
                            final phone =
                                (m['phone_number'] ?? '').toString().trim();
                            final sectionName =
                                (m['section_name'] ?? '').toString().trim();
                            final termStat = (m['term_status'] ?? '').toString();
                            final canManage = _canManageMember(m);

                            return Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: colors.cardSurface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: colors.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: colors.iconBadgeBg,
                                    backgroundImage:
                                        (picUrl != null && picUrl.isNotEmpty)
                                            ? NetworkImage(picUrl)
                                            : null,
                                    child: (picUrl == null || picUrl.isEmpty)
                                        ? Text(
                                            initial,
                                            style: TextStyle(
                                              color: colors.iconBadgeFg,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 16,
                                            ),
                                          )
                                        : null,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          fullName.isNotEmpty
                                              ? fullName
                                              : (m['username'] ?? 'Member')
                                                  .toString(),
                                          style: TextStyle(
                                            color: colors.textPrimary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 15,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          sectionName.isNotEmpty
                                              ? '${_formatRole(m['role']?.toString())} • $sectionName'
                                              : _formatRole(
                                                  m['role']?.toString(),
                                                ),
                                          style: TextStyle(
                                            color: colors.textSecondary,
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        if (termStat == 'expiring_soon') ...[
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFFEF3C7),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              'Term Ending Soon',
                                              style: TextStyle(
                                                color: Color(0xFFB45309),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ] else if (termStat == 'pending_transition') ...[
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFFFEDD5),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              'Term Concluded (Pending Transition)',
                                              style: TextStyle(
                                                color: Color(0xFFC2410C),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  if (phone.isNotEmpty) ...[
                                    IconButton(
                                      tooltip: 'Call member',
                                      icon: Icon(
                                        Icons.phone_in_talk_rounded,
                                        color: colors.accentBlue,
                                        size: 20,
                                      ),
                                      onPressed: () {
                                        launchUrl(Uri.parse('tel:$phone'));
                                      },
                                    ),
                                    IconButton(
                                      tooltip: 'WhatsApp member',
                                      icon: Icon(
                                        Icons.chat_bubble_rounded,
                                        color: colors.successGreen,
                                        size: 20,
                                      ),
                                      onPressed: () {
                                        String clean = phone.replaceAll(
                                          RegExp(r'\D'),
                                          '',
                                        );
                                        if (clean.startsWith('0')) {
                                          clean = '260${clean.substring(1)}';
                                        } else if (!clean.startsWith('260')) {
                                          clean = '260$clean';
                                        }
                                        launchUrl(
                                          Uri.parse('https://wa.me/$clean'),
                                        );
                                      },
                                    ),
                                  ],
                                  if (canManage)
                                    IconButton(
                                      tooltip: 'Edit member details',
                                      icon: Icon(
                                        Icons.edit_outlined,
                                        color: colors.primaryNavy,
                                        size: 20,
                                      ),
                                      onPressed: () => _openEditMemberSheet(m),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
