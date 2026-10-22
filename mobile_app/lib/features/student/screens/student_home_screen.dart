import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/user_model.dart';
import '../../profile/screens/profile_screen.dart';
import 'qr_scanner_screen.dart';
import 'student_history_screen.dart';
import 'leave_request_screen.dart';
import '../../mazer/screens/announcement_screen.dart';
import '../widgets/attendance_badge.dart';
import '../../../core/theme/glass.dart';

class StudentHomeScreen extends StatefulWidget {
  final UserModel user;

  const StudentHomeScreen({super.key, required this.user});

  @override
  State<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends State<StudentHomeScreen> {
  int _currentIndex = 0;
  late UserModel _user = widget.user;
  double _attendanceRate = 100.0;
  int _presentCount = 0;
  int _lateCount = 0;
  int _absentCount = 0;
  List<dynamic> _activeSessions = [];
  List<dynamic> _perSubject = [];
  List<dynamic> _recent = [];
  int _leavePending = 0;
  int _leaveApproved = 0;
  int _leaveRejected = 0;
  int _announcementsCount = 0;

  Color get _standingColor => _attendanceRate >= 85
      ? AppTheme.success
      : (_attendanceRate >= 75 ? AppTheme.warning : AppTheme.error);

  String get _standingLabel => _attendanceRate >= 85
      ? 'Good Standing'
      : (_attendanceRate >= 75 ? 'Warning' : 'At Risk');

  Timer? _dashboardTimer;

  @override
  void initState() {
    super.initState();
    _fetchDashboard();
    // Live polling every 8s so student dashboard and announcement badges update in real-time
    _dashboardTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted && _currentIndex == 0) {
        _fetchDashboard();
      }
    });
  }

  @override
  void dispose() {
    _dashboardTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchDashboard() async {
    try {
      final response = await DioClient.instance.get(ApiEndpoints.studentStats);
      if (response.data['success'] == true) {
        final stats = response.data['stats'] ?? {};
        setState(() {
          _attendanceRate = (stats['attendance_rate'] as num?)?.toDouble() ?? 100.0;
          _presentCount = stats['present'] ?? 0;
          _lateCount = stats['late'] ?? 0;
          _absentCount = stats['absent'] ?? 0;
          _activeSessions = response.data['active_sessions_today'] as List<dynamic>? ?? [];
          _perSubject = response.data['per_subject'] as List<dynamic>? ?? [];
          _recent = response.data['recent_activity'] as List<dynamic>? ?? [];
          final lc = response.data['leave_counts'] as Map? ?? {};
          _leavePending = (lc['pending'] as num?)?.toInt() ?? 0;
          _leaveApproved = (lc['approved'] as num?)?.toInt() ?? 0;
          _leaveRejected = (lc['rejected'] as num?)?.toInt() ?? 0;
          _announcementsCount = (response.data['announcements_count'] as num?)?.toInt() ?? 0;
        });
      }
    } catch (_) {
      // preview
    }
  }

  void _handleLogout() async {
    await SecureStorageService.clearAll();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _currentIndex == 0
          ? AppBar(
              titleSpacing: 12,
              title: ProfileHeader(
                user: _user,
                subtitle: _user.identifierNumber ?? 'Student Portal',
                onUserUpdated: (u) => setState(() => _user = u),
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout_rounded, color: AppTheme.error),
                  tooltip: 'Sign Out',
                  onPressed: _handleLogout,
                ),
              ],
            )
          : null,
      body: _buildCurrentTab(),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton.extended(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              elevation: 4,
              icon: const Icon(Icons.qr_code_scanner_rounded),
              label: const Text(
                'Scan QR',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              onPressed: () {
                setState(() => _currentIndex = 1);
              },
            )
          : null,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            setState(() => _currentIndex = index);
            if (index == 0) _fetchDashboard();
          },
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard_rounded),
              label: 'Dashboard',
            ),
            const NavigationDestination(
              icon: Icon(Icons.qr_code_scanner_outlined),
              selectedIcon: Icon(Icons.qr_code_scanner_rounded),
              label: 'Scan QR',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: _announcementsCount > 0,
                label: Text('$_announcementsCount'),
                child: const Icon(Icons.campaign_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: _announcementsCount > 0,
                label: Text('$_announcementsCount'),
                child: const Icon(Icons.campaign_rounded),
              ),
              label: 'Notices',
            ),
            const NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history_rounded),
              label: 'History',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: _leavePending > 0,
                label: Text('$_leavePending'),
                child: const Icon(Icons.note_alt_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: _leavePending > 0,
                label: Text('$_leavePending'),
                child: const Icon(Icons.note_alt_rounded),
              ),
              label: 'Leave',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentIndex) {
      case 0:
        return _buildDashboardContent();
      case 1:
        return QrScannerScreen(
          key: ValueKey('student_scanner_$_currentIndex'),
          isTab: true,
          onScanComplete: () {
            setState(() => _currentIndex = 0);
            _fetchDashboard();
          },
        );
      case 2:
        return const AnnouncementScreen(
          key: ValueKey('student_announcements_live_tab'),
          isStudent: true,
          isReadOnly: true,
          isTab: true,
        );
      case 3:
        return const StudentHistoryScreen(isTab: true);
      case 4:
        return const LeaveRequestScreen(isTab: true);
      default:
        return _buildDashboardContent();
    }
  }

  Widget _buildDashboardContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return RefreshIndicator(
      onRefresh: _fetchDashboard,
      color: AppTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Attendance Performance Card (Glass Decoration)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: glassDecoration(context, radius: 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Overall Attendance',
                        style: TextStyle(
                          color: isDark ? Colors.white70 : const Color(0xFF64748B),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: _standingColor.withValues(alpha: isDark ? 0.2 : 0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _standingColor.withValues(alpha: isDark ? 0.4 : 0.25),
                          ),
                        ),
                        child: Text(
                          _standingLabel,
                          style: TextStyle(
                            color: _standingColor,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        '${_attendanceRate.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w900,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                          letterSpacing: -1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _statChip('Present', '$_presentCount', AppTheme.success),
                      _statChip('Late', '$_lateCount', AppTheme.warning),
                      _statChip('Absent', '$_absentCount', AppTheme.error),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () {
                            setState(() => _currentIndex = 1);
                          },
                          icon: const Icon(
                            Icons.qr_code_scanner_rounded,
                            size: 20,
                          ),
                          label: const Text(
                            'Scan QR',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: isDark ? Colors.white : const Color(0xFF0F172A),
                          side: BorderSide(
                            color: isDark
                                ? Colors.white.withValues(alpha: 0.3)
                                : const Color(0xFFCBD5E1),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 12,
                          ),
                        ),
                        onPressed: () {
                          setState(() => _currentIndex = 4);
                        },
                        icon: const Icon(Icons.note_alt_rounded, size: 18),
                        label: const Text(
                          'Leaves',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Class Announcements Quick Access Banner
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: () {
                setState(() => _currentIndex = 2);
              },
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                        : [const Color(0xFFEEF2FF), const Color(0xFFF8FAFC)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFC7D2FE),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primary.withValues(alpha: 0.3),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.campaign_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Class Announcements',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              if (_announcementsCount > 0) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '$_announcementsCount',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            _announcementsCount > 0
                                ? '$_announcementsCount update${_announcementsCount > 1 ? 's' : ''} from teachers & advisor'
                                : 'Tap to read notices from teachers & advisor',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.arrow_forward_ios_rounded,
                      size: 14,
                      color: isDark ? Colors.white54 : const Color(0xFF6366F1),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

              // Active Lectures Today
              Text(
                'Active Sessions Today',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),

              _activeSessions.isEmpty
                  ? Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: glassDecoration(context),
                      child: Column(
                        children: [
                          const Icon(Icons.event_available_rounded,
                              size: 44, color: Color(0xFF475569)),
                          const SizedBox(height: 10),
                          const Text(
                            'No active lectures taking attendance right now.',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _activeSessions.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (ctx, idx) {
                        final s = _activeSessions[idx];
                        final classSubject = s['class_subject'] ?? {};
                        final subject = classSubject['subject'] ?? {};
                        final teacher = s['teacher'] ?? {};

                         return Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(18),
                          child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => setState(() => _currentIndex = 1),
                          child: Ink(
                          padding: const EdgeInsets.all(16),
                          decoration: glassDecoration(context, borderColor: AppTheme.primary),
                          child: Row(
                            children: [
                              Container(
                                width: 10,
                                height: 10,
                                decoration: const BoxDecoration(
                                  color: AppTheme.success,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      subject['name'] ?? 'Class Lecture',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${teacher['name'] ?? 'Faculty'} • Room ${s['room'] ?? 'TBD'}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF94A3B8),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const AttendanceBadge(status: 'active'),
                            ],
                          ),
                          ),
                          ),
                        );
                      },
                    ),

              const SizedBox(height: 28),
              _sectionHeader('Attendance by Subject', isDark),
              if (_perSubject.isEmpty)
                _emptyHint('No attendance records yet.')
              else
                ..._perSubject.map((s) => _subjectRow(s as Map, isDark)),

              const SizedBox(height: 24),
              _sectionHeader('Recent Activity', isDark),
              if (_recent.isEmpty)
                _emptyHint('No check-ins yet.')
              else
                ..._recent.map((r) => _recentRow(r as Map, isDark)),

              const SizedBox(height: 24),
              _sectionHeader('Leave Requests', isDark),
              InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () => setState(() => _currentIndex = 4),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: glassDecoration(context),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _leaveStat('Pending', _leavePending, AppTheme.warning),
                      _leaveStat('Approved', _leaveApproved, AppTheme.success),
                      _leaveStat('Rejected', _leaveRejected, AppTheme.error),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      );
  }

  Widget _sectionHeader(String t, bool isDark) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(t,
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? Colors.white : const Color(0xFF0F172A))),
      );

  Widget _emptyHint(String t) => Builder(
        builder: (context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: glassDecoration(context),
        child: Text(t,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
      ));

  Color _rateColor(double r) =>
      r >= 85 ? AppTheme.success : (r >= 75 ? AppTheme.warning : AppTheme.error);

  Widget _subjectRow(Map s, bool isDark) {
    final rate = (s['rate'] as num?)?.toDouble() ?? 0;
    final color = _rateColor(rate);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: glassDecoration(context, radius: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text('${s['subject']}',
                    style: TextStyle(
                        fontWeight: FontWeight.w600, color: isDark ? Colors.white : const Color(0xFF0F172A))),
              ),
              Text('${rate.toStringAsFixed(0)}%',
                  style: TextStyle(fontWeight: FontWeight.bold, color: color)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: (rate / 100).clamp(0.0, 1.0),
              minHeight: 7,
              backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerLeft,
            child: Text('${s['attended']}/${s['total']} sessions attended',
                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ),
        ],
      ),
    );
  }

  Widget _recentRow(Map r, bool isDark) {
    String when = '';
    final dt = DateTime.tryParse('${r['time'] ?? ''}')?.toLocal();
    if (dt != null) {
      String two(int n) => n.toString().padLeft(2, '0');
      when = '${two(dt.day)}/${two(dt.month)} ${two(dt.hour)}:${two(dt.minute)}';
    }
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: glassDecoration(context, radius: 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${r['subject']}',
                    style: TextStyle(
                        fontWeight: FontWeight.w600, color: isDark ? Colors.white : const Color(0xFF0F172A))),
                const SizedBox(height: 2),
                Text(when,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
          AttendanceBadge(status: '${r['status']}'),
        ],
      ),
    );
  }

  Widget _leaveStat(String label, int n, Color c) => Column(
        children: [
          Text('$n',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: c)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
        ],
      );

  Widget _statChip(String label, String value, Color color) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF0F172A).withValues(alpha: 0.6)
            : Colors.white.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
