import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/scan_screen.dart';

void main() {
  runApp(const MAMSApp());
}

class MAMSApp extends StatelessWidget {
  const MAMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MAMS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1F3864),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/scan': (context) => const ScanScreen(),
      },
    );
  }
}
