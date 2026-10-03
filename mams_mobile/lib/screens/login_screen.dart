import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../theme/theme_controller.dart';
import 'home_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final LocalAuthentication auth = LocalAuthentication();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  String _currentServerUrl = ApiService.defaultBaseUrl;
  bool _canCheckBiometrics = false;
  bool _hasVaultCredentials = false;
  String _savedFullName = '';
  String _savedOrgName = '';
  String? _savedProfilePic;

  @override
  void initState() {
    super.initState();
    _loadCurrentServerUrl();
    _checkBiometrics();
    _loadSavedMemberProfile();
  }

  Future<void> _loadSavedMemberProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final first = (prefs.getString('first_name') ?? '').trim();
    final last = (prefs.getString('last_name') ?? '').trim();
    final full = '$first $last'.trim();
    final org = (prefs.getString('org_name') ?? '').trim();
    final pic = prefs.getString('profile_picture');
    final creds = await ApiService.getVaultCredentials();
    if (mounted) {
      setState(() {
        _savedFullName = full;
        _savedOrgName = org;
        _savedProfilePic = pic;
        if (_usernameController.text.isEmpty &&
            creds != null &&
            (creds['username'] ?? '').isNotEmpty) {
          _usernameController.text = creds['username']!;
        }
      });
    }
  }

  Future<void> _checkBiometrics() async {
    try {
      final canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
      final canAuthenticate = canAuthenticateWithBiometrics || await auth.isDeviceSupported();
      final hasVault = await ApiService.hasVaultCredentials();
      final hasToken = (await ApiService.getToken()) != null;

      if (mounted) {
        setState(() {
          _hasVaultCredentials = hasVault || hasToken;
          _canCheckBiometrics = canAuthenticate;
        });
      }
    } on PlatformException catch (e) {
      debugPrint('Error checking biometrics: $e');
    }
  }

  Future<void> _authenticateBiometric() async {
    try {
      final authenticated = await auth.authenticate(
        localizedReason: 'Scan your fingerprint or face to unlock MAMS',
        biometricOnly: false,
      );

      if (!authenticated || !mounted) return;

      // Check if we already have a valid session token
      final token = await ApiService.getToken();
      if (!mounted) return;
      if (token != null && token.isNotEmpty) {
        Navigator.pushReplacementNamed(context, '/home');
        return;
      }

      // If logged out, retrieve credentials from Secure Vault and log in seamlessly
      final creds = await ApiService.getVaultCredentials();
      if (creds != null) {
        setState(() {
          _isLoading = true;
          _errorMessage = null;
        });

        final result = await ApiService.login(creds['username']!, creds['password']!);

        if (!mounted) return;

        setState(() {
          _isLoading = false;
        });

        if (result['success'] == true) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          setState(() {
            _errorMessage = result['error'] ?? 'Biometric login failed. Please enter password.';
          });
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No saved biometric credentials. Please sign in with password first.')),
          );
        }
      }
    } on PlatformException catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Biometric authentication error: ${e.message}';
        });
      }
    }
  }

  Future<void> _loadCurrentServerUrl() async {
    final url = await ApiService.getBaseUrl();
    if (mounted) {
      setState(() {
        _currentServerUrl = url;
      });
    }
  }

  void _login() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your username/email and password.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await ApiService.login(username, password);

    if (!mounted) return;

    setState(() {
      _isLoading = false;
    });

    if (result['success'] == true) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
      );
    } else {
      setState(() {
        _errorMessage =
            result['error'] ?? 'Login failed. Check your credentials.';
      });
    }
  }

  void _showServerSettingsDialog() {
    final controller = TextEditingController(text: _currentServerUrl);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: const Row(
            children: [
              Icon(Icons.dns, color: Color(0xFF818CF8)),
              SizedBox(width: 8),
              Text(
                'Server Address',
                style: TextStyle(color: Colors.white, fontSize: 18),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Backend API URL:',
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: controller,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  hintText: 'http://127.0.0.1:8000/api',
                  hintStyle: TextStyle(color: Colors.white30),
                  filled: true,
                  fillColor: Color(0xFF0F172A),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Quick Presets:',
                style: TextStyle(color: Colors.white54, fontSize: 12),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  ActionChip(
                    label: const Text('Wi-Fi (172.16.50.68)'),
                    backgroundColor: const Color(0xFF1E3A8A),
                    labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                    onPressed: () {
                      controller.text = 'http://172.16.50.68:8000/api';
                    },
                  ),
                  ActionChip(
                    label: const Text('USB (localhost)'),
                    backgroundColor: const Color(0xFF334155),
                    labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                    onPressed: () {
                      controller.text = 'http://127.0.0.1:8000/api';
                    },
                  ),
                  ActionChip(
                    label: const Text('Emulator'),
                    backgroundColor: const Color(0xFF334155),
                    labelStyle: const TextStyle(color: Colors.white, fontSize: 11),
                    onPressed: () {
                      controller.text = 'http://10.0.2.2:8000/api';
                    },
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Colors.white60)),
            ),
            ElevatedButton(
              onPressed: () async {
                await ApiService.setBaseUrl(controller.text);
                await _loadCurrentServerUrl();
                if (ctx.mounted) Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
              ),
              child: const Text('Save'),
            ),
          ],
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
        backgroundColor: colors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        actions: [
          IconButton(
            tooltip: 'Toggle Light / Dark Mode',
            icon: Icon(ThemeController.modeIcon, color: colors.textSecondary, size: 21),
            onPressed: () {
              final next = colors.isDark ? ThemeMode.light : ThemeMode.dark;
              ThemeController.setThemeMode(next);
            },
          ),
          IconButton(
            tooltip: 'Server Settings',
            icon: Icon(Icons.settings_outlined, color: colors.textSecondary, size: 21),
            onPressed: _showServerSettingsDialog,
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: colors.cardBorder, width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: colors.isDark ? 0.35 : 0.08),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(19),
                    child: Image.asset(
                      'assets/icon/app_icon.png',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'MAMS',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                    color: colors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Membership Affiliation & Management System',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: colors.textSecondary,
                  ),
                ),
                const SizedBox(height: 28),

                // Login Form Card
                Container(
                  padding: const EdgeInsets.all(24.0),
                  decoration: BoxDecoration(
                    color: colors.cardSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: colors.cardBorder, width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: colors.isDark ? 0.25 : 0.04),
                        blurRadius: 14,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_savedFullName.isNotEmpty) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: colors.subtleSurface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: colors.cardBorder),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: colors.iconBadgeBg,
                                backgroundImage: (_savedProfilePic != null &&
                                        _savedProfilePic!.isNotEmpty)
                                    ? NetworkImage(_savedProfilePic!)
                                    : null,
                                child: (_savedProfilePic == null ||
                                        _savedProfilePic!.isEmpty)
                                    ? Text(
                                        _savedFullName[0].toUpperCase(),
                                        style: TextStyle(
                                          color: colors.accentBlue,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 18,
                                        ),
                                      )
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Welcome back,',
                                      style: TextStyle(
                                        color: colors.textSecondary,
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    Text(
                                      _savedFullName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: colors.textPrimary,
                                        fontSize: 15.5,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    if (_savedOrgName.isNotEmpty)
                                      Text(
                                        _savedOrgName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: colors.accentBlue,
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              Icon(
                                Icons.verified_user_rounded,
                                color: colors.accentBlue,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        Text(
                          'Sign in to your account',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: colors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                      if (_errorMessage != null)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: colors.dangerRed.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: colors.dangerRed.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline, color: colors.dangerRed, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: TextStyle(
                                    color: colors.dangerRed,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      TextField(
                        controller: _usernameController,
                        style: TextStyle(color: colors.textPrimary, fontSize: 15),
                        decoration: InputDecoration(
                          labelText: 'Email or Username',
                          labelStyle: TextStyle(color: colors.textSecondary, fontSize: 14),
                          prefixIcon: Icon(Icons.person_outline, color: colors.textSecondary, size: 20),
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
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: TextStyle(color: colors.textPrimary, fontSize: 15),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          labelStyle: TextStyle(color: colors.textSecondary, fontSize: 14),
                          prefixIcon: Icon(Icons.lock_outline, color: colors.textSecondary, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              color: colors.textSecondary,
                              size: 20,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
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
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
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
                                  'Sign In',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            if (!_canCheckBiometrics) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Biometrics are not supported or enrolled on this device.')),
                              );
                              return;
                            }
                            if (!_hasVaultCredentials) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Please sign in with your password first to enable biometric login.')),
                              );
                              return;
                            }
                            if (!_isLoading) {
                              _authenticateBiometric();
                            }
                          },
                          icon: Icon(Icons.fingerprint, color: colors.textPrimary, size: 20),
                          label: Text(
                            'Login with Biometrics',
                            style: TextStyle(color: colors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          style: OutlinedButton.styleFrom(
                            backgroundColor: colors.subtleSurface,
                            side: BorderSide(color: colors.cardBorder),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen()));
                  },
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(color: colors.textSecondary, fontSize: 14),
                      children: [
                        const TextSpan(text: "Don't have an account? "),
                        TextSpan(
                          text: 'Join Organization',
                          style: TextStyle(
                            color: colors.accentBlue,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                TextButton.icon(
                  icon: Icon(Icons.dns_outlined, size: 14, color: colors.textMuted),
                  label: Text(
                    'Server: $_currentServerUrl',
                    style: TextStyle(color: colors.textMuted, fontSize: 12),
                  ),
                  onPressed: _showServerSettingsDialog,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

