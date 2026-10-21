import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/user_model.dart';
import '../../profile/screens/profile_screen.dart';
import 'create_session_screen.dart';
import 'dynamic_qr_screen.dart';
import 'manual_attendance_screen.dart';
import 'teacher_requests_screen.dart';
import '../../mazer/screens/announcement_screen.dart';
import '../services/teacher_pdf_export.dart';
import '../../../core/theme/glass.dart';

class TeacherHomeScreen extends StatefulWidget {
  final UserModel user;

  const TeacherHomeScreen({super.key, required this.user});

  @override
  State<TeacherHomeScreen> createState() => _TeacherHomeScreenState();
}

class _TeacherHomeScreenState extends State<TeacherHomeScreen> {
  int _currentIndex = 0;
  late UserModel _user = widget.user;
  bool _isLoading = true;
  List<dynamic> _sessions = [];
  List<dynamic> _taughtSubjects = [];
  int _totalRequests = 0;
  int _pendingRequests = 0;
  int _totalAnnouncements = 0;

  List<Map<String, dynamic>> get _teacherClasses {
    final Map<int, Map<String, dynamic>> map = {};
    for (final item in _taughtSubjects) {
      final cr = item['class_room'];
      if (cr != null && cr['id'] != null) {
        final id = (cr['id'] as num).toInt();
        if (!map.containsKey(id)) {
          map[id] = {
            'id': id,
            'name': cr['name'] ?? 'Class $id',
            'code': cr['code'] ?? '',
          };
        }
      }
    }
    return map.values.toList();
  }

  @override
  void initState() {
    super.initState();
    _fetchTeacherData();
  }

  Future<void> _fetchTeacherData() async {
    setState(() => _isLoading = true);
    try {
      final meRes = await DioClient.instance.get(ApiEndpoints.me);
      if (meRes.data['success'] == true) {
        _taughtSubjects = meRes.data['meta']?['taught_subjects'] as List<dynamic>? ?? [];
        _totalAnnouncements = (meRes.data['meta']?['announcements_count'] as num?)?.toInt() ?? 0;
      }

      final sessRes = await DioClient.instance.get(ApiEndpoints.teacherSessions);
      if (sessRes.data['success'] == true) {
        _sessions = sessRes.data['data']['data'] as List<dynamic>? ?? [];
      }

      try {
        final reqRes = await DioClient.instance.get(ApiEndpoints.teacherLeaveRequests);
        if (reqRes.data['success'] == true) {
          final list = reqRes.data['data']['data'] as List<dynamic>? ?? [];
          _totalRequests = (reqRes.data['data']['total'] as num?)?.toInt() ?? list.length;
          _pendingRequests = list.where((r) => '${r['status']}'.startsWith('pending')).length;
        }
      } catch (_) {}
    } catch (_) {
      // preview fallback
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
                subtitle: 'Faculty Professor • Dashboard',
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
            if (index == 0) _fetchTeacherData();
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.co_present_outlined),
              selectedIcon: Icon(Icons.co_present_rounded),
              label: 'Sessions',
            ),
            NavigationDestination(
              icon: Icon(Icons.add_circle_outline_rounded),
              selectedIcon: Icon(Icons.add_circle_rounded),
              label: 'New Session',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_turned_in_outlined),
              selectedIcon: Icon(Icons.assignment_turned_in_rounded),
              label: 'Requests',
            ),
            NavigationDestination(
              icon: Icon(Icons.campaign_outlined),
              selectedIcon: Icon(Icons.campaign_rounded),
              label: 'Announce',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_currentIndex) {
      case 0:
        return _buildSessionsContent();
      case 1:
        return CreateSessionScreen(
          isTab: true,
          taughtSubjects: _taughtSubjects,
        );
      case 2:
        return const TeacherRequestsScreen(isTab: true);
      case 3:
        return _TeacherAnnouncementsTab(classes: _teacherClasses);
      default:
        return _buildSessionsContent();
    }
  }

  Widget _buildSessionsContent() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeSession = _sessions.cast<dynamic>().firstWhere(
      (s) => s['status'] == 'active',
      orElse: () => null,
    );
    final activeCount = _sessions.where((s) => s['status'] == 'active').length;

    return RefreshIndicator(
      onRefresh: _fetchTeacherData,
      color: AppTheme.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Live Session Banner (if any)
            if (activeSession != null) ...[
              Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(18),
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => DynamicQrScreen(
                          sessionId: activeSession['id'] as int,
                          sessionTitle: activeSession['title'] ?? 'Active Session',
                        ),
                      ),
                    ).then((_) => _fetchTeacherData());
                  },
                  child: Ink(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF065F46), Color(0xFF047857)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.success.withValues(alpha: 0.25),
                          blurRadius: 14,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.sensors_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'SESSION ACTIVE NOW',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                activeSession['title'] ?? 'Active Lecture',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.qr_code_2_rounded, size: 16, color: Color(0xFF065F46)),
                              SizedBox(width: 4),
                              Text(
                                'View QR',
                                style: TextStyle(
                                  color: Color(0xFF065F46),
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Simple Summary Counts Row
            Row(
              children: [
                _countCard(
                  icon: Icons.assignment_turned_in_rounded,
                  title: 'Leave Requests',
                  value: '$_totalRequests',
                  subtitle: _pendingRequests > 0
                      ? '$_pendingRequests Pending action'
                      : 'All reviewed',
                  accentColor: _pendingRequests > 0 ? AppTheme.warning : AppTheme.info,
                  onTap: () => setState(() => _currentIndex = 2),
                ),
                const SizedBox(width: 12),
                _countCard(
                  icon: Icons.co_present_rounded,
                  title: 'Recent Sessions',
                  value: '${_sessions.length}',
                  subtitle: activeCount > 0 ? '$activeCount Active now' : '${_sessions.length} Recorded',
                  accentColor: activeCount > 0 ? AppTheme.success : AppTheme.primary,
                  onTap: () {},
                ),
              ],
            ),

            const SizedBox(height: 12),
            // Quick action card for Teacher Announcements
            Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => setState(() => _currentIndex = 3),
                child: Ink(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF0EA5E9).withValues(alpha: 0.25),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.campaign_rounded,
                          color: Color(0xFF0EA5E9),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Broadcast Class Announcement',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              _totalAnnouncements > 0
                                  ? '$_totalAnnouncements broadcasted • Tap to broadcast or view'
                                  : 'Send messages & notices to students in your classes',
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

            const SizedBox(height: 24),

            // My Assigned Courses & PDF Export
            if (_taughtSubjects.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'My Courses • PDF Reports',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  Text(
                    '${_taughtSubjects.length} Courses',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 110,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _taughtSubjects.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (ctx, idx) {
                    final item = _taughtSubjects[idx] as Map<String, dynamic>;
                    final subject = (item['subject'] ?? {}) as Map<String, dynamic>;
                    final classRoom = (item['class_room'] ?? {}) as Map<String, dynamic>;
                    final classSubjectId = (item['id'] as num?)?.toInt() ?? 0;
                    final subName = '${subject['name'] ?? 'Subject'}';
                    final clsName = '${classRoom['name'] ?? 'Class'}';

                    return Container(
                      width: 260,
                      padding: const EdgeInsets.all(12),
                      decoration: glassDecoration(context, radius: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '${subject['code'] ?? 'SUBJ'}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.primary,
                                  ),
                                ),
                              ),
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    TeacherSubjectPdfExport.showExportDialog(
                                      context,
                                      classSubjectId,
                                      subjectName: subName,
                                      className: clsName,
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: Ink(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE11D48).withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFE11D48).withValues(alpha: 0.3)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.picture_as_pdf_rounded, size: 13, color: Color(0xFFE11D48)),
                                        SizedBox(width: 4),
                                        Text(
                                          'Export PDF',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFFE11D48),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                subName,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                clsName,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Header with "+ New Session" Quick Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Attendance Sessions',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  ),
                  onPressed: () => setState(() => _currentIndex = 1),
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
                  label: const Text('New Session', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 10),

            _isLoading
                ? const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                  )
                : _sessions.isEmpty
                    ? Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(28),
                        decoration: glassDecoration(context),
                        child: Column(
                          children: [
                            const Icon(Icons.event_note_rounded, size: 40, color: Color(0xFF94A3B8)),
                            const SizedBox(height: 10),
                            const Text(
                              'No attendance sessions yet.\nTap "+ New Session" above to launch one!',
                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _sessions.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final s = _sessions[idx];
                          final classSubject = s['class_subject'] ?? {};
                          final subject = classSubject['subject'] ?? {};
                          final classRoom = classSubject['class_room'] ?? {};
                          final isClosed = s['status'] == 'closed';
                          final sessionId = s['id'] as int;
                          final sessionTitle = subject['name'] ?? s['title'] ?? 'Session';

                          return Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () {
                                if (!isClosed) {
                                  // Active session -> View QR
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => DynamicQrScreen(
                                        sessionId: sessionId,
                                        sessionTitle: sessionTitle,
                                      ),
                                    ),
                                  ).then((_) => _fetchTeacherData());
                                } else {
                                  // Closed session -> Roster & Manual Override
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ManualAttendanceScreen(
                                        sessionId: sessionId,
                                        sessionTitle: sessionTitle,
                                      ),
                                    ),
                                  ).then((_) => _fetchTeacherData());
                                }
                              },
                              child: Ink(
                                padding: const EdgeInsets.all(16),
                                decoration: glassDecoration(
                                  context,
                                  radius: 16,
                                  borderColor: !isClosed ? AppTheme.success.withValues(alpha: 0.6) : null,
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 10,
                                      height: 10,
                                      decoration: BoxDecoration(
                                        color: isClosed ? AppTheme.error : AppTheme.success,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            sessionTitle,
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 14,
                                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            '${classRoom['name'] ?? ''} • ${s['session_date'] ?? ''}',
                                            style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Icon(
                                                !isClosed ? Icons.qr_code_2_rounded : Icons.people_outline_rounded,
                                                size: 13,
                                                color: !isClosed ? AppTheme.success : const Color(0xFF94A3B8),
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                !isClosed
                                                    ? 'Tap to view live QR'
                                                    : 'Tap for roster & manual override',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: !isClosed ? FontWeight.w600 : FontWeight.normal,
                                                  color: !isClosed ? AppTheme.success : const Color(0xFF94A3B8),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: (isClosed ? AppTheme.error : AppTheme.success).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: (isClosed ? AppTheme.error : AppTheme.success).withValues(alpha: 0.4),
                                        ),
                                      ),
                                      child: Text(
                                        (s['status'] as String? ?? 'ACTIVE').toUpperCase(),
                                        style: TextStyle(
                                          color: isClosed ? AppTheme.error : AppTheme.success,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ],
        ),
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

class _TeacherAnnouncementsTab extends StatefulWidget {
  final List<Map<String, dynamic>> classes;
  const _TeacherAnnouncementsTab({required this.classes});

  @override
  State<_TeacherAnnouncementsTab> createState() => _TeacherAnnouncementsTabState();
}

class _TeacherAnnouncementsTabState extends State<_TeacherAnnouncementsTab> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.classes.isEmpty) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Class Announcements'),
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
                  'No assigned courses/classes found to broadcast announcements.',
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
    final className = currentClass['name'] ?? 'Class';

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Class Announcements'),
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
                          Icons.school_rounded,
                          color: AppTheme.primary,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Class:',
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
                                  c['name'] ?? 'Class $idx',
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
        isTeacher: true,
        hideAppBar: true,
        classRoomId: classId,
        className: className,
      ),
    );
  }
}
