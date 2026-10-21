import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/attendance_badge.dart';

class LeaveRequestScreen extends StatefulWidget {
  final bool isTab;
  final List<dynamic>? classes;
  final int? initialClassRoomId;

  const LeaveRequestScreen({
    super.key,
    this.isTab = false,
    this.classes,
    this.initialClassRoomId,
  });

  @override
  State<LeaveRequestScreen> createState() => _LeaveRequestScreenState();
}

class _LeaveRequestScreenState extends State<LeaveRequestScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Form State
  String _leaveType = 'sick';
  int? _selectedClassRoomId;
  List<dynamic> _availableClasses = [];
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
    if (widget.classes != null && widget.classes!.isNotEmpty) {
      _availableClasses = List.from(widget.classes!);
      _selectedClassRoomId = widget.initialClassRoomId ?? (_availableClasses.first['id'] as num?)?.toInt();
    } else {
      _selectedClassRoomId = widget.initialClassRoomId ?? 1;
      _fetchAvailableClasses();
    }
    _fetchMyRequests();
  }

  Future<void> _fetchAvailableClasses() async {
    try {
      final res = await DioClient.instance.get(ApiEndpoints.me);
      if (res.data['success'] == true) {
        final meta = res.data['meta'] as Map<String, dynamic>? ?? {};
        final advised = meta['advised_classes'] as List<dynamic>?;
        final enrolled = meta['enrolled_class'] as Map<String, dynamic>?;
        final taught = meta['taught_subjects'] as List<dynamic>?;

        final List<dynamic> found = [];
        if (advised != null && advised.isNotEmpty) {
          found.addAll(advised);
        } else if (enrolled != null) {
          found.add(enrolled);
        } else if (taught != null && taught.isNotEmpty) {
          for (final t in taught) {
            final cr = t['class_room'];
            if (cr != null && !found.any((c) => c['id'] == cr['id'])) {
              found.add(cr);
            }
          }
        }

        if (found.isNotEmpty && mounted) {
          setState(() {
            _availableClasses = found;
            if (_selectedClassRoomId == null || !found.any((c) => c['id'] == _selectedClassRoomId)) {
              _selectedClassRoomId = (found.first['id'] as num?)?.toInt();
            }
          });
        }
      }
    } catch (_) {}
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
          'class_room_id': _selectedClassRoomId ?? 1,
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
            content: Text('Leave application submitted successfully!'),
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave & Absence Requests'),
        automaticallyImplyLeading: !widget.isTab,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white.withValues(alpha: 0.25),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDark ? const Color(0xFF334155) : Colors.white.withValues(alpha: 0.3)),
            ),
            child: TabBar(
              controller: _tabController,
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              labelColor: Colors.white,
              unselectedLabelColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              tabs: const [
                Tab(text: 'Submit New'),
                Tab(text: 'My Requests'),
              ],
            ),
          ),
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

                if (_availableClasses.length > 1) ...[
                  Text(
                    'Class / Cohort',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<int>(
                    initialValue: _selectedClassRoomId,
                    isExpanded: true,
                    menuMaxHeight: 280,
                    icon: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: Color(0xFF64748B),
                    ),
                    dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    elevation: 4,
                    style: TextStyle(
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                    ),
                    items: _availableClasses.map<DropdownMenuItem<int>>((c) {
                      final id = (c['id'] as num?)?.toInt() ?? 1;
                      final name = c['name'] ?? 'Class $id';
                      return DropdownMenuItem<int>(
                        value: id,
                        child: Text(
                          name,
                          overflow: TextOverflow.ellipsis,
                          maxLines: 1,
                        ),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedClassRoomId = val);
                    },
                  ),
                  const SizedBox(height: 16),
                ],

                Text(
                  'Reason for Absence',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _leaveType,
                  isExpanded: true,
                  menuMaxHeight: 280,
                  icon: const Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: Color(0xFF64748B),
                  ),
                  dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  elevation: 4,
                  style: TextStyle(
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                    ),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'sick',
                      child: Text('Medical / Sick Leave', overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
                    DropdownMenuItem(
                      value: 'permission',
                      child: Text('Personal Permission', overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
                    DropdownMenuItem(
                      value: 'dispensation',
                      child: Text('Official Institutional Duty', overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
                    DropdownMenuItem(
                      value: 'correction',
                      child: Text('Attendance Log Correction', overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
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
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${_startDate.day}/${_startDate.month}/${_startDate.year}',
                                    style: TextStyle(
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                                      fontSize: 13,
                                    ),
                                  ),
                                  const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primary),
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
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '${_endDate.day}/${_endDate.month}/${_endDate.year}',
                                    style: TextStyle(
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                                      fontSize: 13,
                                    ),
                                  ),
                                  const Icon(Icons.calendar_today_rounded, size: 16, color: AppTheme.primary),
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

                Text(
                  'Detailed Explanation',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _reasonController,
                  maxLines: 4,
                  style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Describe medical symptoms, event context, or reasons...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    contentPadding: const EdgeInsets.all(16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                    ),
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
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    (req['leave_type'] as String).toUpperCase(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? Colors.white : const Color(0xFF0F172A),
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
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                ),
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
