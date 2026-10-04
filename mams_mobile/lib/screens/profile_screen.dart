import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'location_picker_screen.dart';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const ProfileScreen({super.key, required this.userData});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = false;
  bool _checkingUpdate = false;
  String? _errorMessage;
  String? _successMessage;

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;
  String _gender = 'M';

  File? _profileImage;
  String? _existingProfileImage;
  double? _latitude;
  double? _longitude;
  bool _isGettingLocation = false;
  bool _removePicture = false;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(
      text: widget.userData['first_name'] ?? '',
    );
    _lastNameController = TextEditingController(
      text: widget.userData['last_name'] ?? '',
    );
    _phoneController = TextEditingController(
      text: widget.userData['phone_number'] ?? '',
    );

    if (widget.userData['gender'] != null) {
      _gender = widget.userData['gender'];
    }

    _existingProfileImage = widget.userData['profile_picture'];
    _latitude = double.tryParse(widget.userData['latitude']?.toString() ?? '');
    _longitude = double.tryParse(
      widget.userData['longitude']?.toString() ?? '',
    );
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.camera,
      maxWidth: 800,
      maxHeight: 800,
    );
    if (pickedFile != null) {
      setState(() {
        _profileImage = File(pickedFile.path);
        _existingProfileImage = null; // Hide existing if new one taken
        _removePicture = false;
      });
    }
  }

  Future<void> _getLocation() async {
    setState(() {
      _isGettingLocation = true;
      _errorMessage = null;
      _successMessage = null;
    });
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Location services are disabled.';
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Location permissions are denied';
        }
      }
      if (permission == LocationPermission.deniedForever) {
        throw 'Location permissions are permanently denied.';
      }

      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 8),
          ),
        );
      } catch (_) {
        position = await Geolocator.getLastKnownPosition();
      }

      if (position == null) {
        throw 'Could not get GPS fix indoors. Try "Pick on Map" instead.';
      }

      final res = await ApiService.updateProfile({
        'latitude': position.latitude,
        'longitude': position.longitude,
      });

      if (!mounted) return;
      if (res.containsKey('error')) {
        throw res['error'].toString();
      }

      setState(() {
        _latitude = position!.latitude;
        _longitude = position.longitude;
        _isGettingLocation = false;
        _successMessage = 'GPS Home Location saved to Member Map!';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isGettingLocation = false;
      });
    }
  }

  Future<void> _pickLocationOnMap() async {
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initialLat: _latitude ?? -15.3875,
          initialLng: _longitude ?? 28.3228,
        ),
      ),
    );
    if (result == null || !mounted) return;

    final lat = result['lat'] as double?;
    final lng = result['lng'] as double?;
    final address = result['address'] as String?;
    if (lat == null || lng == null) return;

    setState(() {
      _isGettingLocation = true;
      _errorMessage = null;
      _successMessage = null;
    });

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
      setState(() {
        _errorMessage = res['error'].toString();
        _isGettingLocation = false;
      });
    } else {
      setState(() {
        _latitude = lat;
        _longitude = lng;
        _isGettingLocation = false;
        _successMessage = 'Home pin saved to Member Map!';
      });
    }
  }

  void _updateProfile() async {
    if (_firstNameController.text.isEmpty || _lastNameController.text.isEmpty) {
      setState(() => _errorMessage = 'Please fill all required fields');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _successMessage = null;
    });

    final Map<String, dynamic> data = {
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'phone_number': _phoneController.text.trim(),
      'gender': _gender,
    };

    if (_removePicture) data['remove_picture'] = 'true';
    if (_latitude != null) data['latitude'] = _latitude;
    if (_longitude != null) data['longitude'] = _longitude;

    final result = await ApiService.updateProfile(
      data,
      profileImage: _profileImage,
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (result.containsKey('message')) {
      setState(() {
        _successMessage = result['message'];
        if (_removePicture) {
          _existingProfileImage = null;
          _profileImage = null;
          _removePicture = false;
        } else if (result.containsKey('profile_picture') &&
            result['profile_picture'] != null) {
          _existingProfileImage = result['profile_picture'];
          _profileImage = null;
        }
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'An error occurred';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Profile & Settings',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        backgroundColor: colors.background,
        elevation: 0,
        foregroundColor: colors.textPrimary,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.4)),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: colors.dangerRed, fontSize: 13),
                ),
              ),

            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: colors.successBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: colors.successGreen.withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  _successMessage!,
                  style: TextStyle(color: colors.successGreen, fontSize: 13),
                ),
              ),

            Center(
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 56,
                    backgroundColor: colors.iconBadgeBg,
                    backgroundImage: (!_removePicture && _profileImage != null)
                        ? FileImage(_profileImage!) as ImageProvider
                        : ((!_removePicture && _existingProfileImage != null)
                              ? NetworkImage(_existingProfileImage!)
                              : null),
                    child:
                        (_removePicture ||
                            (_profileImage == null &&
                                _existingProfileImage == null))
                        ? Icon(
                            Icons.person_rounded,
                            size: 54,
                            color: colors.iconBadgeFg,
                          )
                        : null,
                  ),
                  if (!_removePicture &&
                      (_profileImage != null || _existingProfileImage != null))
                    Positioned(
                      bottom: 0,
                      left: 0,
                      child: InkWell(
                        onTap: () => setState(() => _removePicture = true),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade600,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.delete,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _takePhoto,
                      child: Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: colors.primaryNavy,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.camera_alt,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 10,
              runSpacing: 8,
              children: [
                TextButton.icon(
                  onPressed: _isGettingLocation ? null : _getLocation,
                  icon: _isGettingLocation
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Icon(
                          _latitude != null
                              ? Icons.check_circle
                              : Icons.my_location_rounded,
                          color: _latitude != null
                              ? colors.successGreen
                              : colors.iconBadgeFg,
                          size: 18,
                        ),
                  label: Text(
                    _latitude != null ? 'GPS Saved ✓' : 'Use Current GPS',
                    style: TextStyle(
                      color: _latitude != null
                          ? colors.successGreen
                          : colors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    backgroundColor: _latitude != null
                        ? colors.successBg
                        : colors.cardSurface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(color: colors.cardBorder),
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: _isGettingLocation ? null : _pickLocationOnMap,
                  icon: Icon(
                    Icons.pin_drop_rounded,
                    color: colors.iconBadgeFg,
                    size: 18,
                  ),
                  label: Text(
                    'Pick on Map',
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 10,
                    ),
                    backgroundColor: colors.cardSurface,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(color: colors.cardBorder),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Appearance Mode Selector (Light / Dark / System)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colors.cardSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: colors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        ThemeController.modeIcon,
                        size: 18,
                        color: colors.iconBadgeFg,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Appearance Mode',
                        style: TextStyle(
                          color: colors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 14.5,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ValueListenableBuilder<ThemeMode>(
                    valueListenable: ThemeController.themeModeNotifier,
                    builder: (context, currentMode, _) {
                      return Row(
                        children: [
                          _buildModeChip(
                            colors,
                            label: 'Light',
                            icon: Icons.light_mode_rounded,
                            mode: ThemeMode.light,
                            current: currentMode,
                          ),
                          const SizedBox(width: 8),
                          _buildModeChip(
                            colors,
                            label: 'Dark',
                            icon: Icons.dark_mode_rounded,
                            mode: ThemeMode.dark,
                            current: currentMode,
                          ),
                          const SizedBox(width: 8),
                          _buildModeChip(
                            colors,
                            label: 'System',
                            icon: Icons.brightness_auto_rounded,
                            mode: ThemeMode.system,
                            current: currentMode,
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _buildTextField(colors, _firstNameController, 'First Name'),
            const SizedBox(height: 12),
            _buildTextField(colors, _lastNameController, 'Last Name'),
            const SizedBox(height: 12),
            _buildTextField(
              colors,
              _phoneController,
              'Phone Number',
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _gender,
              dropdownColor: colors.cardSurface,
              style: TextStyle(color: colors.textPrimary, fontSize: 15),
              decoration: InputDecoration(
                labelText: 'Gender',
                labelStyle: TextStyle(color: colors.textSecondary),
                filled: true,
                fillColor: colors.cardSurface,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.cardBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: colors.accentBlue, width: 1.5),
                ),
              ),
              items: const [
                DropdownMenuItem(value: 'M', child: Text('Male')),
                DropdownMenuItem(value: 'F', child: Text('Female')),
              ],
              onChanged: (val) => setState(() => _gender = val!),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: _isLoading ? null : _updateProfile,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: colors.primaryNavy,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text(
                      'Save Profile',
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: colors.cardSurface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: colors.cardBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.system_update_rounded,
                    size: 20,
                    color: colors.iconBadgeFg,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'App Version v${ApiService.currentAppVersion}',
                          style: TextStyle(
                            color: colors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 13.5,
                          ),
                        ),
                        Text(
                          'Check for new MAMS Mobile updates',
                          style: TextStyle(
                            color: colors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    onPressed: _checkingUpdate ? null : _checkForUpdates,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      side: BorderSide(color: colors.cardBorder),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _checkingUpdate
                        ? SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: colors.textPrimary,
                            ),
                          )
                        : Text(
                            'Check Update',
                            style: TextStyle(
                              color: colors.textPrimary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _checkForUpdates() async {
    setState(() => _checkingUpdate = true);
    final info = await ApiService.checkAppUpdate();
    if (!mounted) return;
    setState(() => _checkingUpdate = false);

    if (info['has_update'] == true) {
      final latestVersion = (info['latest_version'] ?? '').toString();
      final notes = (info['release_notes'] ?? 'A new version is ready to install.').toString();
      final downloadUrl = (info['download_url'] ?? 'https://mamszambia.pythonanywhere.com/api/download-app/').toString();
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Update Available (v$latestVersion)'),
          content: Text(notes),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Later'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(ctx);
                final uri = Uri.tryParse(downloadUrl);
                if (uri != null) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              child: const Text('Update Now'),
            ),
          ],
        ),
      );
    } else if (info['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('You are on the latest version (v${ApiService.currentAppVersion})!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not reach update server. Check your internet connection.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Widget _buildModeChip(
    MamsColors colors, {
    required String label,
    required IconData icon,
    required ThemeMode mode,
    required ThemeMode current,
  }) {
    final selected = mode == current;
    return Expanded(
      child: InkWell(
        onTap: () => ThemeController.setThemeMode(mode),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: selected ? colors.primaryNavy : colors.subtleSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? colors.primaryNavy : colors.cardBorder,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: selected ? Colors.white : colors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : colors.textPrimary,
                  fontWeight: FontWeight.w600,
                  fontSize: 12.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    MamsColors colors,
    TextEditingController controller,
    String label, {
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      style: TextStyle(color: colors.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: colors.textSecondary),
        filled: true,
        fillColor: colors.cardSurface,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colors.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colors.accentBlue, width: 1.5),
        ),
      ),
    );
  }
}

