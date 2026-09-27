import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../student/widgets/attendance_badge.dart';

class StudentStatusItem extends StatelessWidget {
  final Map<String, dynamic> studentData;
  final VoidCallback? onTap;

  const StudentStatusItem({
    super.key,
    required this.studentData,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final student = studentData['student'] ?? {};
    final present = studentData['present'] ?? 0;
    final absent = studentData['absent'] ?? 0;
    final excused = studentData['excused'] ?? 0;

    String overallStatus = 'present';
    if (absent > 0) {
      overallStatus = 'absent';
    } else if (excused > 0) {
      overallStatus = 'excused';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: InkWell(
        onTap: onTap,
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  (student['name'] as String? ?? 'S').substring(0, 1),
                  style: const TextStyle(
                    color: AppTheme.warning,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
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
                  const SizedBox(height: 2),
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
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                AttendanceBadge(status: overallStatus),
                const SizedBox(height: 4),
                Text(
                  '$present Pres • $absent Abs',
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
