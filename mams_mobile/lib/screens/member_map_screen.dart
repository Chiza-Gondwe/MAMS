import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
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
            markers: _buildClusteredMarkers(),
          ),
        ],
      ),
    );
  }

  List<Marker> _buildClusteredMarkers() {
    // Group members by rounded coordinate key (5 decimal places ~1m precision)
    final Map<String, List<dynamic>> groups = {};
    for (final member in _members) {
      final lat = double.parse(member['latitude'].toString());
      final lng = double.parse(member['longitude'].toString());
      final key = '${lat.toStringAsFixed(4)},${lng.toStringAsFixed(4)}';
      groups.putIfAbsent(key, () => []).add(member);
    }

    final List<Marker> markers = [];
    for (final entry in groups.entries) {
      final parts = entry.key.split(',');
      final lat = double.parse(parts[0]);
      final lng = double.parse(parts[1]);
      final group = entry.value;

      if (group.length == 1) {
        // Single member pin
        final member = group[0];
        final name = "${member['first_name']} ${member['last_name']}";
        final role = member['role'] ?? 'member';
        final isLeader = role == 'admin' || role == 'superadmin';
        markers.add(Marker(
          point: LatLng(lat, lng),
          width: 44,
          height: 44,
          child: GestureDetector(
            onTap: () => showModalBottomSheet(
              context: context,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (ctx) => _buildMemberDetails(member, name, role, lat, lng),
            ),
            child: Icon(
              Icons.location_pin,
              color: isLeader ? const Color(0xFFF59E0B) : const Color(0xFF0284C7),
              size: 44,
            ),
          ),
        ));
      } else {
        // Cluster pin — numbered badge
        final hasLeader = group.any((m) => m['role'] == 'admin' || m['role'] == 'superadmin');
        markers.add(Marker(
          point: LatLng(lat, lng),
          width: 54,
          height: 54,
          child: GestureDetector(
            onTap: () => showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              builder: (ctx) => _buildClusterDetails(group, lat, lng),
            ),
            child: Stack(
              alignment: Alignment.topRight,
              children: [
                Icon(
                  Icons.location_pin,
                  color: hasLeader ? const Color(0xFFF59E0B) : const Color(0xFF0284C7),
                  size: 44,
                ),
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: Colors.red.shade600,
                    shape: BoxShape.circle,
                    border: const Border.fromBorderSide(BorderSide(color: Colors.white, width: 1.5)),
                  ),
                  child: Center(
                    child: Text(
                      '${group.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ));
      }
    }
    return markers;
  }

  Widget _buildClusterDetails(List<dynamic> group, double lat, double lng) {
    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (_, scrollController) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            // Handle
            Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFF0284C7), borderRadius: BorderRadius.circular(20)),
                    child: Text('${group.length} people here', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView.separated(
                controller: scrollController,
                itemCount: group.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 72),
                itemBuilder: (_, i) {
                  final member = group[i];
                  final name = "${member['first_name']} ${member['last_name']}";
                  final role = member['role'] ?? 'member';
                  final isLeader = role == 'admin' || role == 'superadmin';
                  final String? pic = member['profile_picture'];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    leading: CircleAvatar(
                      radius: 24,
                      backgroundColor: isLeader ? const Color(0xFFFEF3C7) : const Color(0xFFE0F2FE),
                      backgroundImage: pic != null ? NetworkImage(pic) : null,
                      child: pic == null
                          ? Icon(Icons.person, size: 22, color: isLeader ? const Color(0xFFF59E0B) : const Color(0xFF0284C7))
                          : null,
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text(
                      isLeader ? 'Church Leadership' : role.replaceAll('_', ' '),
                      style: TextStyle(fontSize: 12, color: isLeader ? const Color(0xFFB45309) : const Color(0xFF0369A1)),
                    ),
                    trailing: ElevatedButton.icon(
                      onPressed: () => launchUrl(
                        Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng'),
                        mode: LaunchMode.externalApplication,
                      ),
                      icon: const Icon(Icons.navigation_rounded, size: 14),
                      label: const Text('Go', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
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
  }

  Widget _buildMemberDetails(dynamic member, String name, String role, double lat, double lng) {
    final String? profilePic = member['profile_picture'];
    final bool isLeader = role == 'admin' || role == 'superadmin';
    
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: isLeader ? const Color(0xFFFEF3C7) : const Color(0xFFE0F2FE),
                backgroundImage: profilePic != null ? NetworkImage(profilePic) : null,
                child: profilePic == null
                    ? Icon(Icons.person, size: 32, color: isLeader ? const Color(0xFFF59E0B) : const Color(0xFF0284C7))
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isLeader ? const Color(0xFFFEF3C7) : const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isLeader ? 'Church Leadership' : role.replaceAll('_', ' ').toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isLeader ? const Color(0xFFB45309) : const Color(0xFF0369A1),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if ((member['phone_number'] ?? '').toString().isNotEmpty)
                      Text(member['phone_number'], style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                    if ((member['email'] ?? '').toString().isNotEmpty)
                      Text(member['email'], style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Get Directions button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                launchUrl(
                  Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng'),
                  mode: LaunchMode.externalApplication,
                );
              },
              icon: const Icon(Icons.navigation_rounded, size: 18),
              label: const Text('Get Directions', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
