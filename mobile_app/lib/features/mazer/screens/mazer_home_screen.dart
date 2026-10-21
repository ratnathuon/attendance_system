import 'package:flutter/material.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/glass.dart';
import '../../auth/models/user_model.dart';
import '../../profile/screens/profile_screen.dart';
import '../../student/screens/qr_scanner_screen.dart';
import '../../student/screens/leave_request_screen.dart';
import '../../student/widgets/attendance_badge.dart';
import 'class_roster_screen.dart';
import 'mazer_approvals_screen.dart';
import 'announcement_screen.dart';

class MazerHomeScreen extends StatefulWidget {
  final UserModel user;

  const MazerHomeScreen({super.key, required this.user});

  @override
  State<MazerHomeScreen> createState() => _MazerHomeScreenState();
}

class _MazerHomeScreenState extends State<MazerHomeScreen> {
  int _currentIndex = 0;
  late UserModel _user = widget.user;
  bool _isLoading = true;
  List<dynamic> _advisedClasses = [];
  double _attendanceRate = 100.0;
  int _presentCount = 0;
  int _lateCount = 0;
  int _absentCount = 0;
  List<dynamic> _activeSessions = [];
  int _totalAnnouncements = 0;
  int _totalLeaveRequests = 0;
  int _pendingLeaveRequests = 0;
  int _myLeaveRequestsCount = 0;

  Color get _standingColor => _attendanceRate >= 85
      ? AppTheme.success
      : (_attendanceRate >= 75 ? AppTheme.warning : AppTheme.error);

  String get _standingLabel => _attendanceRate >= 85
      ? 'Good Standing'
      : (_attendanceRate >= 75 ? 'Warning' : 'At Risk');

  @override
  void initState() {
    super.initState();
    _fetchMazerData();
  }

  Future<void> _fetchMazerData() async {
    setState(() => _isLoading = true);
    try {
      final res = await DioClient.instance.get(ApiEndpoints.me);
      if (res.data['success'] == true) {
        final meta = res.data['meta'] ?? {};
        setState(() {
          _advisedClasses =
              meta['advised_classes'] as List<dynamic>? ?? [];
          _totalAnnouncements =
              (meta['announcements_count'] as num?)?.toInt() ?? 0;
          _totalLeaveRequests =
              (meta['leave_requests_count'] as num?)?.toInt() ?? 0;
          _pendingLeaveRequests =
              (meta['pending_leave_count'] as num?)?.toInt() ?? 0;
          _myLeaveRequestsCount =
              (meta['my_leave_requests_count'] as num?)?.toInt() ?? 0;
        });
      }

      final statsRes = await DioClient.instance.get(ApiEndpoints.studentStats);
      if (statsRes.data['success'] == true) {
        final stats = statsRes.data['stats'] ?? {};
        setState(() {
          _attendanceRate =
              (stats['attendance_rate'] as num?)?.toDouble() ?? 100.0;
          _presentCount = stats['present'] ?? 0;
          _lateCount = stats['late'] ?? 0;
          _absentCount = stats['absent'] ?? 0;
          _activeSessions =
              statsRes.data['active_sessions_today'] as List<dynamic>? ?? [];
        });
      }

      // Query leave requests directly for latest count
      try {
        final lRes =
            await DioClient.instance.get(ApiEndpoints.mazerLeaveRequests);
        if (lRes.data['success'] == true) {
          final pagination = lRes.data['data'] ?? {};
          final total = (pagination['total'] as num?)?.toInt() ?? 0;
          final list = (pagination['data'] as List?) ?? [];
          final pending =
              list.where((item) => item['status'] == 'pending').length;
          setState(() {
            _totalLeaveRequests = total;
            _pendingLeaveRequests = pending;
          });
        }
      } catch (_) {}
    } catch (_) {
      // preview
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
                subtitle: 'Homeroom Advisor (Mazer) • Portal',
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
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1.2)),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            setState(() => _currentIndex = index);
            if (index == 0) _fetchMazerData();
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.school_outlined),
              selectedIcon: Icon(Icons.school_rounded),
              label: 'Cohorts',
            ),
            NavigationDestination(
              icon: Icon(Icons.qr_code_scanner_outlined),
              selectedIcon: Icon(Icons.qr_code_scanner_rounded),
              label: 'Scan QR',
            ),
            NavigationDestination(
              icon: Icon(Icons.checklist_rtl_rounded),
              selectedIcon: Icon(Icons.fact_check_rounded),
              label: 'Approvals',
            ),
            NavigationDestination(
              icon: Icon(Icons.campaign_outlined),
              selectedIcon: Icon(Icons.campaign_rounded),
              label: 'Announce',
            ),
            NavigationDestination(
              icon: Icon(Icons.note_alt_outlined),
              selectedIcon: Icon(Icons.note_alt_rounded),
              label: 'My Leave',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentIndex) {
      case 0:
        return _buildCohortsContent();
      case 1:
        return QrScannerScreen(
          isTab: true,
          onScanComplete: () {
            setState(() => _currentIndex = 0);
            _fetchMazerData();
          },
        );
      case 2:
        return const MazerApprovalsScreen(isTab: true);
      case 3:
        return _MazerAnnouncementsTab(classes: _advisedClasses);
      case 4:
        return LeaveRequestScreen(
          isTab: true,
          classes: _advisedClasses,
        );
      default:
        return _buildCohortsContent();
    }
  }

  Widget _buildCohortsContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return RefreshIndicator(
      onRefresh: _fetchMazerData,
      color: AppTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall Attendance Card (Frosted Glass Aesthetic)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: glassDecoration(context, radius: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 3,
                        ),
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
                  Text(
                    '${_attendanceRate.toStringAsFixed(1)}%',
                    style: TextStyle(
                      fontSize: 42,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      letterSpacing: -1,
                    ),
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
                          setState(() => _currentIndex = 2);
                        },
                        icon: const Icon(Icons.checklist_rounded, size: 18),
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

            const SizedBox(height: 16),

            // Summary Counts Row (Total Announce & Total Leave Requests)
            Row(
              children: [
                _countCard(
                  icon: Icons.campaign_rounded,
                  title: 'Announcements',
                  value: '$_totalAnnouncements',
                  subtitle: _totalAnnouncements > 0
                      ? '$_totalAnnouncements Broadcasts'
                      : 'No broadcasts',
                  accentColor: const Color(0xFF0EA5E9),
                  onTap: () => setState(() => _currentIndex = 3),
                ),
                const SizedBox(width: 12),
                _countCard(
                  icon: Icons.assignment_turned_in_rounded,
                  title: 'Leave Requests',
                  value: '$_totalLeaveRequests',
                  subtitle: _pendingLeaveRequests > 0
                      ? '$_pendingLeaveRequests Pending action'
                      : 'All reviewed',
                  accentColor: _pendingLeaveRequests > 0
                      ? AppTheme.warning
                      : AppTheme.success,
                  onTap: () => setState(() => _currentIndex = 2),
                ),
              ],
            ),

            const SizedBox(height: 12),
            // Quick action card for Mazer Leave
            Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => setState(() => _currentIndex = 4),
                child: Ink(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.note_alt_rounded,
                          color: AppTheme.primary,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Personal Leave Requests',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              _myLeaveRequestsCount > 0
                                  ? '$_myLeaveRequestsCount submitted • Tap to submit or view status'
                                  : 'Need time off? Submit personal leave here',
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: Color(0xFF94A3B8),
                        size: 14,
                      ),
                    ],
                  ),
                ),
              ),
            ),

            if (_activeSessions.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Active Sessions Today',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _activeSessions.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
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
                        decoration: glassDecoration(
                          context,
                          borderColor: AppTheme.primary,
                        ),
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
            ],

            const SizedBox(height: 28),

            // Advised Classrooms List
            Text(
              'My Assigned Cohorts / Classes',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 12),

            _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  )
                : _advisedClasses.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Center(
                      child: Text(
                        'No classes assigned to your Mazer profile yet.',
                        style: TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _advisedClasses.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 14),
                    itemBuilder: (ctx, idx) {
                      final cls = _advisedClasses[idx];
                      final classId = cls['id'] as int;
                      final className = cls['name'] ?? 'Classroom';
                      final classCode = cls['code'] ?? '';

                      return Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  className,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 3,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(
                                      alpha: 0.15,
                                    ),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    classCode,
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(
                                        color: Color(0xFFCBD5E1),
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 10,
                                      ),
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => ClassRosterScreen(
                                            classRoomId: classId,
                                            className: className,
                                          ),
                                        ),
                                      );
                                    },
                                    icon: const Icon(
                                      Icons.people_outline,
                                      size: 18,
                                    ),
                                    label: const Text(
                                      'Roster',
                                      style: TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.error,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 10,
                                      ),
                                    ),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => AnnouncementScreen(
                                            classRoomId: classId,
                                            className: className,
                                          ),
                                        ),
                                      );
                                    },
                                    icon: const Icon(
                                      Icons.campaign_outlined,
                                      size: 18,
                                    ),
                                    label: const Text(
                                      'Announce',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 10,
                                  ),
                                ),
                                onPressed: () {
                                  setState(() => _currentIndex = 1);
                                },
                                icon: const Icon(
                                  Icons.qr_code_scanner_rounded,
                                  size: 18,
                                ),
                                label: const Text(
                                  'Scan QR',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ],
        ),
      ),
    );
  }

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

  Widget _countCard({
    required IconData icon,
    required String title,
    required String value,
    required String subtitle,
    required Color accentColor,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.all(16),
            decoration: glassDecoration(context, radius: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: accentColor, size: 20),
                ),
                const SizedBox(height: 12),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white70 : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: accentColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MazerAnnouncementsTab extends StatefulWidget {
  final List<dynamic> classes;
  const _MazerAnnouncementsTab({required this.classes});

  @override
  State<_MazerAnnouncementsTab> createState() => _MazerAnnouncementsTabState();
}

class _MazerAnnouncementsTabState extends State<_MazerAnnouncementsTab> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.classes.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Cohort Announcements'),
          automaticallyImplyLeading: false,
        ),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.campaign_outlined,
                  size: 52,
                  color: Color(0xFF64748B),
                ),
                SizedBox(height: 14),
                Text(
                  'No assigned cohorts found to broadcast announcements.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_selectedIndex >= widget.classes.length) {
      _selectedIndex = 0;
    }

    final currentClass = widget.classes[_selectedIndex];
    final classId = currentClass['id'] as int;
    final className = currentClass['name'] ?? 'Cohort';

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cohort Announcements'),
        automaticallyImplyLeading: false,
        bottom: widget.classes.length > 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(62),
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.groups_rounded,
                          color: AppTheme.primary,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Cohort:',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF64748B),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<int>(
                            value: _selectedIndex,
                            isExpanded: true,
                            menuMaxHeight: 300,
                            borderRadius: BorderRadius.circular(16),
                            dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                            icon: const Icon(
                              Icons.keyboard_arrow_down_rounded,
                              color: AppTheme.primary,
                            ),
                            items: List.generate(widget.classes.length, (idx) {
                              final c = widget.classes[idx];
                              return DropdownMenuItem<int>(
                                value: idx,
                                child: Text(
                                  c['name'] ?? 'Cohort $idx',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 1,
                                ),
                              );
                            }),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedIndex = val);
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            : null,
      ),
      body: AnnouncementScreen(
        key: ValueKey(classId),
        isTab: true,
        hideAppBar: true,
        classRoomId: classId,
        className: className,
      ),
    );
  }
}
