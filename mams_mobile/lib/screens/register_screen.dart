import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import 'verify_email_screen.dart';
import 'location_picker_screen.dart';

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
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _passwordController = TextEditingController();
  String _gender = 'M';
  
  File? _profileImage;
  double? _latitude;
  double? _longitude;

  void _verifyOrgCode() async {
    final code = _orgCodeController.text.trim();
    if (code.isEmpty) return;
    setState(() { _isLoading = true; _errorMessage = null; });
    final result = await ApiService.verifyOrgCode(code);
    setState(() { _isLoading = false; });
    if (result.containsKey('organization')) {
      setState(() { _organization = result['organization']; _step = 2; });
    } else {
      setState(() { _errorMessage = result['error'] ?? 'Invalid organization code'; });
    }
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, maxWidth: 800, maxHeight: 800);
    if (pickedFile != null) setState(() => _profileImage = File(pickedFile.path));
  }

  void _register() async {
    if (_firstNameController.text.isEmpty ||
        _lastNameController.text.isEmpty ||
        _emailController.text.isEmpty ||
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
      'last_name': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'phone_number': _phoneController.text.trim(),
      'password': _passwordController.text,
      'gender': _gender,
      'organization': _organization!['id'],
      'address': _addressController.text.trim(),
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Join Organization'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                ),
              ),

            if (_step == 1) ...[
              const Icon(Icons.business, size: 64, color: Color(0xFF4F46E5)),
              const SizedBox(height: 24),
              const Text(
                'Enter Organization Code',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Ask your administrator for the unique code to join their workspace.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _orgCodeController,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, letterSpacing: 2, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'e.g. UCZ-123',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _verifyOrgCode,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Verify Code', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green.shade600),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_organization?['name'] ?? '', style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold)),
                          Text('Joining as Member', style: TextStyle(color: Colors.green.shade700, fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit, size: 18),
                      onPressed: () => setState(() => _step = 1),
                      color: Colors.green.shade700,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: Colors.grey.shade200,
                      backgroundImage: _profileImage != null ? FileImage(_profileImage!) : null,
                      child: _profileImage == null ? const Icon(Icons.person, size: 50, color: Colors.grey) : null,
                    ),
                    Positioned(
                      bottom: 0, right: 0,
                      child: InkWell(
                        onTap: _takePhoto,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(color: Color(0xFF4F46E5), shape: BoxShape.circle),
                          child: const Icon(Icons.camera_alt, color: Colors.white, size: 20),
                        ),
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 24),
              _buildTextField(_firstNameController, 'First Name'),
              const SizedBox(height: 12),
              _buildTextField(_lastNameController, 'Last Name'),
              const SizedBox(height: 12),
              _buildTextField(_emailController, 'Email Address', keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 12),
              _buildTextField(_phoneController, 'Phone Number', keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              // Address field — auto-geocoded on backend
              TextField(
                controller: _addressController,
                decoration: InputDecoration(
                  labelText: 'Home Address',
                  hintText: 'e.g. House 15, Changachanga, Lusaka',
                  helperText: 'Optional — used as a reference label.',
                  helperStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  prefixIcon: const Icon(Icons.location_on, size: 20, color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 10),
              // Pick on Map button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final result = await Navigator.push<dynamic>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LocationPickerScreen(
                          initialLat: _latitude,
                          initialLng: _longitude,
                        ),
                      ),
                    );
                    if (result != null && result is Map) {
                      final lat = result['lat'] as double?;
                      final lng = result['lng'] as double?;
                      final address = result['address'] as String?;
                      if (lat != null && lng != null) {
                        setState(() {
                          _latitude = lat;
                          _longitude = lng;
                          if (address != null && address.isNotEmpty) {
                            _addressController.text = address;
                          }
                        });
                      }
                    }
                  },
                  icon: Icon(
                    _latitude != null ? Icons.edit_location_alt : Icons.add_location_alt,
                    size: 18,
                    color: _latitude != null ? const Color(0xFF4F46E5) : Colors.grey.shade600,
                  ),
                  label: Text(
                    _latitude != null
                        ? 'Location pinned ✓ — tap to change'
                        : 'Pick My Home on Map',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _latitude != null ? const Color(0xFF4F46E5) : Colors.grey.shade700,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: BorderSide(
                      color: _latitude != null ? const Color(0xFF4F46E5) : Colors.grey.shade300,
                    ),
                    backgroundColor: _latitude != null ? const Color(0xFFEEF2FF) : Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _gender,
                decoration: InputDecoration(
                  labelText: 'Gender',
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                items: const [
                  DropdownMenuItem(value: 'M', child: Text('Male')),
                  DropdownMenuItem(value: 'F', child: Text('Female')),
                ],
                onChanged: (val) => setState(() => _gender = val!),
              ),
              const SizedBox(height: 12),
              _buildTextField(_passwordController, 'Password', obscureText: true),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isLoading ? null : _register,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF4F46E5),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Create Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {bool obscureText = false, TextInputType? keyboardType}) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}
