import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';
import '../widgets/countdown_timer.dart';
import 'manual_attendance_screen.dart';

class DynamicQrScreen extends StatefulWidget {
  final int sessionId;
  final String sessionTitle;
  final String? initialQrPayload;

  const DynamicQrScreen({
    super.key,
    required this.sessionId,
    required this.sessionTitle,
    this.initialQrPayload,
  });

  @override
  State<DynamicQrScreen> createState() => _DynamicQrScreenState();
}

class _DynamicQrScreenState extends State<DynamicQrScreen> {
  String _qrPayload = '';
  int _expiresIn = 15;
  int _scannedCount = 0;
  int _totalEnrolled = 0;
  bool _isClosing = false;

  @override
  void initState() {
    super.initState();
    _qrPayload = widget.initialQrPayload ?? '{"session_id":${widget.sessionId}}';
    _fetchFreshToken();
  }

  Future<void> _fetchFreshToken() async {
    try {
      final response = await DioClient.instance.get(
        ApiEndpoints.teacherSessionQr(widget.sessionId),
      );

      if (response.data['success'] == true) {
        final qrData = response.data['qr'] ?? {};
        final stats = response.data['stats'] ?? {};

        if (mounted) {
          setState(() {
            _qrPayload = qrData['qr_payload'] ?? _qrPayload;
            _expiresIn = qrData['expires_in'] ?? 15;
            _scannedCount = stats['scanned_count'] ?? _scannedCount;
            _totalEnrolled = stats['total_enrolled'] ?? _totalEnrolled;
          });
        }
      }
    } catch (_) {
      // preview fallback
    }
  }

  Future<void> _handleCloseSession() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: const Text('Close Attendance Session?'),
        content: const Text(
          'Students who have not scanned will automatically be recorded as absent.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Close Session'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isClosing = true);
    try {
      await DioClient.instance.post(
        ApiEndpoints.teacherSessionClose(widget.sessionId),
        data: {'mark_remaining_absent': true},
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Session closed and roster finalized.'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to close session.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isClosing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.sessionTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.people_alt_rounded),
            tooltip: 'View Class Roster',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ManualAttendanceScreen(
                    sessionId: widget.sessionId,
                    sessionTitle: widget.sessionTitle,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              // Live status indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: AppTheme.success,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'Live Dynamic Session',
                    style: TextStyle(
                      color: AppTheme.success,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Dynamic QR Code Container
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withValues(alpha: 0.35),
                      blurRadius: 36,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: QrImageView(
                  data: _qrPayload,
                  version: QrVersions.auto,
                  size: 260.0,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Color(0xFF090D16),
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Color(0xFF090D16),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Countdown Timer Widget
              CountdownTimerWidget(
                totalSeconds: _expiresIn,
                onTimerFinish: _fetchFreshToken,
              ),

              const SizedBox(height: 24),

              // Scanned Counter Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Column(
                      children: [
                        Text(
                          '$_scannedCount',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            color: AppTheme.success,
                          ),
                        ),
                        const Text(
                          'Scanned In',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                    Container(height: 36, width: 1, color: const Color(0xFF334155)),
                    Column(
                      children: [
                        Text(
                          '${_totalEnrolled > 0 ? _totalEnrolled : "--"}',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        const Text(
                          'Total Enrolled',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        side: const BorderSide(color: Color(0xFF334155)),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ManualAttendanceScreen(
                              sessionId: widget.sessionId,
                              sessionTitle: widget.sessionTitle,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.edit_note_rounded, size: 20),
                      label: const Text('Roster / Override'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.error,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      onPressed: _isClosing ? null : _handleCloseSession,
                      icon: const Icon(Icons.stop_circle_outlined, size: 20),
                      label: _isClosing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white),
                            )
                          : const Text('Finish Session'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
