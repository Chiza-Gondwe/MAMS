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
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchMembers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchMembers() async {
    if (mounted) setState(() => _isLoading = true);
    final data = await ApiService.getMembers();
    if (!mounted) return;
    setState(() {
      _allMembers = data;
      _filteredMembers = data;
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
          return name.contains(query.toLowerCase()) ||
              role.contains(query.toLowerCase());
        }).toList();
      });
    }
  }

  String _formatRole(String? rawRole) {
    switch ((rawRole ?? 'member').toLowerCase()) {
      case 'admin':
        return 'Church Admin';
      case 'superadmin':
        return 'Super Admin';
      case 'section_admin':
        return 'Section Leader';
      case 'zone_admin':
        return 'Zone Leader';
      case 'group_leader':
        return 'Ministry Leader';
      default:
        return 'Congregation Member';
    }
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
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 10),
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
