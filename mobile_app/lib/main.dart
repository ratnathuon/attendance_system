import 'package:flutter/material.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'core/theme/glass.dart';
import 'features/auth/models/user_model.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/student/screens/student_home_screen.dart';
import 'features/teacher/screens/teacher_home_screen.dart';
import 'features/mazer/screens/mazer_home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ThemeController.load();
  runApp(const AttendanceApp());
}

class AttendanceApp extends StatelessWidget {
  const AttendanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.mode,
      builder: (context, mode, _) => MaterialApp(
        title: 'RUPP Attendance',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: mode,
        builder: (context, child) =>
            GlassBackground(child: child ?? const SizedBox.shrink()),
        home: const SplashScreen(),
        routes: {
          '/login': (context) => const LoginScreen(),
        },
      ),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(milliseconds: 600)); // Smooth splash

    final token = await SecureStorageService.getToken();
    final userMap = await SecureStorageService.getUser();

    if (!mounted) return;

    if (token != null && userMap != null) {
      final user = UserModel.fromJson(userMap);
      Widget home;

      if (user.isStudent) {
        home = StudentHomeScreen(user: user);
      } else if (user.isTeacher) {
        home = TeacherHomeScreen(user: user);
      } else if (user.isMazer) {
        home = MazerHomeScreen(user: user);
      } else {
        home = const LoginScreen();
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => home),
      );
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(color: AppTheme.primary),
      ),
    );
  }
}
