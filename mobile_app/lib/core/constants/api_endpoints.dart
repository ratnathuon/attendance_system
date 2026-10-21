import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class ApiEndpoints {
  // Configurable base URL
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:8000/api';
    }
    try {
      if (Platform.isAndroid) {
        // Works on physical devices and emulators when run: adb reverse tcp:8000 tcp:8000
        return 'http://localhost:8000/api';
      } else if (Platform.isIOS || Platform.isMacOS || Platform.isWindows || Platform.isLinux) {
        return 'http://localhost:8000/api';
      }
    } catch (_) {
      // Fallback
    }
    return 'http://10.0.2.2:8000/api';
  }

  // Auth endpoints
  static const String login = '/auth/login';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String updateProfile = '/auth/profile';
  static const String updateAvatar = '/auth/avatar';
  static const String changePassword = '/auth/change-password';

  // Student endpoints
  static const String studentScan = '/student/scan';
  static const String studentHistory = '/student/history';
  static const String studentStats = '/student/stats';
  static const String studentLeaveRequests = '/student/leave-requests';
  static const String studentAnnouncements = '/student/announcements';
  static String studentClassAnnouncements(int classRoomId) => '/student/classes/$classRoomId/announcements';

  // Teacher endpoints
  static const String teacherSessions = '/teacher/sessions';
  static String teacherSessionQr(int sessionId) => '/teacher/sessions/$sessionId/qr';
  static String teacherSessionRecords(int sessionId) => '/teacher/sessions/$sessionId/records';
  static String teacherSessionClose(int sessionId) => '/teacher/sessions/$sessionId/close';
  static String teacherSessionAttendance(int sessionId) => '/teacher/sessions/$sessionId/attendance';
  static String teacherSessionBatchAttendance(int sessionId) => '/teacher/sessions/$sessionId/batch-attendance';
  static const String teacherLeaveRequests = '/teacher/leave-requests';
  static String teacherLeaveStatus(int leaveRequestId) => '/teacher/leave-requests/$leaveRequestId/status';
  static String teacherSubjectReport(int classSubjectId) => '/teacher/subjects/$classSubjectId/report';
  static String teacherClassAnnouncements(int classRoomId) => '/teacher/classes/$classRoomId/announcements';

  // Mazer endpoints
  static const String mazerScan = '/mazer/scan';
  static String mazerClassRoster(int classRoomId) => '/mazer/classes/$classRoomId/roster';
  static String mazerClassOverride(int classRoomId) => '/mazer/classes/$classRoomId/override';
  static const String mazerLeaveRequests = '/mazer/leave-requests';
  static String mazerLeaveStatus(int leaveRequestId) => '/mazer/leave-requests/$leaveRequestId/status';
  static String mazerClassAnnouncements(int classRoomId) => '/mazer/classes/$classRoomId/announcements';
}
