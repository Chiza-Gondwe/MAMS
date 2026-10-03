import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'location_picker_screen.dart';

class MemberMapScreen extends StatefulWidget {
  const MemberMapScreen({super.key});

  @override
  State<MemberMapScreen> createState() => _MemberMapScreenState();
}

class _MemberMapScreenState extends State<MemberMapScreen> {
  bool _isLoading = true;
  bool _isSavingMyLocation = false;
  List<dynamic> _members = [];
  String? _errorMessage;
  final MapController _mapController = MapController();

  // Default center: Lusaka, Zambia
  static const LatLng _lusakaCenter = LatLng(-15.3875, 28.3228);

  @override
  void initState() {
    super.initState();
    _fetchMembers();
  }

  Future<void> _fetchMembers() async {
    try {
      final resultsList = await ApiService.getMembers();
      if (!mounted) return;

      final locatedMembers = resultsList.where((m) {
        final lat = double.tryParse(m['latitude']?.toString() ?? '');
        final lng = double.tryParse(m['longitude']?.toString() ?? '');
        return lat != null && lng != null;
      }).toList();

      setState(() {
        _members = locatedMembers;
        _isLoading = false;
        _errorMessage = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _pinMyCurrentGpsLocation() async {
    setState(() => _isSavingMyLocation = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Please turn on Location / GPS on your phone.';
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Location permission was denied.';
        }
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Location permission is permanently denied in phone Settings.';
      }

      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 8),
          ),
        );
      } catch (_) {
        pos = await Geolocator.getLastKnownPosition();
      }

      if (pos == null) {
        throw 'Could not get GPS fix indoors. Try "Pick on Map" instead.';
      }

      final res = await ApiService.updateProfile({
        'latitude': pos.latitude,
        'longitude': pos.longitude,
      });

      if (!mounted) return;
      if (res.containsKey('error')) {
        throw res['error'].toString();
      }

      await _fetchMembers();
      _mapController.move(LatLng(pos.latitude, pos.longitude), 15.0);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your GPS home pin has been saved to the map!'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSavingMyLocation = false);
    }
  }

  Future<void> _pickMyLocationOnMap() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => const LocationPickerScreen(
          initialLat: -15.3875,
          initialLng: 28.3228,
        ),
      ),
    );
    if (result == null || !mounted) return;

    final lat = result['lat'] as double?;
    final lng = result['lng'] as double?;
    final address = result['address'] as String?;
    if (lat == null || lng == null) return;

    setState(() => _isSavingMyLocation = true);
    try {
      final payload = <String, dynamic>{
        'latitude': lat,
        'longitude': lng,
      };
      if (address != null && address.isNotEmpty) {
        payload['address'] = address;
      }
      final res = await ApiService.updateProfile(payload);
      if (!mounted) return;
      if (res.containsKey('error')) {
        throw res['error'].toString();
      }
      await _fetchMembers();
      _mapController.move(LatLng(lat, lng), 15.0);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your home pin has been saved to the map!'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: const Color(0xFFDC2626),
        ),
      );
    } finally {
      if (mounted) setState(() => _isSavingMyLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);

    if (_isLoading) {
      return Scaffold(
        backgroundColor: colors.background,
        body: Center(
          child: CircularProgressIndicator(color: colors.primaryNavy),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        backgroundColor: colors.background,
        appBar: AppBar(
          title: const Text('Member Map'),
          backgroundColor: colors.cardSurface,
          foregroundColor: colors.textPrimary,
        ),
        body: Center(
          child: Text(
            _errorMessage!,
            style: TextStyle(color: colors.dangerRed),
          ),
        ),
      );
    }

    final LatLng center = _members.isNotEmpty
        ? LatLng(
            double.parse(_members[0]['latitude'].toString()),
            double.parse(_members[0]['longitude'].toString()),
          )
        : _lusakaCenter;

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Member Locations (${_members.length})',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 17.5,
          ),
        ),
        backgroundColor: colors.cardSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Refresh Map',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchMembers,
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 13.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'zm.org.mams.mobile',
              ),
              MarkerLayer(
                markers: _buildClusteredMarkers(colors),
              ),
            ],
          ),

          // Top banner when no members have pinned their location yet
          if (_members.isEmpty)
            Positioned(
              top: 14,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: colors.cardSurface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: colors.cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: colors.iconBadgeBg,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.add_location_alt_rounded,
                        color: colors.accentBlue,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'No member pins saved yet',
                            style: TextStyle(
                              color: colors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Use the buttons below to pin your current GPS location or tap a spot on the map.',
                            style: TextStyle(
                              color: colors.textSecondary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Bottom Action Bar to Pin / Update Location directly from the Map
          Positioned(
            bottom: 20,
            left: 16,
            right: 16,
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed:
                        _isSavingMyLocation ? null : _pinMyCurrentGpsLocation,
                    icon: _isSavingMyLocation
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.my_location_rounded, size: 18),
                    label: const Text(
                      'Use My GPS',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 3,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed:
                        _isSavingMyLocation ? null : _pickMyLocationOnMap,
                    icon: const Icon(Icons.pin_drop_rounded, size: 18),
                    label: const Text(
                      'Pick on Map',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colors.cardSurface,
                      foregroundColor: colors.textPrimary,
                      side: BorderSide(color: colors.cardBorder),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 3,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Marker> _buildClusteredMarkers(MamsColors colors) {
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
        final member = group[0];
        final name = "${member['first_name']} ${member['last_name']}";
        final role = member['role'] ?? 'member';
        final isLeader = role == 'admin' || role == 'superadmin';
        markers.add(
          Marker(
            point: LatLng(lat, lng),
            width: 48,
            height: 48,
            child: GestureDetector(
              onTap: () => showModalBottomSheet(
                context: context,
                backgroundColor: colors.cardSurface,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                builder: (ctx) =>
                    _buildMemberDetails(colors, member, name, role, lat, lng),
              ),
              child: Icon(
                Icons.location_on_rounded,
                color: isLeader
                    ? const Color(0xFFD97706)
                    : const Color(0xFF2563EB),
                size: 44,
              ),
            ),
          ),
        );
      } else {
        final hasLeader = group.any(
          (m) => m['role'] == 'admin' || m['role'] == 'superadmin',
        );
        markers.add(
          Marker(
            point: LatLng(lat, lng),
            width: 54,
            height: 54,
            child: GestureDetector(
              onTap: () => showModalBottomSheet(
                context: context,
                backgroundColor: colors.cardSurface,
                isScrollControlled: true,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                builder: (ctx) =>
                    _buildClusterDetails(colors, group, lat, lng),
              ),
              child: Stack(
                alignment: Alignment.topRight,
                children: [
                  Icon(
                    Icons.location_on_rounded,
                    color: hasLeader
                        ? const Color(0xFFD97706)
                        : const Color(0xFF2563EB),
                    size: 44,
                  ),
                  Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      shape: BoxShape.circle,
                      border: const Border.fromBorderSide(
                        BorderSide(color: Colors.white, width: 1.5),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        '${group.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }
    }
    return markers;
  }

  Widget _buildClusterDetails(
    MamsColors colors,
    List<dynamic> group,
    double lat,
    double lng,
  ) {
    return DraggableScrollableSheet(
      initialChildSize: 0.5,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: colors.cardSurface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              decoration: BoxDecoration(
                color: colors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${group.length} people here',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: colors.cardBorder),
            Expanded(
              child: ListView.separated(
                controller: scrollController,
                itemCount: group.length,
                separatorBuilder: (_, _) =>
                    Divider(height: 1, indent: 72, color: colors.cardBorder),
                itemBuilder: (_, i) {
                  final member = group[i];
                  final name = "${member['first_name']} ${member['last_name']}";
                  final role = member['role'] ?? 'member';
                  final isLeader = role == 'admin' || role == 'superadmin';
                  final String? pic = member['profile_picture'];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 6,
                    ),
                    leading: CircleAvatar(
                      radius: 24,
                      backgroundColor: colors.iconBadgeBg,
                      backgroundImage: pic != null ? NetworkImage(pic) : null,
                      child: pic == null
                          ? Icon(
                              Icons.person_rounded,
                              size: 22,
                              color: colors.iconBadgeFg,
                            )
                          : null,
                    ),
                    title: Text(
                      name,
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      isLeader
                          ? 'Church Leadership'
                          : role.toString().replaceAll('_', ' '),
                      style: TextStyle(
                        fontSize: 12,
                        color: colors.textSecondary,
                      ),
                    ),
                    trailing: ElevatedButton.icon(
                      onPressed: () => launchUrl(
                        Uri.parse(
                          'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
                        ),
                        mode: LaunchMode.externalApplication,
                      ),
                      icon: const Icon(Icons.navigation_rounded, size: 14),
                      label: const Text('Go', style: TextStyle(fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
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

  Widget _buildMemberDetails(
    MamsColors colors,
    dynamic member,
    String name,
    String role,
    double lat,
    double lng,
  ) {
    final String? profilePic = member['profile_picture'];
    final bool isLeader = role == 'admin' || role == 'superadmin';

    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      decoration: BoxDecoration(
        color: colors.cardSurface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: colors.cardBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: colors.iconBadgeBg,
                backgroundImage:
                    profilePic != null ? NetworkImage(profilePic) : null,
                child: profilePic == null
                    ? Icon(
                        Icons.person_rounded,
                        size: 32,
                        color: colors.iconBadgeFg,
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: colors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: colors.iconBadgeBg,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isLeader
                            ? 'Church Leadership'
                            : role.replaceAll('_', ' ').toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: colors.iconBadgeFg,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if ((member['phone_number'] ?? '').toString().isNotEmpty)
                      Text(
                        member['phone_number'],
                        style: TextStyle(
                          color: colors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    if ((member['email'] ?? '').toString().isNotEmpty)
                      Text(
                        member['email'],
                        style: TextStyle(color: colors.textMuted, fontSize: 12),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                launchUrl(
                  Uri.parse(
                    'https://www.google.com/maps/dir/?api=1&destination=$lat,$lng',
                  ),
                  mode: LaunchMode.externalApplication,
                );
              },
              icon: const Icon(Icons.navigation_rounded, size: 18),
              label: const Text(
                'Get Directions',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
