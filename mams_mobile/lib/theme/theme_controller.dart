import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeController {
  static const String _prefKey = 'mams_theme_mode';
  static final ValueNotifier<ThemeMode> themeModeNotifier =
      ValueNotifier<ThemeMode>(ThemeMode.light);

  /// Load persisted theme mode on app startup (defaults to Light Mode - Option A)
  static Future<void> loadTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved == 'dark') {
        themeModeNotifier.value = ThemeMode.dark;
      } else if (saved == 'system') {
        themeModeNotifier.value = ThemeMode.system;
      } else {
        themeModeNotifier.value = ThemeMode.light;
      }
    } catch (_) {
      themeModeNotifier.value = ThemeMode.light;
    }
  }

  /// Update and persist theme mode
  static Future<void> setThemeMode(ThemeMode mode) async {
    themeModeNotifier.value = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = mode == ThemeMode.dark
          ? 'dark'
          : mode == ThemeMode.system
              ? 'system'
              : 'light';
      await prefs.setString(_prefKey, str);
    } catch (_) {}
  }

  static String get modeLabel {
    switch (themeModeNotifier.value) {
      case ThemeMode.light:
        return 'Light Mode';
      case ThemeMode.dark:
        return 'Dark Mode';
      case ThemeMode.system:
        return 'System Default';
    }
  }

  static IconData get modeIcon {
    switch (themeModeNotifier.value) {
      case ThemeMode.light:
        return Icons.light_mode_rounded;
      case ThemeMode.dark:
        return Icons.dark_mode_rounded;
      case ThemeMode.system:
        return Icons.brightness_auto_rounded;
    }
  }
}

/// Institutional design tokens for Option A (Light) and Option B (Matte Dark)
class MamsColors {
  final bool isDark;
  const MamsColors(this.isDark);

  static MamsColors of(BuildContext context) {
    return MamsColors(Theme.of(context).brightness == Brightness.dark);
  }

  // Scaffold & Surface
  Color get background =>
      isDark ? const Color(0xFF121418) : const Color(0xFFF4F6F9);
  Color get cardSurface =>
      isDark ? const Color(0xFF1C2026) : const Color(0xFFFFFFFF);
  Color get cardBorder =>
      isDark ? const Color(0xFF2D333F) : const Color(0xFFE2E8F0);
  Color get subtleSurface =>
      isDark ? const Color(0xFF242932) : const Color(0xFFF8FAFC);

  // Typography
  Color get textPrimary =>
      isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);
  Color get textSecondary =>
      isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
  Color get textMuted =>
      isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8);

  // Institutional Brand Accent
  Color get primaryNavy => const Color(0xFF1E3A8A);
  Color get accentBlue =>
      isDark ? const Color(0xFF60A5FA) : const Color(0xFF1E3A8A);
  Color get iconBadgeBg =>
      isDark ? const Color(0xFF252B37) : const Color(0xFFEEF2FF);
  Color get iconBadgeFg =>
      isDark ? const Color(0xFF93C5FD) : const Color(0xFF1E3A8A);

  // Status Colors
  Color get successGreen => const Color(0xFF10B981);
  Color get successBg =>
      isDark ? const Color(0xFF064E3B).withValues(alpha: 0.35) : const Color(0xFFECFDF5);
  Color get warningAmber => const Color(0xFFD97706);
  Color get warningBg =>
      isDark ? const Color(0xFF78350F).withValues(alpha: 0.35) : const Color(0xFFFFFBEB);
  Color get dangerRed => const Color(0xFFEF4444);
}
