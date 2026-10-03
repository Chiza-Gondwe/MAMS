import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class ScanQrScreen extends StatefulWidget {
  const ScanQrScreen({super.key});

  @override
  State<ScanQrScreen> createState() => _ScanQrScreenState();
}

class _ScanQrScreenState extends State<ScanQrScreen> {
  bool _isProcessing = false;
  int _myMemberId = 0;
  String _myFullName = '';
  String _mySection = 'Unassigned Section';
  String _myZone = 'Unassigned Zone';
  String _myRole = 'member';
  String? _myProfilePic;

  @override
  void initState() {
    super.initState();
    _loadMyIdentity();
  }

  Future<void> _loadMyIdentity() async {
    final prefs = await SharedPreferences.getInstance();
    final first = (prefs.getString('first_name') ?? '').trim();
    final last = (prefs.getString('last_name') ?? '').trim();
    if (mounted) {
      setState(() {
        _myMemberId = prefs.getInt('member_id') ?? 0;
        _myFullName = '$first $last'.trim();
        _mySection = prefs.getString('section_name') ?? 'Unassigned Section';
        _myZone = prefs.getString('zone_name') ?? 'Unassigned Zone';
        _myRole = prefs.getString('role') ?? 'member';
        _myProfilePic = prefs.getString('profile_picture');
      });
    }

    final user = await ApiService.getCurrentUser();
    if (!mounted || user.containsKey('error')) return;
    setState(() {
      _myMemberId = int.tryParse(user['member_id']?.toString() ?? '') ?? _myMemberId;
      final f = (user['first_name'] ?? '').toString().trim();
      final l = (user['last_name'] ?? '').toString().trim();
      _myFullName = '$f $l'.trim();
      if (_myFullName.isEmpty) {
        _myFullName = (user['username'] ?? 'Member').toString();
      }
      _mySection = (user['section_name'] ?? _mySection).toString();
      _myZone = (user['zone_name'] ?? _myZone).toString();
      _myRole = (user['role'] ?? _myRole).toString();
      _myProfilePic = user['profile_picture']?.toString();
    });
  }

  bool get _isLeader {
    return [
      'superadmin',
      'admin',
      'section_admin',
      'section_leader',
      'zone_admin',
      'group_leader',
      'pta',
    ].contains(_myRole);
  }

  void _handleBarcode(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final String? rawValue = barcodes.first.rawValue?.trim();
    if (rawValue == null || rawValue.isEmpty) return;

    // 1. Check if this is a Member's Personal QR Code (MAMS-MEMBER:<id>)
    if (rawValue.contains('MAMS-MEMBER:')) {
      final tail = rawValue.split('MAMS-MEMBER:').last.trim();
      final m = RegExp(r'(\d+)').firstMatch(tail);
      final memberId = m != null ? int.tryParse(m.group(1)!) : null;
      if (memberId != null) {
        await _verifyAndPromptMemberCheckIn(memberId);
      }
      return;
    }

    // 2. Otherwise check if this is a Session / Service QR Code
    if (!rawValue.contains('MAMS-SESSION-') &&
        !rawValue.contains('/scan/') &&
        !rawValue.contains('MAMS-ATTENDANCE')) {
      return;
    }

    setState(() => _isProcessing = true);

    try {
      Map<String, dynamic> result;
      if (rawValue.contains('/scan/today') ||
          rawValue.contains('MAMS-ATTENDANCE-TODAY')) {
        result = await ApiService.scanTodayAttendance();
      } else {
        int? sessionId;
        if (rawValue.contains('MAMS-SESSION-')) {
          final tail = rawValue.split('MAMS-SESSION-')[1];
          final m = RegExp(r'(\d+)').firstMatch(tail);
          sessionId = m != null ? int.tryParse(m.group(1)!) : null;
        } else {
          final tail = rawValue.split('/scan/').last;
          final m = RegExp(r'(\d+)').firstMatch(tail);
          sessionId = m != null ? int.tryParse(m.group(1)!) : null;
        }
        if (sessionId == null) {
          setState(() => _isProcessing = false);
          return;
        }
        result = await ApiService.scanAttendance(sessionId);
      }

      if (!mounted) return;
      setState(() => _isProcessing = false);

      final memberData = result['member'] as Map<String, dynamic>? ?? {
        'id': _myMemberId,
        'full_name': _myFullName.isNotEmpty ? _myFullName : 'Member',
        'section_name': _mySection,
        'zone_name': _myZone,
        'role': _myRole,
        'profile_picture': _myProfilePic,
      };

      await _showVisualVerificationCard(
        member: memberData,
        checkedIn: result['success'] == true,
        alreadyCheckedIn: result['already_checked_in'] == true,
        statusMessage: (result['message'] ?? '').toString(),
        sessionTitle: (result['session_title'] ?? 'Today\'s Service').toString(),
        closeScreenOnDone: result['success'] == true,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _verifyAndPromptMemberCheckIn(int memberId) async {
    setState(() => _isProcessing = true);
    final verifyRes = await ApiService.verifyMemberForAttendance(memberId);
    if (!mounted) return;
    setState(() => _isProcessing = false);

    if (verifyRes['success'] != true || verifyRes['member'] == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            (verifyRes['message'] ?? 'Could not verify member #$memberId')
                .toString(),
          ),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final member = verifyRes['member'] as Map<String, dynamic>;
    await _showVisualVerificationCard(
      member: member,
      checkedIn: false,
      alreadyCheckedIn: false,
      statusMessage: 'Visually confirm member identity below before checking in.',
      sessionTitle: 'Today\'s Service',
      closeScreenOnDone: false,
    );
  }

  Future<void> _showVisualVerificationCard({
    required Map<String, dynamic> member,
    required bool checkedIn,
    required bool alreadyCheckedIn,
    required String statusMessage,
    required String sessionTitle,
    required bool closeScreenOnDone,
  }) async {
    bool isCheckedIn = checkedIn;
    bool isAlready = alreadyCheckedIn;
    bool isSubmitting = false;
    String message = statusMessage;
    String serviceName = sessionTitle;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      isDismissible: false,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            final colors = MamsColors.of(ctx);
            final fullName = (member['full_name'] ?? 'Member').toString();
            final memberId = member['id']?.toString() ?? '';
            final sectionName =
                (member['section_name'] ?? 'Unassigned Section').toString();
            final zoneName =
                (member['zone_name'] ?? 'Unassigned Zone').toString();
            final role = (member['role'] ?? 'member').toString().toUpperCase();
            final status =
                (member['status'] ?? 'active').toString().toUpperCase();
            final photoUrl = member['profile_picture']?.toString();
            final initials = fullName.isNotEmpty
                ? fullName
                      .trim()
                      .split(RegExp(r'\s+'))
                      .take(2)
                      .map((p) => p.isNotEmpty ? p[0].toUpperCase() : '')
                      .join()
                : 'M';

            final badgeColor = isCheckedIn
                ? const Color(0xFF10B981)
                : const Color(0xFF2563EB);

            return SafeArea(
              child: Container(
                margin: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                padding: const EdgeInsets.fromLTRB(22, 16, 22, 22),
                decoration: BoxDecoration(
                  color: colors.cardSurface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: colors.cardBorder, width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: colors.cardBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Top Verification Banner
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: badgeColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: badgeColor.withValues(alpha: 0.35),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isCheckedIn
                                ? Icons.verified_user_rounded
                                : Icons.badge_rounded,
                            color: badgeColor,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isCheckedIn
                                ? (isAlready
                                      ? 'IDENTITY VERIFIED • ALREADY CHECKED IN'
                                      : 'IDENTITY VERIFIED • CHECKED IN ✓')
                                : 'VISUAL IDENTITY VERIFICATION',
                            style: TextStyle(
                              color: badgeColor,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Large Member Profile Photo with Verification Ring
                     Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: badgeColor, width: 3),
                          ),
                          child: CircleAvatar(
                            radius: 54,
                            backgroundColor: colors.iconBadgeBg,
                            backgroundImage:
                                (photoUrl != null && photoUrl.isNotEmpty)
                                ? NetworkImage(photoUrl)
                                : null,
                            child: (photoUrl == null || photoUrl.isEmpty)
                                ? Text(
                                    initials,
                                    style: TextStyle(
                                      color: colors.accentBlue,
                                      fontSize: 32,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  )
                                : null,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: badgeColor,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: colors.cardSurface,
                              width: 2.5,
                            ),
                          ),
                          child: Icon(
                            isCheckedIn
                                ? Icons.check_rounded
                                : Icons.camera_front_rounded,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Full Name & Member ID
                    Text(
                      fullName,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: colors.textPrimary,
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      memberId.isNotEmpty
                          ? 'Member ID #$memberId • $role • $status'
                          : '$role • $status',
                      style: TextStyle(
                        color: colors.textSecondary,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section & Zone Details Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: colors.subtleSurface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: colors.cardBorder),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'SECTION',
                                  style: TextStyle(
                                    color: colors.textMuted,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.layers_outlined,
                                      size: 15,
                                      color: colors.accentBlue,
                                    ),
                                    const SizedBox(width: 5),
                                    Expanded(
                                      child: Text(
                                        sectionName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: colors.textPrimary,
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 1,
                            height: 34,
                            color: colors.cardBorder,
                            margin: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'ZONE',
                                  style: TextStyle(
                                    color: colors.textMuted,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.map_outlined,
                                      size: 15,
                                      color: colors.accentBlue,
                                    ),
                                    const SizedBox(width: 5),
                                    Expanded(
                                      child: Text(
                                        zoneName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: colors.textPrimary,
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Status / Service Message
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isCheckedIn
                            ? colors.successBg
                            : colors.iconBadgeBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        message.isNotEmpty ? message : serviceName,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isCheckedIn
                              ? colors.successGreen
                              : colors.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Action Buttons
                    if (!isCheckedIn)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: isSubmitting
                                  ? null
                                  : () => Navigator.pop(ctx),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                side: BorderSide(color: colors.cardBorder),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                'Cancel',
                                style: TextStyle(
                                  color: colors.textSecondary,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton.icon(
                              onPressed: isSubmitting
                                  ? null
                                  : () async {
                                      final id = int.tryParse(memberId);
                                      if (id == null) return;
                                      setSheetState(() => isSubmitting = true);
                                      final scanRes =
                                          await ApiService.scanTodayAttendance(
                                            id,
                                          );
                                      setSheetState(() {
                                        isSubmitting = false;
                                        if (scanRes['success'] == true) {
                                          isCheckedIn = true;
                                          isAlready =
                                              scanRes['already_checked_in'] ==
                                              true;
                                          message =
                                              (scanRes['message'] ??
                                                      'Attendance recorded!')
                                                  .toString();
                                          serviceName =
                                              (scanRes['session_title'] ??
                                                      serviceName)
                                                  .toString();
                                        } else {
                                          message =
                                              (scanRes['message'] ??
                                                      'Failed to check in')
                                                  .toString();
                                        }
                                      });
                                    },
                              icon: isSubmitting
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.how_to_reg_rounded,
                                      size: 18,
                                    ),
                              label: Text(
                                isSubmitting
                                    ? 'Checking In...'
                                    : 'Confirm & Check In',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF2563EB),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    else
                      Row(
                        children: [
                          if (_isLeader) ...[
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () => Navigator.pop(ctx),
                                icon: Icon(
                                  Icons.qr_code_scanner_rounded,
                                  size: 18,
                                  color: colors.textPrimary,
                                ),
                                label: Text(
                                  'Scan Next',
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 13,
                                  ),
                                  side: BorderSide(color: colors.cardBorder),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                          ],
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.pop(ctx);
                                if (closeScreenOnDone && mounted) {
                                  Navigator.pop(context);
                                }
                              },
                              icon: const Icon(Icons.check_circle_outline, size: 18),
                              label: const Text(
                                'Done',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 13,
                                ),
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
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
      },
    );
  }

  void _showManualMemberIdDialog() {
    final controller = TextEditingController();
    final colors = MamsColors.of(context);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: colors.cardSurface,
        title: Text(
          'Verify Member by ID',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 17,
          ),
        ),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          style: TextStyle(color: colors.textPrimary),
          decoration: InputDecoration(
            labelText: 'Enter Member ID (e.g. 1, 2, 15)',
            labelStyle: TextStyle(color: colors.textSecondary),
            filled: true,
            fillColor: colors.subtleSurface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(color: colors.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              final id = int.tryParse(controller.text.trim());
              Navigator.pop(ctx);
              if (id != null) {
                _verifyAndPromptMemberCheckIn(id);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
            child: const Text('Verify Identity'),
          ),
        ],
      ),
    );
  }

  void _showMyMemberQrPass() {
    final colors = MamsColors.of(context);
    final qrData = 'MAMS-MEMBER:${_myMemberId > 0 ? _myMemberId : 1}';
    final displayName = _myFullName.isNotEmpty ? _myFullName : 'Member';
    final initials = displayName
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((p) => p.isNotEmpty ? p[0].toUpperCase() : '')
        .join();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colors.cardSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final sheetColors = MamsColors.of(ctx);
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: sheetColors.cardBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                CircleAvatar(
                  radius: 38,
                  backgroundColor: sheetColors.iconBadgeBg,
                  backgroundImage:
                      (_myProfilePic != null && _myProfilePic!.isNotEmpty)
                      ? NetworkImage(_myProfilePic!)
                      : null,
                  child: (_myProfilePic == null || _myProfilePic!.isEmpty)
                      ? Text(
                          initials,
                          style: TextStyle(
                            color: sheetColors.accentBlue,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 10),
                Text(
                  displayName,
                  style: TextStyle(
                    color: sheetColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  '$_mySection • $_myZone',
                  style: TextStyle(
                    color: sheetColors.textSecondary,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: sheetColors.cardBorder),
                  ),
                  child: QrImageView(
                    data: qrData,
                    version: QrVersions.auto,
                    size: 200,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Show this QR pass to your Admin or Section Leader to verify your identity & check in (100% offline)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: sheetColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = MamsColors.of(context);
    return Scaffold(
      backgroundColor: colors.background,
      appBar: AppBar(
        title: Text(
          'Scan Attendance QR',
          style: TextStyle(
            color: colors.textPrimary,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        backgroundColor: colors.cardSurface,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: _showMyMemberQrPass,
            icon: Icon(
              Icons.badge_outlined,
              size: 18,
              color: colors.accentBlue,
            ),
            label: Text(
              'My QR Pass',
              style: TextStyle(
                color: colors.accentBlue,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(onDetect: _handleBarcode),
          CustomPaint(painter: ScannerOverlay(), child: Container()),
          Positioned(
            bottom: 28,
            left: 20,
            right: 20,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.68),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    _isLeader
                        ? 'Scan a Service QR Code OR scan a Member\'s Personal QR Pass to visually verify their photo & check them in.'
                        : 'Point camera at the Church/School Attendance QR Code, or tap "My QR Pass" above.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (_isLeader) ...[
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    onPressed: _showManualMemberIdDialog,
                    icon: const Icon(Icons.person_search_rounded, size: 18),
                    label: const Text(
                      'Verify Member by ID',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Verifying Member Identity...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class ScannerOverlay extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black54
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(size.width / 2, size.height / 2),
            width: 250,
            height: 250,
          ),
          const Radius.circular(16),
        ),
      )
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);

    final borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(size.width / 2, size.height / 2),
          width: 250,
          height: 250,
        ),
        const Radius.circular(16),
      ),
      borderPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
