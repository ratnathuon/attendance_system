import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/student_status_item.dart';

class ClassRosterScreen extends StatefulWidget {
  final int classRoomId;
  final String className;

  const ClassRosterScreen({
    super.key,
    required this.classRoomId,
    required this.className,
  });

  @override
  State<ClassRosterScreen> createState() => _ClassRosterScreenState();
}

class _ClassRosterScreenState extends State<ClassRosterScreen> {
  bool _isLoading = true;
  List<dynamic> _students = [];
  int _totalStudents = 0;

  @override
  void initState() {
    super.initState();
    _fetchRoster();
  }

  Future<void> _fetchRoster() async {
    setState(() => _isLoading = true);
    try {
      final response = await DioClient.instance.get(
        ApiEndpoints.mazerClassRoster(widget.classRoomId),
      );

      if (response.data['success'] == true) {
        setState(() {
          _students = response.data['students'] as List<dynamic>? ?? [];
          _totalStudents = response.data['total_students'] ?? _students.length;
        });
      }
    } catch (_) {
      // preview fallback
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showOverrideSheet(Map<String, dynamic> studentItem) {
    final student = studentItem['student'] ?? {};
    final studentId = student['id'] as int;
    final records = studentItem['records'] as List<dynamic>? ?? [];

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
                'Mazer Override: ${student['name']}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                'Homeroom Advisor administrative status adjustment',
                style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 18),
              if (records.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    'No session records found for this student today to override.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  ),
                )
              else
                ...records.map((r) {
                  final sessionId = r['attendance_session_id'] as int;
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      'Session #$sessionId (Current: ${r['status']})',
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextButton(
                          onPressed: () async {
                            Navigator.of(ctx).pop();
                            await _overrideStatus(sessionId, studentId, 'excused');
                          },
                          child: const Text('Excused', style: TextStyle(color: AppTheme.info)),
                        ),
                        TextButton(
                          onPressed: () async {
                            Navigator.of(ctx).pop();
                            await _overrideStatus(sessionId, studentId, 'present');
                          },
                          child: const Text('Present', style: TextStyle(color: AppTheme.success)),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _overrideStatus(int sessionId, int studentId, String status) async {
    try {
      await DioClient.instance.post(
        ApiEndpoints.mazerClassOverride(widget.classRoomId),
        data: {
          'attendance_session_id': sessionId,
          'student_id': studentId,
          'status': status,
          'remarks': 'Override by Mazer advisor',
        },
      );
      _fetchRoster();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Attendance overridden to $status.'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to override status.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.className),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(24),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              '$_totalStudents Total Enrolled Students',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : _students.isEmpty
              ? const Center(
                  child: Text('No students currently enrolled in this class.'),
                )
              : RefreshIndicator(
                  onRefresh: _fetchRoster,
                  color: AppTheme.primary,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _students.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 10),
                    itemBuilder: (ctx, idx) {
                      final item = _students[idx] as Map<String, dynamic>;
                      return StudentStatusItem(
                        studentData: item,
                        onTap: () => _showOverrideSheet(item),
                      );
                    },
                  ),
                ),
    );
  }
}
