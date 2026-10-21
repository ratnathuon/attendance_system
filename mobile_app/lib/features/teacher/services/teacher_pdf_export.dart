import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';

class TeacherSubjectPdfExport {
  /// Opens a bottom sheet allowing the teacher to select Month, Day, Year or Date Range
  static void showExportDialog(
    BuildContext context,
    int classSubjectId, {
    String? subjectName,
    String? className,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ExportFilterSheet(
        classSubjectId: classSubjectId,
        subjectName: subjectName,
        className: className,
      ),
    );
  }

  /// Fetches subject report data with optional date/month/year query parameters and shares the PDF
  static Future<void> exportSubjectPdf(
    BuildContext context,
    int classSubjectId, {
    String? subjectName,
    String? className,
    Map<String, dynamic>? queryParams,
    String? periodLabel,
  }) async {
    // Show loading overlay
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: AppTheme.primary,
                  ),
                ),
                SizedBox(width: 16),
                Text(
                  'Generating Subject PDF...',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                    decoration: TextDecoration.none,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final res = await DioClient.instance.get(
        ApiEndpoints.teacherSubjectReport(classSubjectId),
        queryParameters: queryParams,
      );

      final data = (res.data is Map && res.data['success'] == true)
          ? res.data as Map<String, dynamic>
          : null;

      final subjectInfo = (data?['subject_info'] as Map<String, dynamic>?) ??
          {
            'subject_name': subjectName ?? 'Subject Course',
            'subject_code': 'SUBJ',
            'class_name': className ?? 'Assigned Class',
            'class_code': 'CLS',
            'teacher_name': 'Faculty Instructor',
            'period_label': periodLabel ?? 'All Recorded Sessions',
          };

      if (periodLabel != null && subjectInfo['period_label'] == null) {
        subjectInfo['period_label'] = periodLabel;
      }

      final stats = (data?['stats'] as Map<String, dynamic>?) ??
          {
            'total_sessions': 0,
            'total_students': 0,
            'overall_rate': 0.0,
            'total_present': 0,
            'total_late': 0,
            'total_absent': 0,
            'total_excused': 0,
          };

      final students = (data?['students'] as List<dynamic>?) ?? [];

      // Dismiss loading dialog
      if (context.mounted) Navigator.of(context).pop();

      // Build and share PDF
      await _generateAndSharePdf(
        subjectInfo: subjectInfo,
        stats: stats,
        students: students,
      );
    } catch (e) {
      if (context.mounted) {
        Navigator.of(context).pop(); // dismiss loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate PDF report: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  static Future<void> _generateAndSharePdf({
    required Map<String, dynamic> subjectInfo,
    required Map<String, dynamic> stats,
    required List<dynamic> students,
  }) async {
    final pdf = pw.Document();

    pw.ThemeData? theme;
    try {
      theme = pw.ThemeData.withFont(
        base: await PdfGoogleFonts.notoSansRegular(),
        bold: await PdfGoogleFonts.notoSansBold(),
      );
    } catch (_) {
      theme = null;
    }

    final now = DateTime.now();
    final dateStr = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final subjectCode = '${subjectInfo['subject_code'] ?? 'SUBJ'}';
    final subjectTitle = '${subjectInfo['subject_name'] ?? 'Subject Course'}';
    final classTitle = '${subjectInfo['class_name'] ?? 'Classroom'}';
    final teacherName = '${subjectInfo['teacher_name'] ?? 'Faculty Teacher'}';
    final periodStr = '${subjectInfo['period_label'] ?? 'All Recorded Sessions'}';

    final totalSessions = stats['total_sessions'] ?? 0;
    final totalStudents = stats['total_students'] ?? students.length;
    final overallRate = stats['overall_rate'] ?? 0.0;
    final totalPresent = stats['total_present'] ?? 0;
    final totalLate = stats['total_late'] ?? 0;
    final totalAbsent = stats['total_absent'] ?? 0;
    final totalExcused = stats['total_excused'] ?? 0;

    pdf.addPage(
      pw.MultiPage(
        theme: theme,
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(bottom: 16),
            padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#1E293B'),
              borderRadius: pw.BorderRadius.circular(10),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'ROYAL UNIVERSITY OF PHNOM PENH',
                      style: pw.TextStyle(
                        color: PdfColors.white,
                        fontWeight: pw.FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'Faculty Attendance System • Subject Report',
                      style: const pw.TextStyle(
                        color: PdfColor.fromInt(0xFFCBD5E1),
                        fontSize: 8,
                      ),
                    ),
                  ],
                ),
                pw.Text(
                  'Date: $dateStr',
                  style: const pw.TextStyle(
                    color: PdfColor.fromInt(0xFF94A3B8),
                    fontSize: 8,
                  ),
                ),
              ],
            ),
          );
        },
        footer: (pw.Context context) {
          return pw.Container(
            margin: const pw.EdgeInsets.only(top: 16),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text(
                  'Confidential • Official Academic Record',
                  style: const pw.TextStyle(
                    fontSize: 8,
                    color: PdfColor.fromInt(0xFF94A3B8),
                  ),
                ),
                pw.Text(
                  'Page ${context.pageNumber} of ${context.pagesCount}',
                  style: const pw.TextStyle(
                    fontSize: 8,
                    color: PdfColor.fromInt(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          );
        },
        build: (pw.Context context) => [
          // Course Title & Metadata
          pw.Text(
            subjectTitle,
            style: pw.TextStyle(
              fontSize: 18,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#0F172A'),
            ),
          ),
          pw.SizedBox(height: 4),
          pw.Text(
            'Code: $subjectCode   |   Class: $classTitle   |   Instructor: $teacherName',
            style: const pw.TextStyle(
              fontSize: 9.5,
              color: PdfColor.fromInt(0xFF475569),
            ),
          ),
          pw.SizedBox(height: 2),
          pw.Text(
            'Reporting Period: $periodStr',
            style: pw.TextStyle(
              fontSize: 9,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#4338CA'),
            ),
          ),
          pw.SizedBox(height: 14),

          // Stat Chips Row
          pw.Row(
            children: [
              _buildStatBox('Overall Rate', '$overallRate%', PdfColor.fromHex('#059669'), PdfColor.fromHex('#ECFDF5')),
              pw.SizedBox(width: 5),
              _buildStatBox('Sessions', '$totalSessions', PdfColor.fromHex('#0F172A'), PdfColor.fromHex('#F1F5F9')),
              pw.SizedBox(width: 5),
              _buildStatBox('Enrolled', '$totalStudents', PdfColor.fromHex('#0F172A'), PdfColor.fromHex('#F1F5F9')),
              pw.SizedBox(width: 5),
              _buildStatBox('Present', '$totalPresent', PdfColor.fromHex('#059669'), PdfColor.fromHex('#F0FDF4')),
              pw.SizedBox(width: 5),
              _buildStatBox('Late', '$totalLate', PdfColor.fromHex('#D97706'), PdfColor.fromHex('#FFFBEB')),
              pw.SizedBox(width: 5),
              _buildStatBox('Absent', '$totalAbsent', PdfColor.fromHex('#E11D48'), PdfColor.fromHex('#FFF1F2')),
              pw.SizedBox(width: 5),
              _buildStatBox('Excused', '$totalExcused', PdfColor.fromHex('#0284C7'), PdfColor.fromHex('#F0F9FF')),
            ],
          ),
          pw.SizedBox(height: 18),

          // Students Attendance Table
          pw.Text(
            'Enrolled Students Attendance Roster',
            style: pw.TextStyle(
              fontSize: 11,
              fontWeight: pw.FontWeight.bold,
              color: PdfColor.fromHex('#1E293B'),
            ),
          ),
          pw.SizedBox(height: 8),

          pw.TableHelper.fromTextArray(
            headers: ['#', 'ID Number', 'Student Name', 'P', 'L', 'A', 'E', 'Rate', 'Status'],
            data: List.generate(students.length, (index) {
              final s = students[index] as Map<String, dynamic>;
              final rate = s['attendance_rate'] ?? 0.0;
              String standing = 'Good';
              if (rate is num && rate < 70) {
                standing = 'Critical';
              } else if (rate is num && rate < 80) {
                standing = 'Warning';
              }

              return [
                '${index + 1}',
                '${s['identifier_number'] ?? '—'}',
                '${s['name'] ?? 'Student'}',
                '${s['present'] ?? 0}',
                '${s['late'] ?? 0}',
                '${s['absent'] ?? 0}',
                '${s['excused'] ?? 0}',
                '$rate%',
                standing,
              ];
            }),
            headerStyle: pw.TextStyle(
              fontSize: 8.5,
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.white,
            ),
            headerDecoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#1E293B'),
            ),
            cellStyle: const pw.TextStyle(fontSize: 8),
            cellAlignment: pw.Alignment.center,
            cellAlignments: {
              0: pw.Alignment.center,
              1: pw.Alignment.centerLeft,
              2: pw.Alignment.centerLeft,
            },
            cellPadding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 4),
          ),

          pw.SizedBox(height: 24),

          // Signatures
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    'Subject Instructor Signature:',
                    style: const pw.TextStyle(fontSize: 8.5, color: PdfColor.fromInt(0xFF64748B)),
                  ),
                  pw.SizedBox(height: 25),
                  pw.Container(width: 140, height: 1, color: PdfColor.fromHex('#CBD5E1')),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    teacherName,
                    style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text(
                    'Academic Department Approval:',
                    style: const pw.TextStyle(fontSize: 8.5, color: PdfColor.fromInt(0xFF64748B)),
                  ),
                  pw.SizedBox(height: 25),
                  pw.Container(width: 140, height: 1, color: PdfColor.fromHex('#CBD5E1')),
                  pw.SizedBox(height: 4),
                  pw.Text(
                    'Faculty Dean / Mazer Advisor',
                    style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );

    final cleanCode = subjectCode.replaceAll(RegExp(r'[^a-zA-Z0-9_-]'), '');
    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'RUPP_${cleanCode}_Attendance_Report.pdf',
    );
  }

  static pw.Widget _buildStatBox(String label, String value, PdfColor textColor, PdfColor bgColor) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 8),
        decoration: pw.BoxDecoration(
          color: bgColor,
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Text(
              value,
              style: pw.TextStyle(
                color: textColor,
                fontSize: 11,
                fontWeight: pw.FontWeight.bold,
              ),
            ),
            pw.SizedBox(height: 2),
            pw.Text(
              label,
              style: const pw.TextStyle(
                color: PdfColor.fromInt(0xFF64748B),
                fontSize: 7,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom Sheet for selecting date filter parameters before export
class _ExportFilterSheet extends StatefulWidget {
  final int classSubjectId;
  final String? subjectName;
  final String? className;

  const _ExportFilterSheet({
    required this.classSubjectId,
    this.subjectName,
    this.className,
  });

  @override
  State<_ExportFilterSheet> createState() => _ExportFilterSheetState();
}

class _ExportFilterSheetState extends State<_ExportFilterSheet> {
  String _mode = 'month'; // 'month', 'day', 'range', 'all'
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;
  DateTime _selectedDay = DateTime.now();
  DateTimeRange? _selectedRange;

  static const _monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  String _formatDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  void _handleExport() {
    Navigator.of(context).pop(); // close sheet

    final params = <String, dynamic>{};
    String periodLabel = 'All Sessions';

    if (_mode == 'month') {
      params['month'] = _selectedMonth;
      params['year'] = _selectedYear;
      periodLabel = '${_monthNames[_selectedMonth - 1]} $_selectedYear';
    } else if (_mode == 'day') {
      params['day'] = _formatDate(_selectedDay);
      periodLabel = 'Date: ${_formatDate(_selectedDay)}';
    } else if (_mode == 'range' && _selectedRange != null) {
      params['start_date'] = _formatDate(_selectedRange!.start);
      params['end_date'] = _formatDate(_selectedRange!.end);
      periodLabel = '${_formatDate(_selectedRange!.start)} to ${_formatDate(_selectedRange!.end)}';
    }

    TeacherSubjectPdfExport.exportSubjectPdf(
      context,
      widget.classSubjectId,
      subjectName: widget.subjectName,
      className: widget.className,
      queryParams: params,
      periodLabel: periodLabel,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Export Subject Attendance PDF',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${widget.subjectName ?? 'Subject'} • ${widget.className ?? ''}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF94A3B8)),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              const Text(
                'SELECT ATTENDANCE PERIOD',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF94A3B8),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 10),

              // 2x2 Grid for Filter Mode Options (Prevents horizontal overflow and clipping)
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildModeChip('month', 'Month & Year', Icons.calendar_month_rounded, isDark),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildModeChip('day', 'Specific Day', Icons.today_rounded, isDark),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildModeChip('range', 'Date Range', Icons.date_range_rounded, isDark),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildModeChip('all', 'All Time', Icons.all_inclusive_rounded, isDark),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Dynamic Period Inputs
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: _buildModeInputs(isDark),
              ),
              const SizedBox(height: 20),

              // Action Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: _handleExport,
                  icon: const Icon(Icons.picture_as_pdf_rounded, size: 18),
                  label: const Text(
                    'Generate & Export PDF',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeChip(String mode, String label, IconData icon, bool isDark) {
    final isSelected = _mode == mode;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => setState(() => _mode = mode),
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? AppTheme.primary : const Color(0xFF0F172A))
                : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? (isDark ? AppTheme.primary : const Color(0xFF0F172A))
                  : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.max,
            children: [
              Icon(icon, size: 15, color: isSelected ? Colors.white : const Color(0xFF64748B)),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : (isDark ? Colors.white70 : const Color(0xFF475569)),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModeInputs(bool isDark) {
    if (_mode == 'month') {
      return Row(
        children: [
          Expanded(
            flex: 3,
            child: DropdownButtonFormField<int>(
              initialValue: _selectedMonth,
              isExpanded: true,
              dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              menuMaxHeight: 280,
              borderRadius: BorderRadius.circular(16),
              decoration: InputDecoration(
                labelText: 'Month',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                enabledBorder: OutlineInputBorder(
                  borderRadius: const BorderRadius.all(Radius.circular(10)),
                  borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                ),
              ),
              items: List.generate(12, (i) => i + 1).map((m) {
                return DropdownMenuItem(
                  value: m,
                  child: Text(
                    _monthNames[m - 1],
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedMonth = val);
              },
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            flex: 2,
            child: DropdownButtonFormField<int>(
              initialValue: _selectedYear,
              isExpanded: true,
              dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              menuMaxHeight: 280,
              borderRadius: BorderRadius.circular(16),
              decoration: InputDecoration(
                labelText: 'Year',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: const OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
                enabledBorder: OutlineInputBorder(
                  borderRadius: const BorderRadius.all(Radius.circular(10)),
                  borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                ),
              ),
              items: [2024, 2025, 2026, 2027].map((y) {
                return DropdownMenuItem(
                  value: y,
                  child: Text(
                    '$y',
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedYear = val);
              },
            ),
          ),
        ],
      );
    } else if (_mode == 'day') {
      return InkWell(
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _selectedDay,
            firstDate: DateTime(2024),
            lastDate: DateTime(2030),
          );
          if (picked != null) {
            setState(() => _selectedDay = picked);
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Selected Day: ${_formatDate(_selectedDay)}',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? Colors.white : const Color(0xFF1E293B)),
              ),
              const Icon(Icons.edit_calendar_rounded, size: 18, color: AppTheme.primary),
            ],
          ),
        ),
      );
    } else if (_mode == 'range') {
      final label = _selectedRange != null
          ? '${_formatDate(_selectedRange!.start)}  →  ${_formatDate(_selectedRange!.end)}'
          : 'Tap to select Start & End Dates';

      return InkWell(
        onTap: () async {
          final picked = await showDateRangePicker(
            context: context,
            firstDate: DateTime(2024),
            lastDate: DateTime(2030),
            initialDateRange: _selectedRange ??
                DateTimeRange(
                  start: DateTime.now().subtract(const Duration(days: 30)),
                  end: DateTime.now(),
                ),
          );
          if (picked != null) {
            setState(() => _selectedRange = picked);
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? Colors.white : const Color(0xFF1E293B)),
              ),
              const Icon(Icons.date_range_rounded, size: 18, color: AppTheme.primary),
            ],
          ),
        ),
      );
    } else {
      return Row(
        children: [
          const Icon(Icons.check_circle_outline_rounded, size: 18, color: Color(0xFF059669)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Compiles all sessions recorded across the entire academic semester.',
              style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569)),
            ),
          ),
        ],
      );
    }
  }
}
