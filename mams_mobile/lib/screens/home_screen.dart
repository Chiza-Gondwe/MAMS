import 'package:flutter/material.dart';
import 'member_map_screen.dart';
import 'profile_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'scan_qr_screen.dart';
import 'announcements_screen.dart';
import 'members_screen.dart';
import 'contributions_screen.dart';
import 'holding_tank_screen.dart';
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<dynamic> _announcements = [];
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String _role = 'member';
  String? _profilePic;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() => _role = prefs.getString('role') ?? 'member');

    try {
      final user = await ApiService.getCurrentUser();
      final announcements = await ApiService.getAnnouncements();
      
      Map<String, dynamic>? stats;
      if (_role == 'admin' || _role == 'superadmin') {
        stats = await ApiService.getMobileDashboardStats();
      }

      if (!mounted) return;
      setState(() {
        if (!user.containsKey('error')) {
          _profilePic = user['profile_picture'];
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F3864),
        title: const Text(
          'MAMS',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: _profilePic != null
                ? CircleAvatar(
                    radius: 14,
                    backgroundImage: NetworkImage('$_profilePic?v=${DateTime.now().millisecondsSinceEpoch}'),
                    backgroundColor: Colors.transparent,
                  )
                : const Icon(Icons.person, color: Colors.white),
            onPressed: () async {
              showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
              final user = await ApiService.getCurrentUser();
              if (mounted) Navigator.pop(context); // close dialog
              if (!user.containsKey('error') && mounted) {
                await Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(userData: user)));
                _loadData(); // Reload in case profile picture was updated
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
            onPressed: () => Navigator.pushNamed(context, '/scan'),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: _logout,
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF4CAF50)),
            )
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF1F3864), Color(0xFF2E5090)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.people_alt_rounded,
                            color: Colors.white,
                            size: 36,
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Welcome to MAMS',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Role: ${_role.toUpperCase()}',
                            style: const TextStyle(
                              color: Colors.white60,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Admin Dashboard Stats
                    if (_stats != null && (_role == 'admin' || _role == 'superadmin')) ...[
                      const Text(
                        'Admin Dashboard',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _StatCard(title: 'Members', value: '${_stats!['total_members'] ?? 0}', icon: Icons.people, color: Colors.blue)),
                          const SizedBox(width: 8),
                          Expanded(child: _StatCard(title: 'Pending', value: '${_stats!['pending_members'] ?? 0}', icon: Icons.person_add, color: Colors.orange)),
                          const SizedBox(width: 8),
                          Expanded(child: _StatCard(title: 'Finances', value: 'K${_stats!['monthly_contributions'] ?? 0}', icon: Icons.monetization_on, color: Colors.green)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HoldingTankScreen())),
                          icon: const Icon(Icons.approval),
                          label: const Text('View Pending Approvals'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Quick actions
                    const Text(
                      'Quick Actions',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    GridView.count(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.5,
                      children: [
                        _ActionCard(
                          icon: Icons.qr_code_scanner,
                          label: 'Scan QR',
                          color: const Color(0xFF4CAF50),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ScanQrScreen())),
                        ),
                        _ActionCard(
                          icon: Icons.campaign_outlined,
                          label: 'Announcements',
                          color: const Color(0xFF2196F3),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AnnouncementsScreen())),
                        ),
                        _ActionCard(
                          icon: Icons.people_outline,
                          label: 'Directory',
                          color: const Color(0xFF9C27B0),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MembersScreen())),
                        ),
                        _ActionCard(
                          icon: Icons.account_balance_wallet_outlined,
                          label: 'Contributions',
                          color: const Color(0xFFFF9800),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ContributionsScreen())),
                        ),
                        _ActionCard(
                          icon: Icons.map_outlined,
                          label: 'Member Map',
                          color: const Color(0xFFE91E63),
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MemberMapScreen())),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Latest announcements
                    const Text(
                      'Latest Announcements',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_announcements.isEmpty)
                      const Center(
                        child: Text(
                          'No announcements yet',
                          style: TextStyle(color: Colors.white60),
                        ),
                      )
                    else
                      ..._announcements
                          .take(3)
                          .map((a) => _AnnouncementCard(announcement: a)),
                  ],
                ),
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(color: color, fontSize: 12), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final Map<String, dynamic> announcement;

  const _AnnouncementCard({required this.announcement});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                announcement['announcement_type'] == 'video'
                    ? Icons.play_circle_outline
                    : Icons.campaign_outlined,
                color: const Color(0xFF4CAF50),
                size: 18,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  announcement['title'] ?? '',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            announcement['content'] ?? '',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white60, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
