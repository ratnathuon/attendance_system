import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';

class QrScannerScreen extends StatefulWidget {
  final bool isTab;
  final VoidCallback? onScanComplete;

  const QrScannerScreen({
    super.key,
    this.isTab = false,
    this.onScanComplete,
  });

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> with WidgetsBindingObserver {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
    useNewCameraSelector: true,
  );

  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  Future<void> _restartCamera() async {
    try {
      await _controller.stop();
    } catch (_) {}
    try {
      await _controller.start();
    } catch (_) {}
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _restartCamera();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final rawValue = barcodes.first.rawValue;
    if (rawValue == null || rawValue.isEmpty) return;

    setState(() => _isProcessing = true);

    try {
      // Decode QR payload (could be raw JSON or base64 JSON)
      Map<String, dynamic>? payload;
      try {
        payload = jsonDecode(rawValue) as Map<String, dynamic>;
      } catch (_) {
        // Try base64 decoding
        try {
          final decodedBytes = base64Decode(rawValue);
          final decodedString = utf8.decode(decodedBytes);
          payload = jsonDecode(decodedString) as Map<String, dynamic>;
        } catch (_) {
          // not formatted
        }
      }

      if (payload == null ||
          !payload.containsKey('session_id') ||
          !payload.containsKey('token') ||
          !payload.containsKey('step')) {
        _showResultDialog(
          success: false,
          title: 'Invalid QR Code',
          message:
              'The scanned code is not a valid AttendSphere dynamic session token.',
        );
        return;
      }

      final sessionId = payload['session_id'];
      final token = payload['token'];
      final step = payload['step'];

      // Send to backend
      final response = await DioClient.instance.post(
        ApiEndpoints.studentScan,
        data: {
          'session_id': sessionId,
          'token': token,
          'step': step,
          'device_info': 'Flutter Mobile App',
        },
      );

      final isSuccess = response.data['success'] == true;
      final status = response.data['data']?['status'] ?? 'present';
      final message = response.data['message'] ?? 'Attendance verified!';

      _showResultDialog(
        success: isSuccess,
        title: status == 'late' ? 'Recorded (Late)' : 'Verified (Present)',
        message: message,
        status: status,
      );
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ??
          'Verification failed. Token expired or invalid.';
      _showResultDialog(success: false, title: 'Check-in Failed', message: msg);
    } catch (e) {
      _showResultDialog(
        success: false,
        title: 'Error',
        message: 'Could not process QR code: $e',
      );
    }
  }

  void _showResultDialog({
    required bool success,
    required String title,
    required String message,
    String? status,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: (success ? AppTheme.success : AppTheme.error)
                    .withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(
                success ? Icons.check_circle_rounded : Icons.cancel_rounded,
                color: success ? AppTheme.success : AppTheme.error,
                size: 36,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF94A3B8),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: success
                      ? AppTheme.primary
                      : (isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                ),
                onPressed: () {
                  Navigator.of(ctx).pop();
                  if (success) {
                    if (widget.isTab) {
                      widget.onScanComplete?.call();
                    } else if (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop(true); // Return to home with refresh
                    }
                  } else {
                    setState(() => _isProcessing = false);
                  }
                },
                child: Text(success ? 'Done' : 'Try Again'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan Dynamic QR'),
        automaticallyImplyLeading: !widget.isTab,
        backgroundColor: Colors.transparent,
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch_rounded),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Live Camera Preview
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error, child) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 28),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          color: AppTheme.primary,
                          size: 40,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Camera Permission Needed',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Please allow Camera permission in your phone App Settings to scan attendance QR codes.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Start / Retry Camera'),
                        onPressed: _restartCamera,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // Viewfinder Overlay
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.primary, width: 3),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.25),
                    blurRadius: 30,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _CornerIndicator(isTop: true, isLeft: true),
                        _CornerIndicator(isTop: true, isLeft: false),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _CornerIndicator(isTop: false, isLeft: true),
                        _CornerIndicator(isTop: false, isLeft: false),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Instruction Banner
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: AppTheme.primary, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Point camera at the teacher\'s rotating dynamic QR code to record attendance.',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CornerIndicator extends StatelessWidget {
  final bool isTop;
  final bool isLeft;

  const _CornerIndicator({required this.isTop, required this.isLeft});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 16,
      height: 16,
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(isTop && isLeft ? 6 : 0),
          topRight: Radius.circular(isTop && !isLeft ? 6 : 0),
          bottomLeft: Radius.circular(!isTop && isLeft ? 6 : 0),
          bottomRight: Radius.circular(!isTop && !isLeft ? 6 : 0),
        ),
      ),
    );
  }
}
