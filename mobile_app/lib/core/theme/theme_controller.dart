import 'package:flutter/material.dart';
import '../storage/secure_storage_service.dart';

/// Holds the app-wide theme mode and persists the user's choice.
class ThemeController {
  static final ValueNotifier<ThemeMode> mode = ValueNotifier(ThemeMode.light);

  static bool get isDark => mode.value == ThemeMode.dark;

  static Future<void> load() async {
    final saved = await SecureStorageService.getThemeMode();
    mode.value = saved == 'dark' ? ThemeMode.dark : ThemeMode.light;
  }

  static Future<void> setDark(bool dark) async {
    mode.value = dark ? ThemeMode.dark : ThemeMode.light;
    await SecureStorageService.saveThemeMode(dark ? 'dark' : 'light');
  }
}
