import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/user_model.dart';
import 'class_roster_screen.dart';
import 'mazer_approvals_screen.dart';
import 'announcement_screen.dart';

class MazerHomeScreen extends StatefulWidget {
  final UserModel user;

  const MazerHomeScreen({super.key, required this.user});

  @override
  State<MazerHomeScreen> createState() => _MazerHomeScreenState();
}

class _MazerHomeScreenState extends State<MazerHomeScreen> {
  bool _isLoading = true;
  List<dynamic> _advisedClasses = [];

  @override
  void initState() {
    super.initState();
    _fetchMazerData();
  }

  Future<void> _fetchMazerData() async {
    setState(() => _isLoading = true);
    try {
      final res = await DioClient.instance.get(ApiEndpoints.me);
      if (res.data['success'] == true) {
        setState(() {
          _advisedClasses = res.data['meta']?['advised_classes'] as List<dynamic>? ?? [];
        });
      }
    } catch (_) {
      // preview
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleLogout() async {
    await SecureStorageService.clearAll();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.user.name,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            const Text(
              'Homeroom Advisor (Mazer) • Portal',
              style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.approval_rounded),
            tooltip: 'Leave Approvals',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MazerApprovalsScreen()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.error),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchMazerData,
        color: AppTheme.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Mazer Overview Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF78350F), Color(0xFF451A03)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: AppTheme.warning.withValues(alpha: 0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'HOMEROOM SUPERVISION',
                      style: TextStyle(
                        color: Color(0xFFFDE68A),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Student Welfare & Leave Endorsement',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'As Mazer, you oversee 1st-level attendance leave requests and monitor holistic class participation.',
                      style: TextStyle(fontSize: 12, color: Color(0xFFFEF3C7), height: 1.3),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF78350F),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const MazerApprovalsScreen()),
                        );
                      },
                      icon: const Icon(Icons.checklist_rounded, size: 20),
                      label: const Text('Review Pending Leave Requests'),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Advised Classrooms List
              const Text(
                'My Assigned Cohorts / Classes',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 12),

              _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                  : _advisedClasses.isEmpty
                      ? Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: AppTheme.surface,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Center(
                            child: Text(
                              'No classes assigned to your Mazer profile yet.',
                              style: TextStyle(color: Color(0xFF94A3B8)),
                            ),
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _advisedClasses.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 14),
                          itemBuilder: (ctx, idx) {
                            final cls = _advisedClasses[idx];
                            final classId = cls['id'] as int;
                            final className = cls['name'] ?? 'Classroom';
                            final classCode = cls['code'] ?? '';

                            return Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: AppTheme.surface,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: const Color(0xFF1E293B)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        className,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppTheme.primary.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          classCode,
                                          style: const TextStyle(
                                            color: AppTheme.primaryLight,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 14),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          style: OutlinedButton.styleFrom(
                                            side: const BorderSide(color: Color(0xFF334155)),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                          ),
                                          onPressed: () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => ClassRosterScreen(
                                                  classRoomId: classId,
                                                  className: className,
                                                ),
                                              ),
                                            );
                                          },
                                          icon: const Icon(Icons.people_outline, size: 18),
                                          label: const Text('Roster', style: TextStyle(fontSize: 12)),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF1E293B),
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                          ),
                                          onPressed: () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => AnnouncementScreen(
                                                  classRoomId: classId,
                                                  className: className,
                                                ),
                                              ),
                                            );
                                          },
                                          icon: const Icon(Icons.campaign_outlined, size: 18),
                                          label: const Text('Announce', style: TextStyle(fontSize: 12)),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ],
          ),
        ),
      ),
    );
  }
}
