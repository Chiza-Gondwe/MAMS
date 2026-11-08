import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class CreateAnnouncementScreen extends StatefulWidget {
  const CreateAnnouncementScreen({super.key});

  @override
  State<CreateAnnouncementScreen> createState() => _CreateAnnouncementScreenState();
}

class _CreateAnnouncementScreenState extends State<CreateAnnouncementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _aiPromptController = TextEditingController();
  final _videoUrlController = TextEditingController();
  String _audience = 'all';
  String _announcementType = 'text';
  String _aiTone = 'warm';
  bool _isLoading = false;
  bool _isGeneratingAI = false;

  // Video recording / upload state
  XFile? _recordedVideo;
  int _recordedVideoBytes = 0;

  // Leader role info
  String _currentUserRole = 'member';
  String? _currentUserSectionName;
  String? _currentUserZoneName;

  @override
  void initState() {
    super.initState();
    _fetchCurrentUser();
  }

  Future<void> _fetchCurrentUser() async {
    try {
      final user = await ApiService.getCurrentUser();
      if (mounted) {
        setState(() {
          _currentUserRole = (user['role'] ?? 'member').toString().toLowerCase();
          if (user['section_name'] != null) {
            _currentUserSectionName = user['section_name'].toString();
          }
          if (user['zone_name'] != null) {
            _currentUserZoneName = user['zone_name'].toString();
          }
          // Set sensible default audience for scoped leaders
          if (['section_admin', 'section_treasurer'].contains(_currentUserRole)) {
            _audience = 'members';
          } else if (['zone_admin', 'zone_treasurer'].contains(_currentUserRole)) {
            _audience = 'members';
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _recordVideoWithCamera() async {
    final picker = ImagePicker();
    try {
      final XFile? video = await picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(seconds: 90),
      );
      if (video != null) {
        final bytes = await video.length();
        final mb = bytes / (1024 * 1024);
        if (mb > 20) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Video is ${mb.toStringAsFixed(1)}MB. Maximum allowed is 20MB to save server storage. Please record a shorter message.',
                ),
                backgroundColor: const Color(0xFFEF4444),
              ),
            );
          }
          return;
        }
        setState(() {
          _recordedVideo = video;
          _recordedVideoBytes = bytes;
          _videoUrlController.clear();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not access camera: $e')),
        );
      }
    }
  }

  Future<void> _pickVideoFromGallery() async {
    final picker = ImagePicker();
    try {
      final XFile? video = await picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(seconds: 90),
      );
      if (video != null) {
        final bytes = await video.length();
        final mb = bytes / (1024 * 1024);
        if (mb > 20) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Video is ${mb.toStringAsFixed(1)}MB. Maximum allowed is 20MB to save server storage.',
                ),
                backgroundColor: const Color(0xFFEF4444),
              ),
            );
          }
          return;
        }
        setState(() {
          _recordedVideo = video;
          _recordedVideoBytes = bytes;
          _videoUrlController.clear();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open video gallery: $e')),
        );
      }
    }
  }

  void _clearRecordedVideo() {
    setState(() {
      _recordedVideo = null;
      _recordedVideoBytes = 0;
    });
  }

  Future<void> _generateWithAI() async {
    final prompt = _aiPromptController.text.trim();
    if (prompt.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enter a short note first (e.g. Choir rehearsal Saturday 2pm)'),
        ),
      );
      return;
    }
    setState(() => _isGeneratingAI = true);
    try {
      final data = await ApiService.draftMessageWithAI(
        prompt: prompt,
        tone: _aiTone,
        audience: _audience,
      );
      if (!mounted) return;
      if (data != null) {
        setState(() {
          if ((data['title'] ?? '').toString().isNotEmpty) {
            _titleController.text = data['title'].toString();
          }
          if ((data['content'] ?? '').toString().isNotEmpty) {
            _contentController.text = data['content'].toString();
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Announcement drafted with AI!')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not reach AI drafter. Check connection.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGeneratingAI = false);
      }
    }
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_announcementType == 'video' &&
        _recordedVideo == null &&
        _videoUrlController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please record a video clip or provide a video link'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    final videoUrl = _announcementType == 'video' ? _videoUrlController.text.trim() : null;

    try {
      final success = await ApiService.createAnnouncement(
        _titleController.text.trim(),
        _contentController.text.trim(),
        _audience,
        _announcementType,
        videoUrl,
        _recordedVideo?.path,
      );

      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Announcement published successfully!')),
          );
          Navigator.pop(context, true);
        }
      } else {
        throw Exception('Failed to create announcement');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _aiPromptController.dispose();
    _videoUrlController.dispose();
    super.dispose();
  }

  bool get _isSectionLeader =>
      ['section_admin', 'section_treasurer'].contains(_currentUserRole);
  bool get _isZoneLeader =>
      ['zone_admin', 'zone_treasurer'].contains(_currentUserRole);
  bool get _isMinistryLeader => _currentUserRole == 'group_leader';
  bool get _isAdmin =>
      ['admin', 'superadmin', 'treasurer'].contains(_currentUserRole);

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);

    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'New Announcement',
          style: TextStyle(
            color: colors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: colors.textPrimary),
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: colors.primaryNavy),
                  const SizedBox(height: 16),
                  Text(
                    _recordedVideo != null
                        ? 'Uploading video announcement...'
                        : 'Publishing announcement...',
                    style: TextStyle(
                      color: colors.textSecondary,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20.0),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: colors.cardSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: colors.cardBorder),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Jurisdiction Scoping Notice
                      if (_isSectionLeader) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFF59E0B)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.shield_outlined,
                                  size: 18, color: Color(0xFFB45309)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Section Delivery: Strictly delivered to members in ${_currentUserSectionName ?? "your Section"}.',
                                  style: const TextStyle(
                                    color: Color(0xFF92400E),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ] else if (_isZoneLeader) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0E7FF),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF6366F1)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.shield_outlined,
                                  size: 18, color: Color(0xFF4338CA)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Zone Delivery: Strictly delivered to members in ${_currentUserZoneName ?? "your Zone"}.',
                                  style: const TextStyle(
                                    color: Color(0xFF3730A3),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ] else if (_isMinistryLeader) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFCCFBF1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF14B8A6)),
                          ),
                          child: Row(
                            children: const [
                              Icon(Icons.people_outline_rounded,
                                  size: 18, color: Color(0xFF0F766E)),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Ministry Delivery: Delivered strictly to members in your assigned ministry.',
                                  style: TextStyle(
                                    color: Color(0xFF115E59),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // AI Smart Announcement Drafter
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: colors.subtleSurface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: colors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.auto_awesome_rounded,
                                        size: 16, color: colors.accentBlue),
                                    const SizedBox(width: 6),
                                    Text(
                                      'AI Smart Drafter',
                                      style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13,
                                        color: colors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                                DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: _aiTone,
                                    isDense: true,
                                    dropdownColor: colors.cardSurface,
                                    style: TextStyle(
                                      color: colors.textSecondary,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                    items: const [
                                      DropdownMenuItem(
                                          value: 'warm',
                                          child: Text('Warm Tone')),
                                      DropdownMenuItem(
                                          value: 'formal',
                                          child: Text('Formal Tone')),
                                      DropdownMenuItem(
                                          value: 'urgent',
                                          child: Text('Urgent Notice')),
                                    ],
                                    onChanged: (val) {
                                      if (val != null) {
                                        setState(() => _aiTone = val);
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _aiPromptController,
                              style: TextStyle(
                                  color: colors.textPrimary, fontSize: 13),
                              decoration: InputDecoration(
                                hintText:
                                    'Brief note: e.g. Youth meeting Saturday 2pm at Main Hall...',
                                hintStyle: TextStyle(
                                    color: colors.textMuted, fontSize: 12.5),
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide:
                                      BorderSide(color: colors.cardBorder),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide:
                                      BorderSide(color: colors.cardBorder),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(
                                      color: colors.accentBlue, width: 1.4),
                                ),
                                filled: true,
                                fillColor: colors.cardSurface,
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed:
                                    _isGeneratingAI ? null : _generateWithAI,
                                icon: _isGeneratingAI
                                    ? SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.auto_awesome_rounded,
                                        size: 15),
                                label: Text(
                                  _isGeneratingAI
                                      ? 'Drafting with AI...'
                                      : 'Generate Title & Message',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: colors.accentBlue,
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  elevation: 0,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Title
                      Text('Title',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _titleController,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'Enter announcement title...',
                          hintStyle: TextStyle(color: colors.textMuted),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        validator: (value) => value == null || value.isEmpty
                            ? 'Title is required'
                            : null,
                      ),
                      const SizedBox(height: 18),

                      // Format & Audience
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Format',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                        color: colors.textPrimary)),
                                const SizedBox(height: 8),
                                DropdownButtonFormField<String>(
                                  initialValue: _announcementType,
                                  dropdownColor: colors.cardSurface,
                                  style: TextStyle(color: colors.textPrimary),
                                  decoration: InputDecoration(
                                    border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide:
                                          BorderSide(color: colors.cardBorder),
                                    ),
                                    filled: true,
                                    fillColor: colors.subtleSurface,
                                  ),
                                  items: const [
                                    DropdownMenuItem(
                                        value: 'text',
                                        child: Text('Text Notice')),
                                    DropdownMenuItem(
                                        value: 'video',
                                        child: Text('Video Message')),
                                  ],
                                  onChanged: (value) {
                                    setState(() => _announcementType = value!);
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Audience',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                        color: colors.textPrimary)),
                                const SizedBox(height: 8),
                                DropdownButtonFormField<String>(
                                  initialValue: _audience,
                                  dropdownColor: colors.cardSurface,
                                  style: TextStyle(color: colors.textPrimary),
                                  decoration: InputDecoration(
                                    border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide:
                                          BorderSide(color: colors.cardBorder),
                                    ),
                                    filled: true,
                                    fillColor: colors.subtleSurface,
                                  ),
                                  items: [
                                    if (_isAdmin)
                                      const DropdownMenuItem(
                                          value: 'all',
                                          child: Text('Everyone')),
                                    const DropdownMenuItem(
                                        value: 'members',
                                        child: Text('Members Only')),
                                    if (!_isMinistryLeader)
                                      const DropdownMenuItem(
                                          value: 'leaders',
                                          child: Text('All Leaders')),
                                    if (_isAdmin || _isSectionLeader)
                                      const DropdownMenuItem(
                                          value: 'section_admins',
                                          child: Text('Section Elders')),
                                    if (_isAdmin || _isZoneLeader)
                                      const DropdownMenuItem(
                                          value: 'zone_admins',
                                          child: Text('Zone Elders')),
                                  ],
                                  onChanged: _isAdmin
                                      ? (value) {
                                          setState(() => _audience = value!);
                                        }
                                      : null,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Video Recording & Capture Section
                      if (_announcementType == 'video') ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: colors.subtleSurface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: colors.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.videocam_rounded,
                                      size: 18, color: colors.accentBlue),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Video Clip (Max 90 sec • 20MB limit)',
                                    style: TextStyle(
                                      color: colors.textPrimary,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),

                              if (_recordedVideo != null) ...[
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: colors.cardSurface,
                                    borderRadius: BorderRadius.circular(10),
                                    border:
                                        Border.all(color: colors.cardBorder),
                                  ),
                                  child: Row(
                                    children: [
                                      CircleAvatar(
                                        backgroundColor:
                                            const Color(0xFF10B981).withValues(alpha: 0.15),
                                        child: const Icon(Icons.check_rounded,
                                            color: Color(0xFF10B981), size: 20),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Video Ready to Post',
                                              style: TextStyle(
                                                color: colors.textPrimary,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13,
                                              ),
                                            ),
                                            Text(
                                              'Size: ${(_recordedVideoBytes / (1024 * 1024)).toStringAsFixed(1)} MB',
                                              style: TextStyle(
                                                color: colors.textSecondary,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline_rounded,
                                            color: Color(0xFFEF4444)),
                                        tooltip: 'Remove video',
                                        onPressed: _clearRecordedVideo,
                                      ),
                                    ],
                                  ),
                                ),
                              ] else ...[
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: _recordVideoWithCamera,
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: colors.primaryNavy,
                                          side: BorderSide(
                                              color: colors.primaryNavy),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 12),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        icon: const Icon(
                                            Icons.videocam_outlined,
                                            size: 18),
                                        label: const Text(
                                          'Record Camera',
                                          style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: OutlinedButton.icon(
                                        onPressed: _pickVideoFromGallery,
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: colors.accentBlue,
                                          side: BorderSide(
                                              color: colors.accentBlue),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 12),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                          ),
                                        ),
                                        icon: const Icon(
                                            Icons.video_library_outlined,
                                            size: 18),
                                        label: const Text(
                                          'Pick File',
                                          style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                        child: Divider(
                                            color: colors.cardBorder)),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8),
                                      child: Text('OR PASTE URL',
                                          style: TextStyle(
                                              color: colors.textMuted,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600)),
                                    ),
                                    Expanded(
                                        child: Divider(
                                            color: colors.cardBorder)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _videoUrlController,
                                  style: TextStyle(
                                      color: colors.textPrimary,
                                      fontSize: 13),
                                  decoration: InputDecoration(
                                    hintText:
                                        'https://youtube.com/watch?v=...',
                                    hintStyle: TextStyle(
                                        color: colors.textMuted,
                                        fontSize: 12.5),
                                    prefixIcon: Icon(Icons.link_rounded,
                                        color: colors.accentBlue, size: 20),
                                    border: OutlineInputBorder(
                                        borderRadius:
                                            BorderRadius.circular(10)),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10),
                                      borderSide: BorderSide(
                                          color: colors.cardBorder),
                                    ),
                                    filled: true,
                                    fillColor: colors.cardSurface,
                                    isDense: true,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],

                      // Message
                      Text('Message',
                          style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                              color: colors.textPrimary)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _contentController,
                        maxLines: 4,
                        style: TextStyle(color: colors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'Type your message here...',
                          hintStyle: TextStyle(color: colors.textMuted),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12)),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: colors.cardBorder),
                          ),
                          filled: true,
                          fillColor: colors.subtleSurface,
                        ),
                        validator: (value) => value == null || value.isEmpty
                            ? 'Message is required'
                            : null,
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colors.primaryNavy,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text(
                            'Publish Announcement',
                            style: TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
