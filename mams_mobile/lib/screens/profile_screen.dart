import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import 'location_picker_screen.dart';

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
  late TextEditingController _addressController;
  String _gender = 'M';
  
  File? _profileImage;
  String? _existingProfileImage;
  double? _latitude;
  double? _longitude;
  bool _removePicture = false;
  bool _locationCleared = false;

  @override
  void initState() {
    super.initState();
    _firstNameController = TextEditingController(text: widget.userData['first_name'] ?? '');
    _lastNameController = TextEditingController(text: widget.userData['last_name'] ?? '');
    _phoneController = TextEditingController(text: widget.userData['phone_number'] ?? '');
    _addressController = TextEditingController(text: widget.userData['address'] ?? '');
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
        _existingProfileImage = null;
        _removePicture = false;
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
      'address': _addressController.text.trim(),
    };
    // Only include coords when user explicitly pinned or explicitly cleared
    if (_latitude != null) {
      data['latitude'] = _latitude;
      data['longitude'] = _longitude;
    } else if (_locationCleared) {
      data['latitude'] = null;
      data['longitude'] = null;
    }
    // If neither: omit lat/lng → backend auto-geocodes from address
    
    if (_removePicture) data['remove_picture'] = 'true';

    final result = await ApiService.updateProfile(data, profileImage: _profileImage);
    
    if (!mounted) return;
    
    setState(() => _isLoading = false);

    if (result.containsKey('message')) {
      setState(() {
        _successMessage = result['message'];
        _locationCleared = false;
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
            _buildTextField(_firstNameController, 'First Name'),
            const SizedBox(height: 12),
            _buildTextField(_lastNameController, 'Last Name'),
            const SizedBox(height: 12),
            _buildTextField(_phoneController, 'Phone Number', keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            // Address field with geocoding note
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
            if (_latitude != null || _addressController.text.isNotEmpty)
              Center(
                child: TextButton.icon(
                  onPressed: () {
                    setState(() {
                      _latitude = null;
                      _longitude = null;
                      _addressController.clear();
                      _locationCleared = true;
                    });
                  },
                  icon: const Icon(Icons.delete_outline, size: 16, color: Colors.red),
                  label: const Text(
                    'Delete Location',
                    style: TextStyle(color: Colors.red, fontSize: 13),
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
