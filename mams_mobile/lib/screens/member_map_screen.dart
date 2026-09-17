import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/api_service.dart';

class MemberMapScreen extends StatefulWidget {
  const MemberMapScreen({super.key});

  @override
  State<MemberMapScreen> createState() => _MemberMapScreenState();
}

class _MemberMapScreenState extends State<MemberMapScreen> {
  bool _isLoading = true;
  List<dynamic> _members = [];
  String? _errorMessage;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _fetchMembers();
  }

  Future<void> _fetchMembers() async {
    try {
      final resultsList = await ApiService.getMembers();
      if (!mounted) return;
      
      // Only keep members with location data
      final locatedMembers = resultsList.where((m) => 
        m['latitude'] != null && 
        m['longitude'] != null &&
        m['latitude'].toString().isNotEmpty &&
        m['longitude'].toString().isNotEmpty
      ).toList();

      setState(() {
        _members = locatedMembers;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Member Map')),
        body: Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.red))),
      );
    }

    // Default center (Zambia roughly) if no members have location
    LatLng center = _members.isNotEmpty 
        ? LatLng(double.parse(_members[0]['latitude'].toString()), double.parse(_members[0]['longitude'].toString()))
        : const LatLng(-13.133897, 27.849332); // Kitwe

    return Scaffold(
      appBar: AppBar(
        title: const Text('Member Locations'),
        backgroundColor: const Color(0xFF0A1628),
        foregroundColor: Colors.white,
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: center,
          initialZoom: 13.0,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.mams.app',
          ),
          MarkerLayer(
            markers: _members.map((member) {
              final lat = double.parse(member['latitude'].toString());
              final lng = double.parse(member['longitude'].toString());
              final name = "${member['first_name']} ${member['last_name']}";
              final role = member['role'];
              
              return Marker(
                point: LatLng(lat, lng),
                width: 60,
                height: 60,
                child: GestureDetector(
                  onTap: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (ctx) => _buildMemberDetails(member, name, role),
                    );
                  },
                  child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberDetails(dynamic member, String name, String role) {
    final String? profilePic = member['profile_picture'];
    
    return Container(
      padding: const EdgeInsets.all(24),
      height: 200,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: Colors.grey.shade200,
            backgroundImage: profilePic != null ? NetworkImage(profilePic) : null,
            child: profilePic == null ? const Icon(Icons.person, size: 40, color: Colors.grey) : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(role.toUpperCase(), style: const TextStyle(fontSize: 12, color: Colors.indigo, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(member['email'] ?? '', style: const TextStyle(color: Colors.grey)),
                Text(member['phone_number'] ?? '', style: const TextStyle(color: Colors.grey)),
              ],
            ),
          )
        ],
      ),
    );
  }
}
