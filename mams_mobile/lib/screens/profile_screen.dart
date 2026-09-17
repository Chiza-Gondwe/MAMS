import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import 'dart:convert';

class ProfileScreen extends StatefulWidget {
  final Map<String, dynamic> userData;
  const ProfileScreen({super.key, required this.userData});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = false;
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
    _firstNameController = TextEditingController(text: widget.userData['first_name'] ?? '');
    _lastNameController = TextEditingController(text: widget.userData['last_name'] ?? '');
    _phoneController = TextEditingController(text: widget.userData['phone_number'] ?? '');
    
    if (widget.userData['gender'] != null) {
      _gender = widget.userData['gender'];
    }
    
    _existingProfileImage = widget.userData['profile_picture'];
  }

  Future<void> _takePhoto() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, maxWidth: 800, maxHeight: 800);
    if (pickedFile != null) {
      setState(() {
        _profileImage = File(pickedFile.path);
        _existingProfileImage = null; // Hide existing if new one taken
        _removePicture = false;
      });
    }
  }

  Future<void> _getLocation() async {
    setState(() { _isGettingLocation = true; _errorMessage = null; _successMessage = null; });
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) throw 'Location services are disabled.';

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) throw 'Location permissions are denied';
      }
      if (permission == LocationPermission.deniedForever) throw 'Location permissions are permanently denied.';

      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _isGettingLocation = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isGettingLocation = false;
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

    final result = await ApiService.updateProfile(data, profileImage: _profileImage);
    
    if (!mounted) return;
    
    setState(() => _isLoading = false);

    if (result.containsKey('message')) {
      setState(() {
        _successMessage = result['message'];
        if (_removePicture) {
           _existingProfileImage = null;
           _profileImage = null;
           _removePicture = false;
        } else if (result.containsKey('profile_picture') && result['profile_picture'] != null) {
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
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Edit Profile'),
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
                child: Text(_errorMessage!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
              
            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Text(_successMessage!, style: TextStyle(color: Colors.green.shade700, fontSize: 13)),
              ),

            Center(
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 60,
                    backgroundColor: Colors.grey.shade200,
                    backgroundImage: (!_removePicture && _profileImage != null)
                        ? FileImage(_profileImage!) as ImageProvider
                        : ((!_removePicture && _existingProfileImage != null) ? NetworkImage(_existingProfileImage!) : null),
                    child: (_removePicture || (_profileImage == null && _existingProfileImage == null))
                        ? const Icon(Icons.person, size: 60, color: Colors.grey) 
                        : null,
                  ),
                  if (!_removePicture && (_profileImage != null || _existingProfileImage != null))
                    Positioned(
                      bottom: 0, left: 0,
                      child: InkWell(
                        onTap: () => setState(() => _removePicture = true),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: Colors.red.shade600, shape: BoxShape.circle),
                          child: const Icon(Icons.delete, color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                  Positioned(
                    bottom: 0, right: 0,
                    child: InkWell(
                      onTap: _takePhoto,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(color: Color(0xFF4F46E5), shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt, color: Colors.white, size: 22),
                      ),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: TextButton.icon(
                onPressed: _isGettingLocation ? null : _getLocation,
                icon: _isGettingLocation 
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(_latitude != null ? Icons.check_circle : Icons.location_on, 
                      color: _latitude != null ? Colors.green : Colors.grey.shade700),
                label: Text(
                  _latitude != null ? 'Location Updated!' : 'Update GPS Location',
                  style: TextStyle(color: _latitude != null ? Colors.green : Colors.grey.shade700),
                ),
                style: TextButton.styleFrom(
                  backgroundColor: _latitude != null ? Colors.green.shade50 : Colors.grey.shade200,
                ),
              ),
            ),
            const SizedBox(height: 32),
            _buildTextField(_firstNameController, 'First Name'),
            const SizedBox(height: 12),
            _buildTextField(_lastNameController, 'Last Name'),
            const SizedBox(height: 12),
            _buildTextField(_phoneController, 'Phone Number', keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _gender,
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
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isLoading ? null : _updateProfile,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isLoading 
                ? const CircularProgressIndicator(color: Colors.white)
                : const Text('Save Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {TextInputType? keyboardType}) {
    return TextField(
      controller: controller,
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
