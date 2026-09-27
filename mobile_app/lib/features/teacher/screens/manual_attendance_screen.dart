import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../student/widgets/attendance_badge.dart';

class ManualAttendanceScreen extends StatefulWidget {
  final int sessionId;
  final String sessionTitle;

  const ManualAttendanceScreen({
    super.key,
    required this.sessionId,
    required this.sessionTitle,
  });

  @override
  State<ManualAttendanceScreen> createState() => _ManualAttendanceScreenState();
}

class _ManualAttendanceScreenState extends State<ManualAttendanceScreen> {
  bool _isLoading = true;
  List<dynamic> _roster = [];

  @override
  void initState() {
    super.initState();
    _fetchRoster();
  }

  Future<void> _fetchRoster() async {
    setState(() => _isLoading = true);
    try {
      final response = await DioClient.instance.get(
        ApiEndpoints.teacherSessionRecords(widget.sessionId),
      );

      if (response.data['success'] == true) {
        setState(() {
          _roster = response.data['roster'] as List<dynamic>;
        });
      }
    } catch (_) {
      // preview fallback
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateStudentStatus(int studentId, String status) async {
    try {
      await DioClient.instance.post(
        ApiEndpoints.teacherSessionAttendance(widget.sessionId),
        data: {
          'student_id': studentId,
          'status': status,
          'remarks': 'Manual status override by teacher',
        },
      );
      _fetchRoster();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update attendance status.')),
        );
      }
    }
  }

  void _showStatusDialog(dynamic item) {
    final student = item['student'] ?? {};
    final studentId = student['id'] as int;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Mark Status: ${student['name']}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                student['identifier_number'] ?? student['email'] ?? '',
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 18),
              _statusOption('present', 'Mark Present (On-time)', AppTheme.success, ctx, studentId),
              _statusOption('late', 'Mark Late', AppTheme.warning, ctx, studentId),
              _statusOption('absent', 'Mark Absent', AppTheme.error, ctx, studentId),
              _statusOption('excused', 'Mark Excused / Permitted', AppTheme.info, ctx, studentId),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusOption(
    String status,
    String label,
    Color color,
    BuildContext dialogCtx,
    int studentId,
  ) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 12,
        height: 12,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      title: Text(
        label,
        style: TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF64748B)),
      onTap: () {
        Navigator.of(dialogCtx).pop();
        _updateStudentStatus(studentId, status);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Roster & Manual Override'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _roster.isEmpty
              ? const Center(
                  child: Text('No enrolled students in this lecture.'),
                )
              : RefreshIndicator(
                  onRefresh: _fetchRoster,
                  color: AppTheme.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _roster.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = _roster[index];
                      final student = item['student'] ?? {};
                      final status = item['status'] ?? 'unmarked';

                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  (student['name'] as String? ?? 'S').substring(0, 1),
                                  style: const TextStyle(
                                    color: AppTheme.primaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    student['name'] ?? 'Student',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: Colors.white,
                                    ),
                                  ),
                                  Text(
                                    student['identifier_number'] ?? student['email'] ?? '',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () => _showStatusDialog(item),
                              child: Row(
                                children: [
                                  AttendanceBadge(status: status),
                                  const SizedBox(width: 6),
                                  const Icon(Icons.more_vert, size: 18, color: Color(0xFF64748B)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
