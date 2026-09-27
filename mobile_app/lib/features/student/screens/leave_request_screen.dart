import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/attendance_badge.dart';

class LeaveRequestScreen extends StatefulWidget {
  const LeaveRequestScreen({super.key});

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form State
  String _leaveType = 'sick';
  DateTime _startDate = DateTime.now();
  DateTime _endDate = DateTime.now();
  final _reasonController = TextEditingController();
  bool _isSubmitting = false;
  String? _formError;

  // History State
  bool _isLoadingHistory = true;
  List<dynamic> _myRequests = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchMyRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _fetchMyRequests() async {
    setState(() => _isLoadingHistory = true);
    try {
      final response = await DioClient.instance.get(ApiEndpoints.studentLeaveRequests);
      if (response.data['success'] == true) {
        setState(() {
          _myRequests = response.data['data']['data'] as List<dynamic>;
        });
      }
    } catch (_) {
      // preview
    } finally {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  Future<void> _handleSubmit() async {
    final reason = _reasonController.text.trim();
    if (reason.length < 5) {
      setState(() => _formError = 'Please provide a clear reason (min 5 characters).');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _formError = null;
    });

    try {
      final startStr = _startDate.toIso8601String().split('T')[0];
      final endStr = _endDate.toIso8601String().split('T')[0];

      await DioClient.instance.post(
        ApiEndpoints.studentLeaveRequests,
        data: {
          'class_room_id': 1, // Current enrolled classroom
          'leave_type': _leaveType,
          'start_date': startStr,
          'end_date': endStr,
          'reason': reason,
        },
      );

      _reasonController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Leave application submitted for Mazer review!'),
            backgroundColor: AppTheme.success,
          ),
        );
        _tabController.animateTo(1);
        _fetchMyRequests();
      }
    } on DioException catch (e) {
      setState(() {
        _formError = e.response?.data?['message'] ?? 'Submission failed.';
      });
    } catch (e) {
      setState(() => _formError = 'An error occurred.');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave & Absence Requests'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF94A3B8),
          tabs: const [
            Tab(text: 'Submit New'),
            Tab(text: 'My Requests'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Submit Form
          SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (_formError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _formError!,
                      style: const TextStyle(color: AppTheme.error, fontSize: 13),
                    ),
                  ),

                const Text(
                  'Reason for Absence',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _leaveType,
                  decoration: const InputDecoration(),
                  dropdownColor: AppTheme.surface,
                  items: const [
                    DropdownMenuItem(value: 'sick', child: Text('Medical / Sick Leave')),
                    DropdownMenuItem(value: 'permission', child: Text('Personal Permission')),
                    DropdownMenuItem(value: 'dispensation', child: Text('Official Institutional Duty')),
                    DropdownMenuItem(value: 'correction', child: Text('Attendance Log Correction')),
                  ],
                  onChanged: (val) => setState(() => _leaveType = val ?? 'sick'),
                ),
                const SizedBox(height: 18),

                // Date Selectors
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Start Date', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _startDate,
                                firstDate: DateTime.now().subtract(const Duration(days: 7)),
                                lastDate: DateTime.now().add(const Duration(days: 60)),
                              );
                              if (picked != null) setState(() => _startDate = picked);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFF1E293B)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${_startDate.day}/${_startDate.month}/${_startDate.year}',
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                  ),
                                  const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primaryLight),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('End Date', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _endDate,
                                firstDate: _startDate,
                                lastDate: DateTime.now().add(const Duration(days: 60)),
                              );
                              if (picked != null) setState(() => _endDate = picked);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFF1E293B)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${_endDate.day}/${_endDate.month}/${_endDate.year}',
                                    style: const TextStyle(color: Colors.white, fontSize: 13),
                                  ),
                                  const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primaryLight),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                const Text(
                  'Detailed Explanation',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Describe medical symptoms, event context, or reasons...',
                  ),
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _handleSubmit,
                    child: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Submit Application'),
                  ),
                ),
              ],
            ),
          ),

          // Tab 2: Requests History
          _isLoadingHistory
              ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
              : _myRequests.isEmpty
                  ? const Center(child: Text('No leave applications submitted yet.', style: TextStyle(color: Color(0xFF94A3B8))))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _myRequests.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (ctx, idx) {
                        final req = _myRequests[idx];
                        final status = req['status'] ?? 'pending_mazer';
                        final reason = req['reason'] ?? '';

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
                                  Text(
                                    (req['leave_type'] as String).toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                      fontSize: 14,
                                    ),
                                  ),
                                  AttendanceBadge(status: status),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                reason,
                                style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Dates: ${req['start_date']} to ${req['end_date']}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ],
      ),
    );
  }
}
