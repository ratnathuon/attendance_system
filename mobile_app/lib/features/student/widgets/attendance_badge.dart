import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AttendanceBadge extends StatelessWidget {
  final String status;

  const AttendanceBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    String label;

    switch (status.toLowerCase()) {
      case 'present':
        bg = AppTheme.success.withValues(alpha: 0.15);
        fg = AppTheme.success;
        label = 'Present';
        break;
      case 'late':
        bg = AppTheme.warning.withValues(alpha: 0.15);
        fg = AppTheme.warning;
        label = 'Late';
        break;
      case 'absent':
        bg = AppTheme.error.withValues(alpha: 0.15);
        fg = AppTheme.error;
        label = 'Absent';
        break;
      case 'excused':
      case 'approved':
        bg = AppTheme.info.withValues(alpha: 0.15);
        fg = AppTheme.info;
        label = 'Excused';
        break;
      default:
        bg = const Color(0xFF334155).withValues(alpha: 0.3);
        fg = const Color(0xFF94A3B8);
        label = status.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.4)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: fg, shape: BoxShape.circle),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
