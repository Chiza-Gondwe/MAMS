import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';

class VerifyEmailScreen extends StatefulWidget {
  final String email;
  const VerifyEmailScreen({super.key, required this.email});

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  void _verify() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await ApiService.verifyEmail(widget.email, otp);
    
    if (!mounted) return;
    
    setState(() => _isLoading = false);

    if (result.containsKey('message') && result['message'].toString().toLowerCase().contains('success')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email verified! You can now log in.')),
      );
      Navigator.popUntil(context, (route) => route.isFirst);
    } else {
      setState(() {
        _errorMessage = result['error'] ?? 'Invalid OTP code.';
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
          'Verify Email',
          style: TextStyle(color: colors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
        ),
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: colors.textPrimary,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colors.cardSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: colors.cardBorder),
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
                Center(
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: colors.iconBadgeBg,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: colors.cardBorder),
                    ),
                    child: Icon(Icons.mark_email_read_outlined, size: 30, color: colors.iconBadgeFg),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Enter Verification Code',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: colors.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  'We sent a 6-digit code to ${widget.email}. Please enter it below.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: colors.textSecondary, fontSize: 13.5, height: 1.4),
                ),
                const SizedBox(height: 24),
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
                      style: TextStyle(color: colors.dangerRed, fontSize: 13),
                    ),
                  ),
                TextField(
                  controller: _otpController,
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  style: TextStyle(
                    fontSize: 28,
                    letterSpacing: 8,
                    fontWeight: FontWeight.w700,
                    color: colors.textPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: '000000',
                    hintStyle: TextStyle(color: colors.textMuted, letterSpacing: 8),
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
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: colors.accentBlue, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _isLoading ? null : _verify,
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
                      : const Text('Verify Email', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


