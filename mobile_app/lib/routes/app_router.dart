import 'package:flutter/material.dart';
import '../features/auth/models/user_model.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/student/screens/student_home_screen.dart';
import '../features/teacher/screens/teacher_home_screen.dart';
import '../features/mazer/screens/mazer_home_screen.dart';

class AppRouter {
  static void navigateByRole(BuildContext context, UserModel user) {
    Widget destination;

    if (user.isStudent) {
      destination = StudentHomeScreen(user: user);
    } else if (user.isTeacher) {
      destination = TeacherHomeScreen(user: user);
    } else if (user.isMazer) {
      destination = MazerHomeScreen(user: user);
    } else if (user.isAdmin) {
      destination = Scaffold(
        appBar: AppBar(title: const Text('Administrator Notice')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.computer_rounded, size: 64, color: Colors.indigoAccent),
                const SizedBox(height: 16),
                const Text(
                  'Web Dashboard Recommended',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'As an Administrator, please use the Next.js Admin Web Dashboard (http://localhost:3000) for full institution-level controls and reporting.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pushReplacementNamed('/login'),
                  child: const Text('Back to Login'),
                ),
              ],
            ),
          ),
        ),
      );
    } else {
      destination = const LoginScreen();
    }

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => destination),
    );
  }
}
