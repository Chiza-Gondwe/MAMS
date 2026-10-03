import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class ChatRoomScreen extends StatefulWidget {
  final int channelId;
  final String channelName;
  final String channelType;

  const ChatRoomScreen({
    super.key,
    required this.channelId,
    required this.channelName,
    required this.channelType,
  });

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  static const MethodChannel _audioChannel = MethodChannel(
    'com.example.mams_mobile/audio',
  );

  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();

  List<dynamic> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  bool _hasTypedText = false;
  String _currentUserRole = 'member';
  Timer? _pollingTimer;
  int? _lastMessageId;

  // WhatsApp-style multi-select delete state
  final Set<int> _selectedMessageIds = <int>{};

  // Attachment state (single or multiple photos/video)
  List<XFile> _selectedImages = [];
  String? _selectedFilePath;
  String? _selectedFileName;
  String? _selectedFileType; // 'video', 'audio', 'image'

  // WhatsApp-style Voice Note recording & lock state
  bool _isRecording = false;
  bool _isRecordingLocked = false;
  double _micDragOffsetY = 0.0;
  double _micDragOffsetX = 0.0;
  int _recordingSeconds = 0;
  Timer? _recordingTimer;
  int? _playingMessageId;
  bool _showEmojiPicker = false;
  final FocusNode _messageFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _loadCurrentRole();
    _loadInitialMessages();
    _startPolling();
    _textController.addListener(_onTextChanged);
  }

  Future<void> _loadCurrentRole() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _currentUserRole = prefs.getString('role') ?? 'member';
    });
  }

  void _onTextChanged() {
    final hasText = _textController.text.trim().isNotEmpty;
    if (hasText != _hasTypedText && mounted) {
      setState(() => _hasTypedText = hasText);
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _recordingTimer?.cancel();
    _audioChannel.invokeMethod('stopAudio').catchError((_) {});
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    _messageFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  bool get _isSelectionMode => _selectedMessageIds.isNotEmpty;

  bool _canDeleteMessage(Map<String, dynamic> msg) {
    final isMe = msg['is_me'] == true;
    final isAdmin =
        _currentUserRole == 'admin' || _currentUserRole == 'superadmin';
    return isMe || isAdmin;
  }

  void _toggleSelectMessage(Map<String, dynamic> msg) {
    if (!_canDeleteMessage(msg)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You can only select your own messages to delete.'),
          duration: Duration(seconds: 1),
        ),
      );
      return;
    }
    final rawId = msg['id'];
    final id = rawId is int ? rawId : int.tryParse(rawId?.toString() ?? '');
    if (id == null) return;

    HapticFeedback.selectionClick();
    setState(() {
      if (_selectedMessageIds.contains(id)) {
        _selectedMessageIds.remove(id);
      } else {
        _selectedMessageIds.add(id);
      }
    });
  }

  Future<void> _deleteSelectedMessages() async {
    if (_selectedMessageIds.isEmpty) return;
    final count = _selectedMessageIds.length;
    final colors = MamsColors.of(context);

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.cardSurface,
        title: Text(
          'Delete $count message${count == 1 ? '' : 's'}?',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'This will permanently delete the selected message${count == 1 ? '' : 's'} for everyone in this group.',
          style: TextStyle(color: colors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(
              'Delete All ($count)',
              style: TextStyle(
                color: colors.dangerRed,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    final idsToDelete = _selectedMessageIds.toList();
    setState(() => _selectedMessageIds.clear());

    final deletedIds = await ApiService.bulkDeleteChatMessages(idsToDelete);
    if (!mounted) return;

    if (deletedIds.isNotEmpty) {
      setState(() {
        _messages.removeWhere(
          (m) => deletedIds.contains(int.tryParse(m['id']?.toString() ?? '')),
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Deleted ${deletedIds.length} message${deletedIds.length == 1 ? '' : 's'}',
          ),
          backgroundColor: const Color(0xFF16A34A),
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to delete selected messages'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 2500), (_) {
      _pollNewMessages();
    });
  }

  Future<void> _loadInitialMessages() async {
    final msgs = await ApiService.getChannelMessages(widget.channelId);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
        if (_messages.isNotEmpty) {
          _lastMessageId = _messages.last['id'];
        }
      });
      _scrollToBottom();
    }
  }

  Future<void> _pollNewMessages() async {
    if (_lastMessageId == null) {
      if (_messages.isEmpty) {
        _loadInitialMessages();
      }
      return;
    }

    final newMsgs = await ApiService.getChannelMessages(
      widget.channelId,
      sinceId: _lastMessageId,
    );

    if (mounted && newMsgs.isNotEmpty) {
      setState(() {
        _messages.addAll(newMsgs);
        _lastMessageId = _messages.last['id'];
      });
      SystemSound.play(SystemSoundType.click);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _clearSelectedAttachment() {
    setState(() {
      _selectedImages = [];
      _selectedFilePath = null;
      _selectedFileName = null;
      _selectedFileType = null;
    });
  }

  Future<void> _pickFromGalleryDirectly() async {
    try {
      final files = await _picker.pickMultipleMedia(imageQuality: 85);
      if (files.isEmpty || !mounted) return;
      final firstExt = files.first.path.toLowerCase();
      final isVideo = firstExt.endsWith('.mp4') ||
          firstExt.endsWith('.mov') ||
          firstExt.endsWith('.avi') ||
          firstExt.endsWith('.mkv') ||
          firstExt.endsWith('.webm') ||
          firstExt.endsWith('.3gp');
      setState(() {
        if (isVideo && files.length == 1) {
          _selectedImages = [];
          _selectedFilePath = files.first.path;
          _selectedFileName = files.first.name;
          _selectedFileType = 'video';
        } else {
          _selectedImages = files;
          _selectedFilePath = files.first.path;
          _selectedFileName = files.length == 1
              ? files.first.name
              : '${files.length} files selected';
          _selectedFileType = isVideo ? 'video' : 'image';
        }
      });
    } catch (_) {}
  }

  Future<void> _captureCameraPhoto() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (file != null && mounted) {
      setState(() {
        _selectedImages = [file];
        _selectedFilePath = file.path;
        _selectedFileName = file.name;
        _selectedFileType = 'image';
      });
    }
  }

  Future<void> _captureCameraVideo() async {
    final file = await _picker.pickVideo(
      source: ImageSource.camera,
      maxDuration: const Duration(minutes: 3),
    );
    if (file != null && mounted) {
      setState(() {
        _selectedImages = [];
        _selectedFilePath = file.path;
        _selectedFileName = file.name;
        _selectedFileType = 'video';
      });
    }
  }

  Future<void> _pickDocument() async {
    try {
      final res = await _audioChannel.invokeMethod<dynamic>('pickDocument');
      if (res is Map && mounted) {
        final path = res['path']?.toString();
        final name = res['name']?.toString() ?? 'Document';
        if (path != null && path.isNotEmpty) {
          setState(() {
            _selectedImages = [];
            _selectedFilePath = path;
            _selectedFileName = name;
            _selectedFileType = 'file';
          });
        }
      }
    } on PlatformException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message ?? 'Could not pick document')),
        );
      }
    }
  }

  Future<void> _shareCurrentLocation() async {
    if (_isSending) return;
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please enable GPS / Location Services on your phone.'),
            ),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission is required to share location.')),
          );
        }
        return;
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Getting your GPS location...'),
            duration: Duration(seconds: 1),
          ),
        );
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      final lat = pos.latitude.toStringAsFixed(6);
      final lng = pos.longitude.toStringAsFixed(6);
      final locationText =
          '📍 Shared Location\nhttps://www.google.com/maps?q=$lat,$lng';

      setState(() => _isSending = true);
      final newMsg = await ApiService.sendChatMessage(
        widget.channelId,
        locationText,
      );
      if (mounted) {
        setState(() => _isSending = false);
        if (newMsg != null) {
          setState(() {
            _messages.add(newMsg);
            _lastMessageId = newMsg['id'];
          });
          _scrollToBottom();
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not fetch GPS location.')),
        );
      }
    }
  }

  Future<void> _showShareContactSheet() async {
    final colors = MamsColors.of(context);
    final members = await ApiService.getMembers();
    if (!mounted) return;

    final nameController = TextEditingController();
    final phoneController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return Padding(
          padding: EdgeInsets.only(
            left: 18,
            right: 18,
            top: 14,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 18,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Share Contact to Group',
                style: TextStyle(
                  color: sheetColors.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: nameController,
                      style: TextStyle(color: sheetColors.textPrimary, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Name',
                        hintStyle: TextStyle(color: sheetColors.textMuted),
                        isDense: true,
                        filled: true,
                        fillColor: sheetColors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: sheetColors.cardBorder),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      style: TextStyle(color: sheetColors.textPrimary, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Phone Number',
                        hintStyle: TextStyle(color: sheetColors.textMuted),
                        isDense: true,
                        filled: true,
                        fillColor: sheetColors.subtleSurface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(color: sheetColors.cardBorder),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () async {
                      final n = nameController.text.trim();
                      final p = phoneController.text.trim();
                      if (n.isEmpty || p.isEmpty) return;
                      Navigator.pop(ctx);
                      _textController.text = '👤 Contact: $n\n📞 $p';
                      await _sendMessage();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Send'),
                  ),
                ],
              ),
              if (members.isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  'Or Select a Member from Directory:',
                  style: TextStyle(
                    color: sheetColors.textSecondary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 220),
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: members.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 6),
                    itemBuilder: (context, idx) {
                      final m = members[idx];
                      final fullName =
                          '${m['first_name'] ?? ''} ${m['last_name'] ?? ''}'.trim();
                      final phone = (m['phone_number'] ?? '').toString().trim();
                      return ListTile(
                        dense: true,
                        tileColor: sheetColors.subtleSurface,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        leading: CircleAvatar(
                          radius: 16,
                          backgroundColor: sheetColors.primaryNavy,
                          child: const Icon(
                            Icons.person_rounded,
                            color: Colors.white,
                            size: 16,
                          ),
                        ),
                        title: Text(
                          fullName.isEmpty ? 'Member' : fullName,
                          style: TextStyle(
                            color: sheetColors.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                        subtitle: Text(
                          phone.isEmpty ? 'No phone listed' : phone,
                          style: TextStyle(
                            color: sheetColors.textSecondary,
                            fontSize: 11.5,
                          ),
                        ),
                        trailing: const Icon(
                          Icons.send_rounded,
                          color: Color(0xFF2563EB),
                          size: 18,
                        ),
                        onTap: () async {
                          Navigator.pop(ctx);
                          _textController.text =
                              '👤 Contact: ${fullName.isEmpty ? 'Member' : fullName}${phone.isNotEmpty ? '\n📞 $phone' : ''}';
                          await _sendMessage();
                        },
                      );
                    },
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  void _showWhatsAppAttachmentTray() {
    final colors = MamsColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 20),
                Wrap(
                  spacing: 24,
                  runSpacing: 18,
                  alignment: WrapAlignment.center,
                  children: [
                    _buildTrayIconButton(
                      sheetColors,
                      icon: Icons.photo_library_rounded,
                      label: 'Gallery',
                      color: const Color(0xFF2563EB),
                      onTap: () {
                        Navigator.pop(ctx);
                        _pickFromGalleryDirectly();
                      },
                    ),
                    _buildTrayIconButton(
                      sheetColors,
                      icon: Icons.photo_camera_rounded,
                      label: 'Camera',
                      color: const Color(0xFFEC4899),
                      onTap: () {
                        Navigator.pop(ctx);
                        _showCameraModeSheet();
                      },
                    ),
                    _buildTrayIconButton(
                      sheetColors,
                      icon: Icons.location_on_rounded,
                      label: 'Location',
                      color: const Color(0xFF10B981),
                      onTap: () {
                        Navigator.pop(ctx);
                        _shareCurrentLocation();
                      },
                    ),
                    _buildTrayIconButton(
                      sheetColors,
                      icon: Icons.person_rounded,
                      label: 'Contact',
                      color: const Color(0xFF0EA5E9),
                      onTap: () {
                        Navigator.pop(ctx);
                        _showShareContactSheet();
                      },
                    ),
                    _buildTrayIconButton(
                      sheetColors,
                      icon: Icons.insert_drive_file_rounded,
                      label: 'Document',
                      color: const Color(0xFF6366F1),
                      onTap: () {
                        Navigator.pop(ctx);
                        _pickDocument();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTrayIconButton(
    MamsColors colors, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 72,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: color.withValues(alpha: 0.35)),
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: colors.textSecondary,
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showCameraModeSheet() {
    final colors = MamsColors.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          Navigator.pop(ctx);
                          _captureCameraPhoto();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: sheetColors.subtleSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: sheetColors.cardBorder),
                          ),
                          child: Column(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF1E3A8A),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.camera_alt_rounded,
                                  color: Colors.white,
                                  size: 21,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Take Photo',
                                style: TextStyle(
                                  color: sheetColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          Navigator.pop(ctx);
                          _captureCameraVideo();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: sheetColors.subtleSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: sheetColors.cardBorder),
                          ),
                          child: Column(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF2563EB),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.videocam_rounded,
                                  color: Colors.white,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Record Video',
                                style: TextStyle(
                                  color: sheetColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickFromGalleryDirectly();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: sheetColors.subtleSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: sheetColors.cardBorder),
                          ),
                          child: Column(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: const BoxDecoration(
                                  color: Color(0xFF10B981),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.photo_library_rounded,
                                  color: Colors.white,
                                  size: 21,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Upload Media',
                                style: TextStyle(
                                  color: sheetColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // WhatsApp-style Voice Note Recording
  Future<void> _startVoiceRecording({bool locked = false}) async {
    if (_isSending || _isRecording) return;
    try {
      HapticFeedback.mediumImpact();
      await _audioChannel.invokeMethod<String>('startRecording');
      if (mounted) {
        setState(() {
          _isRecording = true;
          _isRecordingLocked = locked;
          _micDragOffsetY = 0.0;
          _micDragOffsetX = 0.0;
          _recordingSeconds = 0;
        });
        _recordingTimer?.cancel();
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
          if (mounted) {
            setState(() => _recordingSeconds++);
          }
        });
      }
    } on PlatformException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.message ?? 'Microphone permission is required.'),
          ),
        );
      }
    }
  }

  Future<void> _finishVoiceRecording({required bool sendImmediately}) async {
    _recordingTimer?.cancel();
    _recordingTimer = null;
    try {
      final path = await _audioChannel.invokeMethod<String>('stopRecording');
      if (!mounted) return;

      setState(() {
        _isRecording = false;
        _isRecordingLocked = false;
        _micDragOffsetY = 0.0;
        _micDragOffsetX = 0.0;
        _recordingSeconds = 0;
      });

      if (sendImmediately && path != null && path.isNotEmpty) {
        await _sendVoiceNoteFile(path);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isRecording = false;
          _isRecordingLocked = false;
          _micDragOffsetY = 0.0;
          _micDragOffsetX = 0.0;
          _recordingSeconds = 0;
        });
      }
    }
  }

  Future<void> _sendVoiceNoteFile(String path) async {
    if (_isSending) return;
    setState(() => _isSending = true);
    final newMsg = await ApiService.sendChatMessage(
      widget.channelId,
      '',
      attachmentPath: path,
      attachmentType: 'audio',
    );
    if (!mounted) return;
    setState(() => _isSending = false);
    if (newMsg != null) {
      setState(() {
        _messages.add(newMsg);
        _lastMessageId = newMsg['id'];
      });
      _scrollToBottom();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to send voice note. Please try again.'),
        ),
      );
    }
  }

  Future<void> _togglePlayAudio(int messageId, String url) async {
    if (_playingMessageId == messageId) {
      await _audioChannel.invokeMethod('stopAudio').catchError((_) {});
      if (mounted) {
        setState(() => _playingMessageId = null);
      }
      return;
    }

    try {
      setState(() => _playingMessageId = messageId);
      await _audioChannel.invokeMethod('playAudio', {'url': url});
    } catch (_) {
      if (mounted) {
        setState(() => _playingMessageId = null);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not play voice note.')),
        );
      }
    }
  }

  Future<void> _openMediaUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri != null) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  String _formatDuration(int secs) {
    final mins = secs ~/ 60;
    final rem = secs % 60;
    return '$mins:${rem.toString().padLeft(2, '0')}';
  }

  Future<void> _sendMessage() async {
    if (_isRecording) {
      await _finishVoiceRecording(sendImmediately: true);
      return;
    }

    final text = _textController.text.trim();
    final images = List<XFile>.from(_selectedImages);
    final attachmentPath = _selectedFilePath;
    final attachmentType = _selectedFileType;

    if ((text.isEmpty && attachmentPath == null && images.isEmpty) ||
        _isSending) {
      return;
    }

    _textController.clear();
    _clearSelectedAttachment();
    setState(() => _isSending = true);

    if (images.length > 1) {
      // Send multiple selected photos sequentially
      for (int i = 0; i < images.length; i++) {
        final caption = (i == 0) ? text : '';
        final msg = await ApiService.sendChatMessage(
          widget.channelId,
          caption,
          attachmentPath: images[i].path,
          attachmentType: 'image',
        );
        if (msg != null && mounted) {
          setState(() {
            _messages.add(msg);
            _lastMessageId = msg['id'];
          });
        }
      }
      if (mounted) {
        setState(() => _isSending = false);
        _scrollToBottom();
      }
      return;
    }

    final newMsg = await ApiService.sendChatMessage(
      widget.channelId,
      text,
      attachmentPath: attachmentPath,
      attachmentType: attachmentType,
    );

    if (mounted) {
      setState(() => _isSending = false);
      if (newMsg != null) {
        setState(() {
          _messages.add(newMsg);
          _lastMessageId = newMsg['id'];
        });
        _scrollToBottom();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send message. Please try again.'),
          ),
        );
      }
    }
  }

  String _formatTime(String? dateStr) {
    if (dateStr == null) return '';
    try {
      final dt = DateTime.parse(dateStr).toLocal();
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return '';
    }
  }

  Widget _buildAttachmentWidget(Map<String, dynamic> msg, bool isMe) {
    final url = msg['attachment_url']?.toString();
    final type = msg['attachment_type']?.toString();
    final msgId = msg['id'] is int ? msg['id'] as int : 0;

    if (url == null || url.isEmpty) return const SizedBox.shrink();

    if (type == 'audio') {
      final isPlaying = _playingMessageId == msgId;
      return Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.22),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: () => _togglePlayAudio(msgId, url),
              child: CircleAvatar(
                radius: 18,
                backgroundColor: isPlaying
                    ? Colors.redAccent
                    : const Color(0xFF38BDF8),
                child: Icon(
                  isPlaying ? Icons.stop_rounded : Icons.play_arrow_rounded,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '🎤 Voice Note',
                  style: TextStyle(
                    color: isMe ? Colors.white : const Color(0xFF0F172A),
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                Text(
                  isPlaying ? 'Playing audio...' : 'Tap to listen',
                  style: TextStyle(
                    color: isMe ? Colors.white70 : const Color(0xFF475569),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (type == 'video') {
      return GestureDetector(
        onTap: () => _openMediaUrl(url),
        child: Container(
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white24),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: Color(0xFF2563EB),
                child: Icon(
                  Icons.play_circle_fill_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '🎬 Video Attachment',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    'Tap to play video',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    if (type == 'image') {
      return GestureDetector(
        onTap: () => _isSelectionMode ? _toggleSelectMessage(msg) : _openMediaUrl(url),
        child: Container(
          margin: const EdgeInsets.only(bottom: 6),
          constraints: const BoxConstraints(maxHeight: 220, maxWidth: 240),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text(
                  '📷 Tap to view image',
                  style: TextStyle(color: Colors.white70),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final docName = Uri.decodeFull(url.split('/').last);
    return GestureDetector(
      onTap: () => _openMediaUrl(url),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.25),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white24),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 17,
              backgroundColor: Color(0xFF6366F1),
              child: Icon(
                Icons.insert_drive_file_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    docName.isNotEmpty ? docName : '📄 Document Attachment',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isMe ? Colors.white : const Color(0xFF0F172A),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    'Tap to open document',
                    style: TextStyle(
                      color: isMe ? Colors.white70 : const Color(0xFF475569),
                      fontSize: 11,
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

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    final hasSendableDraft =
        _hasTypedText || _selectedFilePath != null || _selectedImages.isNotEmpty;

    return PopScope(
      canPop: !_isSelectionMode,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _isSelectionMode) {
          setState(() => _selectedMessageIds.clear());
        }
      },
      child: Scaffold(
        backgroundColor: colors.background,
        appBar: _isSelectionMode
            ? AppBar(
                backgroundColor: colors.primaryNavy,
                foregroundColor: Colors.white,
                elevation: 0,
                leading: IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                  onPressed: () => setState(() => _selectedMessageIds.clear()),
                ),
                title: Text(
                  '${_selectedMessageIds.length} selected',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                actions: [
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        for (final m in _messages) {
                          if (m is Map<String, dynamic> &&
                              _canDeleteMessage(m)) {
                            final id = int.tryParse(m['id']?.toString() ?? '');
                            if (id != null) _selectedMessageIds.add(id);
                          }
                        }
                      });
                    },
                    icon: const Icon(
                      Icons.select_all_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    label: const Text(
                      'All',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Delete Selected',
                    icon: const Icon(
                      Icons.delete_forever_rounded,
                      color: Colors.white,
                    ),
                    onPressed: _deleteSelectedMessages,
                  ),
                ],
              )
            : AppBar(
                backgroundColor: colors.cardSurface,
                elevation: 0,
                scrolledUnderElevation: 0,
                foregroundColor: colors.textPrimary,
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.channelName,
                      style: TextStyle(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w700,
                        color: colors.textPrimary,
                      ),
                    ),
                    Row(
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: colors.successGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          widget.channelType.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10.5,
                            color: colors.textSecondary,
                            letterSpacing: 0.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
        body: SafeArea(
          child: Column(
            children: [
              // Messages List
              Expanded(
                child: _isLoading
                    ? Center(
                        child: CircularProgressIndicator(
                          color: colors.primaryNavy,
                        ),
                      )
                    : _messages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.forum_outlined,
                                  size: 56,
                                  color: colors.textMuted,
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'No messages yet in this channel.',
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Hold the mic to send a voice note or tap the camera for photos & videos.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: colors.textSecondary,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 16,
                            ),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final msg =
                                  Map<String, dynamic>.from(_messages[index]);
                              final isMe = msg['is_me'] == true;
                              final msgId =
                                  int.tryParse(msg['id']?.toString() ?? '') ??
                                      -1;
                              final isSelected =
                                  _selectedMessageIds.contains(msgId);
                              final senderName = msg['sender_name'] ?? 'Member';
                              final senderRole = msg['sender_role'] ?? 'Member';
                              final content = (msg['content'] ?? '').toString();
                              final time = _formatTime(msg['created_at']);
                              final profilePic = msg['sender_profile_picture'];

                              String? dateHeader;
                              final rawDate = msg['created_at']?.toString();
                              if (rawDate != null) {
                                try {
                                  final dt = DateTime.parse(rawDate).toLocal();
                                  final prevRaw = index > 0
                                      ? _messages[index - 1]['created_at']
                                          ?.toString()
                                      : null;
                                  final prevDt = prevRaw != null
                                      ? DateTime.parse(prevRaw).toLocal()
                                      : null;
                                  if (prevDt == null ||
                                      dt.year != prevDt.year ||
                                      dt.month != prevDt.month ||
                                      dt.day != prevDt.day) {
                                    final now = DateTime.now();
                                    const months = [
                                      'Jan',
                                      'Feb',
                                      'Mar',
                                      'Apr',
                                      'May',
                                      'Jun',
                                      'Jul',
                                      'Aug',
                                      'Sep',
                                      'Oct',
                                      'Nov',
                                      'Dec'
                                    ];
                                    if (dt.year == now.year &&
                                        dt.month == now.month &&
                                        dt.day == now.day) {
                                      dateHeader = 'Today';
                                    } else {
                                      dateHeader =
                                          '${dt.day} ${months[dt.month - 1]}';
                                    }
                                  }
                                } catch (_) {}
                              }

                              return Column(
                                children: [
                                  if (dateHeader != null)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 10,
                                      ),
                                      child: Text(
                                        dateHeader,
                                        style: TextStyle(
                                          color: colors.textSecondary,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  GestureDetector(
                                    onLongPress: () =>
                                        _toggleSelectMessage(msg),
                                    onTap: _isSelectionMode
                                        ? () => _toggleSelectMessage(msg)
                                        : null,
                                    child: Container(
                                      margin: const EdgeInsets.only(bottom: 10),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 6,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? const Color(0xFF2563EB)
                                                .withValues(alpha: 0.16)
                                            : Colors.transparent,
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: isMe
                                            ? MainAxisAlignment.end
                                            : MainAxisAlignment.start,
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          if (_isSelectionMode) ...[
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                right: 8,
                                                bottom: 8,
                                              ),
                                              child: Icon(
                                                isSelected
                                                    ? Icons.check_circle_rounded
                                                    : Icons
                                                        .radio_button_unchecked_rounded,
                                                color: isSelected
                                                    ? const Color(0xFF2563EB)
                                                    : colors.textMuted,
                                                size: 22,
                                              ),
                                            ),
                                          ],
                                          if (!isMe) ...[
                                            CircleAvatar(
                                              radius: 16,
                                              backgroundColor:
                                                  colors.iconBadgeBg,
                                              backgroundImage:
                                                  profilePic != null
                                                      ? NetworkImage(profilePic)
                                                      : null,
                                              child: profilePic == null
                                                  ? Text(
                                                      senderName.isNotEmpty
                                                          ? senderName[0]
                                                              .toUpperCase()
                                                          : '?',
                                                      style: TextStyle(
                                                        color:
                                                            colors.iconBadgeFg,
                                                        fontSize: 13,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                      ),
                                                    )
                                                  : null,
                                            ),
                                            const SizedBox(width: 8),
                                          ],
                                          Flexible(
                                            child: Container(
                                              constraints: BoxConstraints(
                                                maxWidth: MediaQuery.of(context)
                                                        .size
                                                        .width *
                                                    0.73,
                                              ),
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 14,
                                                vertical: 10,
                                              ),
                                              decoration: BoxDecoration(
                                                color: isMe
                                                    ? const Color(0xFF2563EB)
                                                    : (colors.isDark
                                                        ? colors.cardSurface
                                                        : const Color(
                                                            0xFFF1F5F9)),
                                                borderRadius: BorderRadius.only(
                                                  topLeft:
                                                      const Radius.circular(16),
                                                  topRight:
                                                      const Radius.circular(16),
                                                  bottomLeft: Radius.circular(
                                                    isMe ? 16 : 4,
                                                  ),
                                                  bottomRight: Radius.circular(
                                                    isMe ? 4 : 16,
                                                  ),
                                                ),
                                                border: isMe
                                                    ? null
                                                    : Border.all(
                                                        color:
                                                            colors.cardBorder,
                                                      ),
                                              ),
                                              child: Column(
                                                crossAxisAlignment: isMe
                                                    ? CrossAxisAlignment.end
                                                    : CrossAxisAlignment.start,
                                                children: [
                                                  if (!isMe) ...[
                                                    Row(
                                                      mainAxisSize:
                                                          MainAxisSize.min,
                                                      children: [
                                                        Text(
                                                          senderName,
                                                          style: TextStyle(
                                                            fontWeight:
                                                                FontWeight.w700,
                                                            fontSize: 12.5,
                                                            color: colors
                                                                .textPrimary,
                                                          ),
                                                        ),
                                                        const SizedBox(
                                                          width: 6,
                                                        ),
                                                        Text(
                                                          '• $senderRole',
                                                          style: TextStyle(
                                                            fontSize: 11,
                                                            color: colors
                                                                .textSecondary,
                                                            fontWeight:
                                                                FontWeight.w600,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                    const SizedBox(height: 4),
                                                  ],
                                                  _buildAttachmentWidget(
                                                    msg,
                                                    isMe,
                                                  ),
                                                  if (content.isNotEmpty)
                                                    GestureDetector(
                                                      onTap: () {
                                                        if (_isSelectionMode) {
                                                          _toggleSelectMessage(msg);
                                                          return;
                                                        }
                                                        final urlMatch = RegExp(
                                                          r'https?://\S+',
                                                        ).firstMatch(content);
                                                        if (urlMatch != null) {
                                                          _openMediaUrl(
                                                            urlMatch.group(0)!,
                                                          );
                                                          return;
                                                        }
                                                        final phoneMatch = RegExp(
                                                          r'📞\s*([+0-9\s\-]+)',
                                                        ).firstMatch(content);
                                                        if (phoneMatch != null) {
                                                          final num = phoneMatch
                                                              .group(1)!
                                                              .trim();
                                                          _openMediaUrl(
                                                            'tel:$num',
                                                          );
                                                        }
                                                      },
                                                      child: Text(
                                                        content,
                                                        style: TextStyle(
                                                          color: isMe
                                                              ? Colors.white
                                                              : colors
                                                                  .textPrimary,
                                                          fontSize: 14.5,
                                                          height: 1.35,
                                                        ),
                                                      ),
                                                    ),
                                                  const SizedBox(height: 4),
                                                  Row(
                                                    mainAxisSize:
                                                        MainAxisSize.min,
                                                    children: [
                                                      Text(
                                                        time,
                                                        style: TextStyle(
                                                          fontSize: 10,
                                                          color: isMe
                                                              ? Colors.white
                                                                  .withValues(
                                                                    alpha: 0.78,
                                                                  )
                                                              : colors
                                                                  .textMuted,
                                                        ),
                                                      ),
                                                      if (isMe) ...[
                                                        const SizedBox(
                                                          width: 4,
                                                        ),
                                                        Icon(
                                                          Icons
                                                              .done_all_rounded,
                                                          size: 13,
                                                          color: Colors.white
                                                              .withValues(
                                                                alpha: 0.85,
                                                              ),
                                                        ),
                                                      ],
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
              ),

              // Selected Attachment Preview Bar
              if (_selectedFilePath != null || _selectedImages.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: colors.cardSurface,
                    border: Border(top: BorderSide(color: colors.cardBorder)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _selectedFileType == 'audio'
                            ? Icons.mic_rounded
                            : _selectedFileType == 'video'
                                ? Icons.videocam_rounded
                                : _selectedFileType == 'file'
                                    ? Icons.insert_drive_file_rounded
                                    : Icons.photo_library_rounded,
                        color: colors.accentBlue,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _selectedFileName ?? 'Attached media ready to send',
                          style: TextStyle(
                            color: colors.textPrimary,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.close,
                          color: colors.dangerRed,
                          size: 18,
                        ),
                        onPressed: _clearSelectedAttachment,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),

              // Bottom Input Bar (with WhatsApp-style Voice Recording & Lock)
              _buildBottomInputBar(colors, hasSendableDraft),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomInputBar(MamsColors colors, bool hasSendableDraft) {
    // 1. When Voice Recording is active (either Held or Locked)
    if (_isRecording) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: colors.cardSurface,
          border: Border(top: BorderSide(color: colors.cardBorder)),
        ),
        child: Row(
          children: [
            // Blinking red mic indicator + timer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: colors.dangerRed.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.fiber_manual_record_rounded,
                    color: colors.dangerRed,
                    size: 14,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _formatDuration(_recordingSeconds),
                    style: TextStyle(
                      color: colors.textPrimary,
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _isRecordingLocked
                  ? Row(
                      children: [
                        Icon(
                          Icons.lock_rounded,
                          size: 15,
                          color: colors.accentBlue,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            'Recording locked • Tap Send when done',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: colors.textSecondary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Icon(
                          Icons.keyboard_arrow_up_rounded,
                          size: 18,
                          color: colors.accentBlue,
                        ),
                        Expanded(
                          child: Text(
                            'Slide up to lock • Release to send',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: colors.textSecondary,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
            // Cancel / Trash button
            TextButton.icon(
              onPressed: () => _finishVoiceRecording(sendImmediately: false),
              icon: Icon(
                Icons.delete_outline_rounded,
                color: colors.dangerRed,
                size: 18,
              ),
              label: Text(
                'Cancel',
                style: TextStyle(
                  color: colors.dangerRed,
                  fontWeight: FontWeight.w700,
                  fontSize: 12.5,
                ),
              ),
            ),
            const SizedBox(width: 4),
            // Direct Send Voice Note button (1-tap send without hitting stop first!)
            GestureDetector(
              onTap: () => _finishVoiceRecording(sendImmediately: true),
              child: Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFF2563EB),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.send_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ],
        ),
      );
    }

    // 2. Normal WhatsApp-Style Input Bar:
    // [ 😊  Message...          📎   📷 ]  ( 🎤 / ➤ )
    const quickEmojis = [
      '🙏', '❤️', '👍', '🙌', '😊', '🎉', '🔥', '😂',
      '👏', '✨', '🕊️', '⛪', '📖', '🎶', '🤝', '💯',
      '😍', '🥰', '😇', '🤩', '😢', '😮', '💪', '🌟',
    ];

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: colors.cardSurface,
            border: Border(top: BorderSide(color: colors.cardBorder)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Rounded Pill Container: [ 😊  Message          📎   📷 ]
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: colors.subtleSurface,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: colors.cardBorder),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      IconButton(
                        icon: Icon(
                          _showEmojiPicker
                              ? Icons.keyboard_rounded
                              : Icons.emoji_emotions_outlined,
                          color: colors.textSecondary,
                          size: 22,
                        ),
                        tooltip: 'Emojis',
                        onPressed: () {
                          if (_showEmojiPicker) {
                            setState(() => _showEmojiPicker = false);
                            _messageFocusNode.requestFocus();
                          } else {
                            FocusScope.of(context).unfocus();
                            setState(() => _showEmojiPicker = true);
                          }
                        },
                        visualDensity: VisualDensity.compact,
                      ),
                      Expanded(
                        child: TextField(
                          controller: _textController,
                          focusNode: _messageFocusNode,
                          onTap: () {
                            if (_showEmojiPicker) {
                              setState(() => _showEmojiPicker = false);
                            }
                          },
                          style: TextStyle(color: colors.textPrimary, fontSize: 15),
                          textCapitalization: TextCapitalization.sentences,
                          minLines: 1,
                          maxLines: 4,
                          decoration: InputDecoration(
                            hintText: (_selectedFilePath != null ||
                                    _selectedImages.isNotEmpty)
                                ? 'Add caption...'
                                : 'Message',
                            hintStyle: TextStyle(
                              color: colors.textMuted,
                              fontSize: 15,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 10,
                            ),
                            border: InputBorder.none,
                            isDense: true,
                          ),
                          onSubmitted: (_) => _sendMessage(),
                        ),
                      ),
                      IconButton(
                        icon: Icon(
                          Icons.attach_file_rounded,
                          color: colors.textSecondary,
                          size: 22,
                        ),
                        tooltip: 'Share Gallery, Camera, Location, Contact or Document',
                        onPressed: _isSending ? null : _showWhatsAppAttachmentTray,
                        visualDensity: VisualDensity.compact,
                      ),
                      GestureDetector(
                        onLongPress: _isSending ? null : _captureCameraVideo,
                        child: IconButton(
                          icon: Icon(
                            Icons.photo_camera_outlined,
                            color: colors.textSecondary,
                            size: 22,
                          ),
                          tooltip: 'Camera (Photo or Video)',
                          onPressed: _isSending ? null : _showCameraModeSheet,
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Outside Right Circular Button: Send (➤) or Mic (🎤)
              if (hasSendableDraft || _isSending)
                Container(
                  width: 46,
                  height: 46,
                  decoration: const BoxDecoration(
                    color: Color(0xFF2563EB),
                    shape: BoxShape.circle,
                  ),
                  child: IconButton(
                    icon: _isSending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(
                            Icons.send_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                    onPressed: _isSending ? null : _sendMessage,
                  ),
                )
              else
                GestureDetector(
                  onTap: () => _startVoiceRecording(locked: true),
                  onLongPressStart: (_) => _startVoiceRecording(locked: false),
                  onLongPressMoveUpdate: (details) {
                    if (!_isRecording || _isRecordingLocked) return;
                    _micDragOffsetY = details.localOffsetFromOrigin.dy;
                    _micDragOffsetX = details.localOffsetFromOrigin.dx;
                    if (_micDragOffsetY < -45) {
                      HapticFeedback.heavyImpact();
                      setState(() {
                        _isRecordingLocked = true;
                      });
                    } else if (_micDragOffsetX < -90) {
                      HapticFeedback.lightImpact();
                      _finishVoiceRecording(sendImmediately: false);
                    }
                  },
                  onLongPressEnd: (_) {
                    if (_isRecording && !_isRecordingLocked) {
                      _finishVoiceRecording(sendImmediately: true);
                    }
                  },
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: const BoxDecoration(
                      color: Color(0xFF2563EB),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.mic_rounded,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (_showEmojiPicker)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: colors.cardSurface,
              border: Border(top: BorderSide(color: colors.cardBorder)),
            ),
            child: Wrap(
              spacing: 10,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: quickEmojis.map((emoji) {
                return InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: () {
                    final text = _textController.text;
                    final sel = _textController.selection;
                    final newText = (sel.isValid && sel.start >= 0)
                        ? text.replaceRange(sel.start, sel.end, emoji)
                        : '$text$emoji';
                    _textController.value = TextEditingValue(
                      text: newText,
                      selection: TextSelection.collapsed(
                        offset: (sel.isValid && sel.start >= 0)
                            ? sel.start + emoji.length
                            : newText.length,
                      ),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Text(
                      emoji,
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}

