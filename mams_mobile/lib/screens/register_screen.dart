import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'verify_email_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _step = 1;
  bool _isLoading = false;
  String? _errorMessage;

  // Step 1: Org Code
  final _orgCodeController = TextEditingController();
  Map<String, dynamic>? _organization;

  // Step 2: Details
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _gender = 'M';
  
  File? _profileImage;
  double? _latitude;
  double? _longitude;
  bool _isGettingLocation = false;

  String _extractOrgCode(String raw) {
    final trimmed = raw.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri != null) {
      final paramCode = uri.queryParameters['org_code'] ?? uri.queryParameters['code'];
      if (paramCode != null && paramCode.trim().isNotEmpty) {
        return paramCode.trim().toUpperCase();
      }
    }
    if (trimmed.toUpperCase().startsWith('MAMS-JOIN:')) {
      return trimmed.substring('MAMS-JOIN:'.length).trim().toUpperCase();
    }
    return trimmed.toUpperCase();
  }

  Future<void> _scanOrgJoinQr() async {
    bool scanned = false;
    final String? scannedCode = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.68,
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Scan Organization Join QR',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Point your camera at your Church or School Join QR Code',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white70),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: MobileScanner(
                    onDetect: (capture) {
                      if (scanned) return;
                      for (final barcode in capture.barcodes) {
                        final raw = barcode.rawValue;
                        if (raw != null && raw.trim().isNotEmpty) {
                          final code = _extractOrgCode(raw);
                          if (code.isNotEmpty) {
                            scanned = true;
                            Navigator.pop(ctx, code);
                            break;
                          }
                        }
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );

    if (scannedCode != null && scannedCode.isNotEmpty && mounted) {
      setState(() {
        _orgCodeController.text = scannedCode;
      });
      _verifyOrgCode();
    }
  }

  void _verifyOrgCode() async {
    final code = _orgCodeController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await ApiService.verifyOrgCode(code);
    setState(() {
      _isLoading = false;
    });

    if (result.containsKey('organization')) {
      setState(() {
        _organization = result['organization'];
        _step = 2;
      });
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Invalid organization code';
      });
    }
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, maxWidth: 800, maxHeight: 800);
    if (pickedFile != null) {
      setState(() => _profileImage = File(pickedFile.path));
    }
  }

  Future<void> _getLocation() async {
    setState(() { _isGettingLocation = true; _errorMessage = null; });
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw 'Location services are disabled.';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Location permissions are denied';
      }
      if (permission == LocationPermission.deniedForever) throw 'Location permissions are permanently denied, we cannot request permissions.';

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _isGettingLocation = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isGettingLocation = false;
      });
    }
  }

  void _register() async {
    if (_firstNameController.text.isEmpty ||
        _lastNameController.text.isEmpty ||
        _emailController.text.isEmpty ||
        _phoneController.text.isEmpty ||
        _passwordController.text.isEmpty) {
      setState(() => _errorMessage = 'Please fill all required fields');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final data = {
      'first_name': _firstNameController.text.trim(),
      'middle_name': _middleNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone_number': _phoneController.text.trim(),
      'password': _passwordController.text,
      'gender': _gender,
      'organization': _organization!['id'],
    };
    
    if (_latitude != null) data['latitude'] = _latitude;
    if (_longitude != null) data['longitude'] = _longitude;

    final result = await ApiService.register(data, profileImage: _profileImage);
    
    if (!mounted) return;
    
    setState(() => _isLoading = false);

    if (result.containsKey('message') && result['message'].toString().contains('successful')) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => VerifyEmailScreen(email: _emailController.text.trim()),
        ),
      );
    } else {
      setState(() {
        _errorMessage = result.toString();
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
          'Join Organization',
          style: TextStyle(
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: colors.textPrimary,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colors.cardSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.cardBorder, width: 1),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: colors.isDark ? 0.25 : 0.04),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: colors.dangerRed.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: colors.dangerRed.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(color: colors.dangerRed, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                  ),

                if (_step == 1) ...[
                  Center(
                    child: Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: colors.iconBadgeBg,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: colors.cardBorder),
                      ),
                      child: Icon(Icons.domain_rounded, size: 30, color: colors.iconBadgeFg),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Enter Organization Code',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: colors.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Enter the code provided by your administrator or scan your organization\'s Join QR Code.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 13.5,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _orgCodeController,
                    textAlign: TextAlign.center,
                    textCapitalization: TextCapitalization.characters,
                    style: TextStyle(
                      fontSize: 20,
                      letterSpacing: 2.0,
                      fontWeight: FontWeight.w700,
                      color: colors.textPrimary,
                    ),
                    decoration: InputDecoration(
                      hintText: 'e.g. LUS-C-001',
                      hintStyle: TextStyle(
                        color: colors.textMuted,
                        letterSpacing: 1.2,
                        fontWeight: FontWeight.w500,
                      ),
                      filled: true,
                      fillColor: colors.subtleSurface,
                      suffixIcon: IconButton(
                        icon: Icon(Icons.qr_code_scanner_rounded, color: colors.accentBlue),
                        tooltip: 'Scan Join QR Code',
                        onPressed: _isLoading ? null : _scanOrgJoinQr,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
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
                        borderSide: BorderSide(color: colors.accentBlue, width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _verifyOrgCode,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      backgroundColor: colors.primaryNavy,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text(
                            'Verify Code',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                  ),
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _scanOrgJoinQr,
                    icon: Icon(Icons.qr_code_scanner_rounded, size: 19, color: colors.textPrimary),
                    label: Text(
                      'Scan Organization Join QR Code',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w600,
                        color: colors.textPrimary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: colors.subtleSurface,
                      side: BorderSide(color: colors.cardBorder, width: 1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: colors.successBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colors.successGreen.withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: colors.successGreen),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _organization?['name'] ?? '',
                                style: TextStyle(
                                  color: colors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 15,
                                ),
                              ),
                              Text(
                                'Verified Organization • Joining as Member',
                                style: TextStyle(color: colors.textSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          onPressed: () => setState(() => _step = 1),
                          color: colors.textSecondary,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 22),
                  Center(
                    child: Stack(
                      children: [
                        CircleAvatar(
                          radius: 46,
                          backgroundColor: colors.subtleSurface,
                          backgroundImage: _profileImage != null ? FileImage(_profileImage!) : null,
                          child: _profileImage == null
                              ? Icon(Icons.person_outline_rounded, size: 44, color: colors.textMuted)
                              : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: InkWell(
                            onTap: _takePhoto,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: colors.primaryNavy,
                                shape: BoxShape.circle,
                                border: Border.all(color: colors.cardSurface, width: 2),
                              ),
                              child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 18),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: TextButton.icon(
                      onPressed: _isGettingLocation ? null : _getLocation,
                      icon: _isGettingLocation
                          ? SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: colors.textPrimary),
                            )
                          : Icon(
                              _latitude != null ? Icons.check_circle_rounded : Icons.location_on_outlined,
                              size: 18,
                              color: _latitude != null ? colors.successGreen : colors.textSecondary,
                            ),
                      label: Text(
                        _latitude != null ? 'Location Captured' : 'Capture Residence GPS (Optional)',
                        style: TextStyle(
                          color: _latitude != null ? colors.successGreen : colors.textSecondary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: TextButton.styleFrom(
                        backgroundColor: _latitude != null ? colors.successBg : colors.subtleSurface,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: colors.cardBorder),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  _buildTextField(colors, _firstNameController, 'First Name *'),
                  const SizedBox(height: 12),
                  _buildTextField(colors, _middleNameController, 'Middle Name (Optional)'),
                  const SizedBox(height: 12),
                  _buildTextField(colors, _lastNameController, 'Last Name *'),
                  const SizedBox(height: 12),
                  _buildTextField(colors, _emailController, 'Email Address *', keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 12),
                  _buildTextField(colors, _phoneController, 'Phone Number *', keyboardType: TextInputType.phone),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _gender,
                    dropdownColor: colors.cardSurface,
                    style: TextStyle(color: colors.textPrimary, fontSize: 15),
                    decoration: InputDecoration(
                      labelText: 'Gender',
                      labelStyle: TextStyle(color: colors.textSecondary),
                      filled: true,
                      fillColor: colors.subtleSurface,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colors.cardBorder),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colors.cardBorder),
                      ),
                    ),
                    items: [
                      DropdownMenuItem(value: 'M', child: Text('Male', style: TextStyle(color: colors.textPrimary))),
                      DropdownMenuItem(value: 'F', child: Text('Female', style: TextStyle(color: colors.textPrimary))),
                    ],
                    onChanged: (val) => setState(() => _gender = val!),
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(colors, _passwordController, 'Password *', obscureText: true),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _register,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      backgroundColor: colors.primaryNavy,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : const Text('Create Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
    MamsColors colors,
    TextEditingController controller,
    String label, {
    bool obscureText = false,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      style: TextStyle(color: colors.textPrimary, fontSize: 15),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: colors.textSecondary, fontSize: 14),
        filled: true,
        fillColor: colors.subtleSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
          borderSide: BorderSide(color: colors.accentBlue, width: 1.5),
        ),
      ),
    );
  }
}


