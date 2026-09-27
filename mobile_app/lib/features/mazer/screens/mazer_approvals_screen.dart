import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../student/widgets/attendance_badge.dart';

class MazerApprovalsScreen extends StatefulWidget {
  const MazerApprovalsScreen({super.key});

  @override
  State<MazerApprovalsScreen> createState() => _MazerApprovalsScreenState();
}

class _MazerApprovalsScreenState extends State<MazerApprovalsScreen> {
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
      final response = await DioClient.instance.get(ApiEndpoints.mazerLeaveRequests);
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

  Future<void> _processApproval(int id, String action) async {
    try {
      await DioClient.instance.post(
        ApiEndpoints.mazerLeaveStatus(id),
        data: {
          'action': action,
          'notes': '1st level endorsement by Mazer homeroom advisor.',
        },
      );
      _fetchRequests();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              action == 'approve'
                  ? 'Request endorsed and forwarded to teacher!'
                  : 'Request rejected.',
            ),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('1st Tier Leave Approvals'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _requests.isEmpty
              ? const Center(
                  child: Text(
                    'No pending leave requests from your students.',
                    style: TextStyle(color: Color(0xFF94A3B8)),
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
                      final status = item['status'] ?? 'pending_mazer';
                      final id = item['id'] as int;
                      final isPending = status == 'pending_mazer';

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      student['name'] ?? 'Student',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                                    ),
                                    Text(
                                      classRoom['name'] ?? 'Classroom',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                                    ),
                                  ],
                                ),
                                AttendanceBadge(status: status),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(
                              item['reason'] ?? '',
                              style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1)),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Date span: ${item['start_date']} to ${item['end_date']}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            if (isPending) ...[
                              const SizedBox(height: 14),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppTheme.error,
                                      side: const BorderSide(color: AppTheme.error),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                    onPressed: () => _processApproval(id, 'reject'),
                                    child: const Text('Reject'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.success,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    ),
                                    onPressed: () => _processApproval(id, 'approve'),
                                    child: const Text('Endorse & Approve'),
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
