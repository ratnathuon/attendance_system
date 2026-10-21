import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../auth/models/user_model.dart';

/// One attendance row, flattened for export.
class ExportRecord {
  final DateTime date;
  final String subject;
  final String session;
  final String status;

  ExportRecord(this.date, this.subject, this.session, this.status);

  String get monthKey =>
      '${date.year}-${date.month.toString().padLeft(2, '0')}';
}

const _monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

String monthLabel(String key) {
  final p = key.split('-');
  return '${_monthNames[int.parse(p[1]) - 1]} ${p[0]}';
}

class AttendancePdfExport {
  /// Loads every attendance record of the logged-in student.
  static Future<List<ExportRecord>> fetchRecords() async {
    final out = <ExportRecord>[];
    var page = 1;
    var lastPage = 1;
    do {
      final res = await DioClient.instance.get(
        ApiEndpoints.studentHistory,
        queryParameters: {'per_page': 100, 'page': page},
      );
      final data = res.data['data'] as Map;
      lastPage = (data['last_page'] as num?)?.toInt() ?? 1;
      for (final r in (data['data'] as List)) {
        final session = (r['attendance_session'] ?? {}) as Map;
        final subject = ((session['class_subject'] ?? {}) as Map)['subject'] ?? {};
        final raw = r['scanned_at'] ?? r['created_at'] ?? session['session_date'];
        final date = DateTime.tryParse('${raw ?? ''}')?.toLocal();
        if (date == null) continue;
        out.add(ExportRecord(
          date,
          '${subject['name'] ?? 'Unknown subject'}',
          '${session['title'] ?? 'Lecture Session'}',
          '${r['status'] ?? 'present'}',
        ));
      }
      page++;
    } while (page <= lastPage);
    out.sort((a, b) => b.date.compareTo(a.date));
    return out;
  }

  static String _two(int n) => n.toString().padLeft(2, '0');


  /// Builds the PDF and opens the system share / save sheet.
  static Future<void> exportAndShare({
    required UserModel user,
    required List<ExportRecord> records,
  }) async {
    pw.ThemeData? theme;
    try {
      theme = pw.ThemeData.withFont(
        base: await PdfGoogleFonts.notoSansRegular(),
        bold: await PdfGoogleFonts.notoSansBold(),
      );
    } catch (_) {
      theme = null; // offline: fall back to the built-in font
    }

    final doc = pw.Document(theme: theme);

    // month -> subject -> records
    final byMonth = <String, Map<String, List<ExportRecord>>>{};
    for (final r in records) {
      byMonth
          .putIfAbsent(r.monthKey, () => {})
          .putIfAbsent(r.subject, () => [])
          .add(r);
    }
    final months = byMonth.keys.toList()..sort((a, b) => b.compareTo(a));

    final now = DateTime.now();
    final generated =
        '${_two(now.day)}/${_two(now.month)}/${now.year} ${_two(now.hour)}:${_two(now.minute)}';

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        header: (_) => pw.Container(
          padding: const pw.EdgeInsets.only(bottom: 10),
          decoration: const pw.BoxDecoration(
            border: pw.Border(bottom: pw.BorderSide(color: PdfColors.grey400)),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Text('AttendSphere - Attendance Report',
                  style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.Text(generated,
                  style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
            ],
          ),
        ),
        footer: (ctx) => pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text('Page ${ctx.pageNumber} / ${ctx.pagesCount}',
              style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
        ),
        build: (_) {
          final w = <pw.Widget>[
            pw.SizedBox(height: 12),
            pw.Text(user.name,
                style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
            pw.Text(
              '${user.identifierNumber ?? ''}   ${user.email}',
              style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
            ),
            pw.SizedBox(height: 6),
          ];

          if (records.isEmpty) {
            w.add(pw.Padding(
              padding: const pw.EdgeInsets.only(top: 30),
              child: pw.Text('No attendance records for this selection.'),
            ));
            return w;
          }

          for (final m in months) {
            w.add(pw.SizedBox(height: 14));
            w.add(pw.Container(
              width: double.infinity,
              padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              color: PdfColors.indigo,
              child: pw.Text(monthLabel(m),
                  style: pw.TextStyle(
                      fontSize: 13,
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.white)),
            ));

            final subjects = byMonth[m]!.keys.toList()..sort();
            for (final s in subjects) {
              final rows = byMonth[m]![s]!..sort((a, b) => a.date.compareTo(b.date));
              final present = rows.where((r) => r.status == 'present').length;
              final late = rows.where((r) => r.status == 'late').length;
              final absent = rows.where((r) => r.status == 'absent').length;
              final excused = rows.where((r) => r.status == 'excused').length;
              final rate = rows.isEmpty
                  ? 0
                  : ((present + late) / rows.length * 100).round();

              w.add(pw.SizedBox(height: 10));
              w.add(pw.Text(
                '$s   -   Present $present, Late $late, Absent $absent'
                '${excused > 0 ? ', Excused $excused' : ''}  ($rate%)',
                style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
              ));
              w.add(pw.SizedBox(height: 4));
              w.add(pw.TableHelper.fromTextArray(
                headers: const ['Date', 'Time', 'Session', 'Status'],
                data: [
                  for (final r in rows)
                    [
                      '${_two(r.date.day)}/${_two(r.date.month)}/${r.date.year}',
                      '${_two(r.date.hour)}:${_two(r.date.minute)}',
                      r.session,
                      r.status[0].toUpperCase() + r.status.substring(1),
                    ],
                ],
                headerStyle: pw.TextStyle(
                    fontSize: 9, fontWeight: pw.FontWeight.bold),
                headerDecoration:
                    const pw.BoxDecoration(color: PdfColors.grey200),
                cellStyle: const pw.TextStyle(fontSize: 9),
                cellAlignments: {
                  0: pw.Alignment.centerLeft,
                  1: pw.Alignment.centerLeft,
                  2: pw.Alignment.centerLeft,
                  3: pw.Alignment.centerLeft,
                },
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                cellDecoration: (index, data, rowNum) => const pw.BoxDecoration(),
                oddRowDecoration:
                    const pw.BoxDecoration(color: PdfColors.grey100),
              ));
            }
          }
          return w;
        },
      ),
    );

    final Uint8List bytes = await doc.save();
    final stamp = '${now.year}${_two(now.month)}${_two(now.day)}';
    await Printing.sharePdf(bytes: bytes, filename: 'attendance_report_$stamp.pdf');
  }
}
