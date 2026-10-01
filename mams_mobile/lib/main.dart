import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/scan_screen.dart';
import 'theme/theme_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeController.loadTheme();
  runApp(const MAMSApp());
}

class MAMSApp extends StatelessWidget {
  const MAMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.themeModeNotifier,
      builder: (context, themeMode, _) {
        return MaterialApp(
          title: 'MAMS',
          debugShowCheckedModeBanner: false,
          themeMode: themeMode,
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
            scaffoldBackgroundColor: const Color(0xFFF4F6F9),
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF1E3A8A),
              brightness: Brightness.light,
              primary: const Color(0xFF1E3A8A),
              surface: const Color(0xFFFFFFFF),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFFF4F6F9),
              foregroundColor: Color(0xFF0F172A),
              elevation: 0,
              scrolledUnderElevation: 0,
            ),
          ),
          darkTheme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.dark,
            scaffoldBackgroundColor: const Color(0xFF121418),
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF1E3A8A),
              brightness: Brightness.dark,
              primary: const Color(0xFF60A5FA),
              surface: const Color(0xFF1C2026),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFF121418),
              foregroundColor: Color(0xFFF8FAFC),
              elevation: 0,
              scrolledUnderElevation: 0,
            ),
          ),
          initialRoute: '/login',
          routes: {
            '/login': (context) => const LoginScreen(),
            '/home': (context) => const HomeScreen(),
            '/scan': (context) => const ScanScreen(),
          },
        );
      },
    );
  }
}

