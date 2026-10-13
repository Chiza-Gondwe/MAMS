import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class HoldingTankScreen extends StatefulWidget {
  const HoldingTankScreen({super.key});

  @override
  State<HoldingTankScreen> createState() => _HoldingTankScreenState();
}

class _HoldingTankScreenState extends State<HoldingTankScreen> {
  List<dynamic> _pendingMembers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPendingMembers();
  }

  Future<void> _fetchPendingMembers() async {
    if (mounted) setState(() => _isLoading = true);
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final token = await ApiService.getToken();
      final response = await http
          .get(
            Uri.parse('$baseUrl/members/?status=pending_review'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (!mounted) return;
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = (data is Map && data['results'] is List)
            ? data['results'] as List<dynamic>
            : (data is List ? data : <dynamic>[]);
        setState(() {
          _pendingMembers = list;
          _isLoading = false;
        });

        // Sync pending_members count back into cached dashboard stats immediately
        try {
          final prefs = await SharedPreferences.getInstance();
          final cached = prefs.getString('cached_dashboard_json');
          if (cached != null) {
            final map = jsonDecode(cached) as Map<String, dynamic>;
            map['pending_members'] = list.length;
            await prefs.setString('cached_dashboard_json', jsonEncode(map));
          }
        } catch (_) {}
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _approveMember(int id) async {
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final token = await ApiService.getToken();
      final response = await http
          .post(
            Uri.parse('$baseUrl/members/$id/approve/'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));
      if (!mounted) return;
      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Member approved successfully')),
        );
        _fetchPendingMembers();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Approval failed (${response.statusCode})')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Member Holding Tank',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        backgroundColor: colors.background,
        foregroundColor: colors.textPrimary,
        elevation: 0,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: colors.primaryNavy))
          : _pendingMembers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.how_to_reg_outlined,
                        size: 52,
                        color: colors.textMuted,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'No pending members to approve.',
                        style: TextStyle(
                          color: colors.textSecondary,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchPendingMembers,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _pendingMembers.length,
                    itemBuilder: (context, index) {
                      final member = _pendingMembers[index];
                      final first =
                          (member['first_name'] ?? '').toString().trim();
                      final last =
                          (member['last_name'] ?? '').toString().trim();
                      final initial =
                          first.isNotEmpty ? first[0].toUpperCase() : '?';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: colors.cardSurface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: colors.iconBadgeBg,
                            child: Text(
                              initial,
                              style: TextStyle(
                                color: colors.iconBadgeFg,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          title: Text(
                            '$first $last'.trim(),
                            style: TextStyle(
                              color: colors.textPrimary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          subtitle: Text(
                            member['email'] ??
                                member['phone_number'] ??
                                'Pending approval',
                            style: TextStyle(color: colors.textSecondary),
                          ),
                          trailing: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: colors.successGreen,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            onPressed: () {
                              final id = member['id'];
                              if (id is int) {
                                _approveMember(id);
                              }
                            },
                            child: const Text(
                              'Approve',
                              style: TextStyle(fontWeight: FontWeight.w700),
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
