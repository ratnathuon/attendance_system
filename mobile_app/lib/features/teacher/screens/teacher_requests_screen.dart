import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/glass.dart';
import '../../student/widgets/attendance_badge.dart';

class TeacherRequestsScreen extends StatefulWidget {
  final bool isTab;
  const TeacherRequestsScreen({super.key, this.isTab = false});

  @override
  State<TeacherRequestsScreen> createState() => _TeacherRequestsScreenState();
}

class _TeacherRequestsScreenState extends State<TeacherRequestsScreen> {
  bool _isLoading = true;
  List<dynamic> _requests = [];

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    setState(() => _isLoading = true);
    try {
      final response = await DioClient.instance.get(ApiEndpoints.teacherLeaveRequests);
      if (response.data['success'] == true) {
        setState(() {
          _requests = response.data['data']['data'] as List<dynamic>;
        });
      }
    } catch (_) {
      // preview
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _processRequest(int id, String action) async {
    try {
      await DioClient.instance.post(
        ApiEndpoints.teacherLeaveStatus(id),
        data: {
          'action': action,
          'notes': 'Reviewed by faculty teacher.',
        },
      );
      _fetchRequests();
      if (mounted) {
        final verb = action == 'approve' ? 'allowed' : 'rejected';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Request $verb successfully.'),
            backgroundColor: action == 'approve' ? AppTheme.success : AppTheme.error,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update leave request.')),
        );
      }
    }
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return raw;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Subject Leave Approvals'),
        automaticallyImplyLeading: !widget.isTab,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _requests.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.mark_email_read_outlined, size: 48, color: Color(0xFF94A3B8)),
                      SizedBox(height: 12),
                      Text(
                        'No leave requests requiring your review.',
                        style: TextStyle(color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _fetchRequests,
                  color: AppTheme.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _requests.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final item = _requests[idx];
                      final student = item['student'] ?? {};
                      final classRoom = item['class_room'] ?? {};
                      final subject = item['subject'] ?? {};
                      final status = item['status'] ?? 'pending_teacher';
                      final id = item['id'] as int;
                      final isPending = status.toString().contains('pending') ||
                          item['teacher_approval'] == 'pending' ||
                          (status != 'approved' && status != 'rejected');

                      final startStr = _formatDate(item['start_date']);
                      final endStr = _formatDate(item['end_date']);
                      final dateRange = startStr == endStr || endStr.isEmpty
                          ? startStr
                          : '$startStr – $endStr';

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: glassDecoration(context, radius: 18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        student['name'] ?? 'Student',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 15,
                                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        '${classRoom['code'] ?? ''} • ${subject['name'] ?? ''}',
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                AttendanceBadge(status: status),
                              ],
                            ),
                            if ((item['reason'] as String?)?.isNotEmpty ?? false) ...[
                              const SizedBox(height: 10),
                              Text(
                                item['reason'],
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.35,
                                  color: isDark ? Colors.white70 : const Color(0xFF334155),
                                ),
                              ),
                            ],
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Icon(Icons.date_range_rounded, size: 14, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 4),
                                Text(
                                  'Requested: $dateRange',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                ),
                                if (item['leave_type'] != null) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '${item['leave_type']}'.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (isPending) ...[
                              const SizedBox(height: 14),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton.icon(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppTheme.error,
                                      side: const BorderSide(color: AppTheme.error),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                    onPressed: () => _processRequest(id, 'reject'),
                                    icon: const Icon(Icons.close_rounded, size: 16),
                                    label: const Text('Reject'),
                                  ),
                                  const SizedBox(width: 10),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.success,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    ),
                                    onPressed: () => _processRequest(id, 'approve'),
                                    icon: const Icon(Icons.check_rounded, size: 16),
                                    label: const Text('Allow'),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
