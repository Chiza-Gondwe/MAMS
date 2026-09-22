import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

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
    setState(() => _isLoading = true);
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final token = await ApiService.getToken();
      final response = await http.get(
        Uri.parse('$baseUrl/members/?status=pending_review'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _pendingMembers = data['results'] ?? data;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _approveMember(int id) async {
    try {
      final baseUrl = await ApiService.getBaseUrl();
      final token = await ApiService.getToken();
      final response = await http.post(
        Uri.parse('$baseUrl/members/$id/approve/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Member approved successfully')));
        }
        _fetchPendingMembers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        title: const Text('Holding Tank'),
        backgroundColor: const Color(0xFF1F3864),
        foregroundColor: Colors.white,
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : _pendingMembers.isEmpty 
              ? const Center(child: Text('No pending members to approve.', style: TextStyle(color: Colors.white)))
              : ListView.builder(
                  itemCount: _pendingMembers.length,
                  itemBuilder: (context, index) {
                    final member = _pendingMembers[index];
                    return Card(
                      color: const Color(0xFF1F3864),
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF0A1628),
                          child: Text(member['first_name'][0], style: const TextStyle(color: Colors.white)),
                        ),
                        title: Text('${member['first_name']} ${member['last_name']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        subtitle: Text(member['email'] ?? 'No email', style: const TextStyle(color: Colors.white70)),
                        trailing: ElevatedButton(
                          onPressed: () => _approveMember(member['id']),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Approve'),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
