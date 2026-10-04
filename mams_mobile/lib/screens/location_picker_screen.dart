import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;

class LocationPickerScreen extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;

  const LocationPickerScreen({super.key, this.initialLat, this.initialLng});

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  LatLng? _picked;
  String? _resolvedAddress;
  bool _isResolving = false;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    if (widget.initialLat != null && widget.initialLng != null) {
      _picked = LatLng(widget.initialLat!, widget.initialLng!);
    }
  }

  Future<void> _reverseGeocode(LatLng point) async {
    setState(() {
      _isResolving = true;
    });
    try {
      final uri = Uri.parse('https://nominatim.openstreetmap.org/reverse?lat=${point.latitude}&lon=${point.longitude}&format=json');
      final res = await http.get(uri, headers: {'User-Agent': 'MAMS-Church-App/1.0'});
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data['address'] != null) {
          final addr = data['address'] as Map;
          final road = addr['road'] ?? addr['pedestrian'] ?? addr['suburb'] ?? '';
          final suburb = addr['suburb'] ?? addr['neighbourhood'] ?? addr['residential'] ?? '';
          final city = addr['city'] ?? addr['town'] ?? addr['district'] ?? 'Lusaka';
          final parts = [road, if (suburb.isNotEmpty && suburb != road) suburb, city, 'Zambia'].where((s) => s.isNotEmpty).toList();
          if (mounted) {
            setState(() {
              _resolvedAddress = parts.join(', ');
              _isResolving = false;
            });
          }
          return;
        }
      }
    } catch (_) {}
    if (mounted) {
      setState(() => _isResolving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Default center: Lusaka, Zambia
    final center = _picked ?? const LatLng(-15.3875, 28.3228);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pick Your Home Location'),
        backgroundColor: const Color(0xFF0A1628),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 14.0,
              onTap: (tapPosition, point) {
                setState(() => _picked = point);
                _reverseGeocode(point);
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                userAgentPackageName: 'zm.org.mams.mobile',
              ),
              if (_picked != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: _picked!,
                      width: 44,
                      height: 44,
                      child: const Icon(
                        Icons.location_pin,
                        color: Color(0xFF2563EB),
                        size: 44,
                      ),
                    ),
                  ],
                ),
            ],
          ),

          // Instruction banner at top
          Positioned(
            top: 12,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: Colors.black.withAlpha(25), blurRadius: 8)],
              ),
              child: Row(
                children: [
                  const Icon(Icons.touch_app, size: 18, color: Color(0xFF2563EB)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _picked == null
                          ? 'Tap anywhere on the map to drop your home pin'
                          : 'Tap again to move the pin to a new spot',
                      style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Confirm button at bottom
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_picked != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 6)],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Color(0xFF2563EB)),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _isResolving
                                    ? 'Looking up address...'
                                    : (_resolvedAddress ?? 'Selected Location'),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '📍 ${_picked!.latitude.toStringAsFixed(5)}, ${_picked!.longitude.toStringAsFixed(5)}',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _picked == null
                        ? null
                        : () => Navigator.of(context).pop({
                              'lat': _picked!.latitude,
                              'lng': _picked!.longitude,
                              'address': _resolvedAddress,
                            }),
                    icon: const Icon(Icons.check_circle_rounded, size: 18),
                    label: const Text(
                      'Confirm Location',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey.shade300,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
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
}
