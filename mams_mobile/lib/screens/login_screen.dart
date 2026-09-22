import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter/services.dart';
import '../services/api_service.dart';
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

  @override
  void initState() {
    super.initState();
    _loadCurrentServerUrl();
    _checkBiometrics();
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
                children: [
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
                backgroundColor: const Color(0xFF4F46E5),
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
    return Scaffold(
      backgroundColor: const Color(0xFF0A1628),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Server Settings',
            icon: const Icon(Icons.settings, color: Colors.white70),
            onPressed: _showServerSettingsDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1F3864),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(
                    Icons.supervised_user_circle,
                    size: 64,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'MAMS',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Text(
                  'Membership Affiliation & Management',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white60,
                  ),
                ),
                const SizedBox(height: 36),

                // Login Form Card
                Container(
                  padding: const EdgeInsets.all(24.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFF111E36),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white10),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      if (_errorMessage != null)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade400),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline,
                                  color: Colors.redAccent, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(
                                    color: Colors.redAccent,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      TextField(
                        controller: _usernameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Email or Username',
                          labelStyle: const TextStyle(color: Colors.white60),
                          prefixIcon: const Icon(Icons.person_outline,
                              color: Colors.white60),
                          filled: true,
                          fillColor: const Color(0xFF0A1628),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.white12),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.white12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        style: const TextStyle(color: Colors.white),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          labelStyle: const TextStyle(color: Colors.white60),
                          prefixIcon: const Icon(Icons.lock_outline, color: Colors.white60),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: Colors.white60,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          filled: true,
                          fillColor: const Color(0xFF0A1628),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.white12),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: Colors.white12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _login,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4CAF50),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text(
                                  'Sign In',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
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
                          icon: const Icon(Icons.fingerprint, color: Colors.white),
                          label: const Text('Login with Biometrics'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            side: const BorderSide(color: Colors.white30),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
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
                  child: const Text(
                    "Don't have an account? Sign Up",
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.wifi_tethering,
                      size: 14, color: Colors.white38),
                  label: Text(
                    'Server: $_currentServerUrl',
                    style: const TextStyle(color: Colors.white38, fontSize: 12),
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
