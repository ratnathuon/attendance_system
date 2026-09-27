import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import 'dynamic_qr_screen.dart';

class CreateSessionScreen extends StatefulWidget {
  final List<dynamic> taughtSubjects;

  const CreateSessionScreen({super.key, required this.taughtSubjects});

  @override
  State<CreateSessionScreen> createState() => _CreateSessionScreenState();
}

class _CreateSessionScreenState extends State<CreateSessionScreen> {
  int? _selectedClassSubjectId;
  final _titleController = TextEditingController();
  int _durationMinutes = 90;
  int _qrRefreshSeconds = 15;
  final int _lateThresholdMinutes = 15;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (widget.taughtSubjects.isNotEmpty) {
      _selectedClassSubjectId = widget.taughtSubjects.first['id'] as int?;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _handleStartSession() async {
    if (_selectedClassSubjectId == null) {
      setState(() => _errorMessage = 'Please select a subject to teach.');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await DioClient.instance.post(
        ApiEndpoints.teacherSessions,
        data: {
          'class_subject_id': _selectedClassSubjectId,
          'title': _titleController.text.trim().isNotEmpty
              ? _titleController.text.trim()
              : null,
          'duration_minutes': _durationMinutes,
          'qr_refresh_seconds': _qrRefreshSeconds,
          'late_threshold_minutes': _lateThresholdMinutes,
          'allow_late': true,
        },
      );

      if (response.data['success'] == true) {
        final session = response.data['session'] ?? {};
        final qrData = response.data['qr'] ?? {};
        final sessionId = session['id'] as int;
        final title = session['title'] ?? 'Attendance Session';

        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => DynamicQrScreen(
                sessionId: sessionId,
                sessionTitle: title,
                initialQrPayload: qrData['qr_payload'],
              ),
            ),
          );
        }
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to initialize session: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Start Attendance Session'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.error.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: AppTheme.error, fontSize: 13),
                ),
              ),

            const Text(
              'Select Assigned Subject & Cohort',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),

            widget.taughtSubjects.isEmpty
                ? Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'No subject assignments found for your account.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                    ),
                  )
                : DropdownButtonFormField<int>(
                    initialValue: _selectedClassSubjectId,
                    decoration: const InputDecoration(),
                    dropdownColor: AppTheme.surface,
                    items: widget.taughtSubjects.map((cs) {
                      final subject = cs['subject'] ?? {};
                      final classRoom = cs['class_room'] ?? {};
                      return DropdownMenuItem<int>(
                        value: cs['id'] as int,
                        child: Text(
                          '${subject['name'] ?? 'Subject'} • ${classRoom['code'] ?? 'Class'}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedClassSubjectId = val),
                  ),

            const SizedBox(height: 20),

            const Text(
              'Lecture Topic (Optional)',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                hintText: 'e.g. Chapter 4: Relational Normalization',
              ),
            ),

            const SizedBox(height: 20),

            // Settings Grid
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Duration',
                        style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<int>(
                        initialValue: _durationMinutes,
                        dropdownColor: AppTheme.surface,
                        items: const [
                          DropdownMenuItem(value: 45, child: Text('45 Mins')),
                          DropdownMenuItem(value: 90, child: Text('90 Mins')),
                          DropdownMenuItem(value: 120, child: Text('120 Mins')),
                        ],
                        onChanged: (v) => setState(() => _durationMinutes = v ?? 90),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'QR Refresh',
                        style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<int>(
                        initialValue: _qrRefreshSeconds,
                        dropdownColor: AppTheme.surface,
                        items: const [
                          DropdownMenuItem(value: 10, child: Text('10 Secs')),
                          DropdownMenuItem(value: 15, child: Text('15 Secs')),
                          DropdownMenuItem(value: 30, child: Text('30 Secs')),
                        ],
                        onChanged: (v) => setState(() => _qrRefreshSeconds = v ?? 15),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.qr_code_2_rounded, size: 24),
                label: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Generate Dynamic QR & Start'),
                onPressed: _isLoading ? null : _handleStartSession,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
