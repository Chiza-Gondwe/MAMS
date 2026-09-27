import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';

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

  Future<void> _fetchMembers() async {
    setState(() { _isLoading = true; });
    final data = await ApiService.getMembers();
    setState(() {
      _allMembers = data;
      _filteredMembers = data;
      _isLoading = false;
    });
  }

  void _filterMembers(String query) {
    if (query.isEmpty) {
      setState(() { _filteredMembers = _allMembers; });
    } else {
      setState(() {
        _filteredMembers = _allMembers.where((m) {
          final name = '${m['first_name']} ${m['last_name']}'.toLowerCase();
          return name.contains(query.toLowerCase());
        }).toList();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Directory'),
        backgroundColor: const Color(0xFF4F46E5),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: TextField(
              controller: _searchController,
              onChanged: _filterMembers,
              decoration: InputDecoration(
                hintText: 'Search members...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _fetchMembers,
                  child: ListView.builder(
                    itemCount: _filteredMembers.length,
                    itemBuilder: (context, index) {
                      final m = _filteredMembers[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF4F46E5).withValues(alpha: 0.1),
                          child: Text(
                            (m['first_name']?[0] ?? '?').toUpperCase(),
                            style: const TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.bold),
                          ),
                        ),
                        title: Text('${m['first_name']} ${m['last_name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(m['role'] ?? 'Member'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (m['phone_number'] != null && m['phone_number'].toString().isNotEmpty) ...[
                              IconButton(
                                icon: const Icon(Icons.phone, color: Colors.blue),
                                onPressed: () {
                                  launchUrl(Uri.parse('tel:${m['phone_number']}'));
                                },
                              ),
                              IconButton(
                                icon: const Icon(Icons.chat, color: Colors.green),
                                onPressed: () {
                                  String phone = m['phone_number'].toString().replaceAll(RegExp(r'\D'), '');
                                  if (phone.startsWith('0')) {
                                    phone = '260${phone.substring(1)}';
                                  } else if (!phone.startsWith('260')) {
                                    phone = '260$phone';
                                  }
                                  launchUrl(Uri.parse('https://wa.me/$phone'));
                                },
                              ),
                            ]
                          ],
                        ),
                        tileColor: Colors.white,
                        shape: const Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
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
