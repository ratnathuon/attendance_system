import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/glass.dart';
import '../../../core/theme/theme_controller.dart';
import '../../auth/models/user_model.dart';
import 'profile_forms_screens.dart';
import '../services/attendance_pdf_export.dart';

String roleLabel(String role) {
  switch (role) {
    case 'teacher':
      return 'Faculty Professor';
    case 'mazer':
      return 'Homeroom Advisor (Mazer)';
    case 'admin':
      return 'Administrator';
    default:
      return 'Student';
  }
}

String userInitials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return (parts.first[0] + parts.last[0]).toUpperCase();
}

/// Circle avatar showing the profile picture, falling back to initials.
class UserAvatar extends StatelessWidget {
  final UserModel user;
  final double radius;

  const UserAvatar({super.key, required this.user, this.radius = 18});

  @override
  Widget build(BuildContext context) {
    final url = user.avatarUrl;
    final initials = Text(
      userInitials(user.name),
      style: TextStyle(
        color: Colors.white,
        fontSize: radius * 0.72,
        fontWeight: FontWeight.bold,
      ),
    );
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppTheme.primary,
      child: (url == null || url.isEmpty)
          ? initials
          : ClipOval(
              child: Image.network(
                url,
                width: radius * 2,
                height: radius * 2,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => initials,
              ),
            ),
    );
  }
}

/// Tappable "avatar + name" block used in every role's home app bar.
class ProfileHeader extends StatelessWidget {
  final UserModel user;
  final String? subtitle;
  final ValueChanged<UserModel> onUserUpdated;

  const ProfileHeader({
    super.key,
    required this.user,
    required this.onUserUpdated,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () async {
        final updated = await Navigator.of(context).push<UserModel>(
          MaterialPageRoute(builder: (_) => ProfileScreen(user: user)),
        );
        if (updated != null) onUserUpdated(updated);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            UserAvatar(user: user, radius: 18),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    user.name,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    subtitle ?? user.identifierNumber ?? roleLabel(user.role),
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatefulWidget {
  final UserModel user;

  const ProfileScreen({super.key, required this.user});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late UserModel _user;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
  }

  Future<void> _pickAvatar() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from gallery'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    try {
      final picked = await ImagePicker().pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null) return;

      setState(() => _uploading = true);
      final form = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(
          File(picked.path).path,
          filename: picked.name,
        ),
      });
      final res = await DioClient.instance.post(ApiEndpoints.updateAvatar, data: form);
      final updated = UserModel.fromJson(res.data['user'] as Map<String, dynamic>);
      await SecureStorageService.saveUser(updated.toJson());
      if (!mounted) return;
      setState(() => _user = updated);
      profileToast(context, 'Profile picture updated.');
    } catch (e) {
      if (mounted) profileToast(context, profileErrorText(e), error: true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _openEditProfile() async {
    final updated = await Navigator.of(context).push<UserModel>(
      MaterialPageRoute(builder: (_) => EditProfileScreen(user: _user)),
    );
    if (updated != null && mounted) setState(() => _user = updated);
  }

  Future<void> _openExport() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    List<ExportRecord> all;
    try {
      all = await AttendancePdfExport.fetchRecords();
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop();
      profileToast(context, profileErrorText(e), error: true);
      return;
    }
    if (!mounted) return;
    Navigator.of(context).pop();

    if (all.isEmpty) {
      profileToast(context, 'No attendance records to export yet.', error: true);
      return;
    }

    final months = all.map((r) => r.monthKey).toSet().toList()
      ..sort((a, b) => b.compareTo(a));
    final subjects = all.map((r) => r.subject).toSet().toList()..sort();
    String? month; // null = all months
    String? subject; // null = all subjects

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Export Attendance'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String?>(
                initialValue: month,
                isExpanded: true,
                menuMaxHeight: 280,
                borderRadius: BorderRadius.circular(16),
                decoration: const InputDecoration(labelText: 'Month'),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('All months', overflow: TextOverflow.ellipsis, maxLines: 1),
                  ),
                  for (final m in months)
                    DropdownMenuItem(
                      value: m,
                      child: Text(monthLabel(m), overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
                ],
                onChanged: (v) => setLocal(() => month = v),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String?>(
                initialValue: subject,
                isExpanded: true,
                menuMaxHeight: 280,
                borderRadius: BorderRadius.circular(16),
                decoration: const InputDecoration(labelText: 'Subject'),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('All subjects', overflow: TextOverflow.ellipsis, maxLines: 1),
                  ),
                  for (final s in subjects)
                    DropdownMenuItem(
                      value: s,
                      child: Text(s, overflow: TextOverflow.ellipsis, maxLines: 1),
                    ),
                ],
                onChanged: (v) => setLocal(() => subject = v),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.pop(ctx, true),
              icon: const Icon(Icons.picture_as_pdf_outlined, size: 18),
              label: const Text('Export PDF'),
            ),
          ],
        ),
      ),
    );
    if (confirmed != true || !mounted) return;

    final filtered = all
        .where((r) =>
            (month == null || r.monthKey == month) &&
            (subject == null || r.subject == subject))
        .toList();

    try {
      await AttendancePdfExport.exportAndShare(user: _user, records: filtered);
    } catch (e) {
      if (mounted) profileToast(context, 'Could not create PDF: $e', error: true);
    }
  }

  void _openChangePassword() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ChangePasswordScreen()),
    );
  }

  Future<void> _signOut() async {
    try {
      await DioClient.instance.post(ApiEndpoints.logout);
    } catch (_) {
      // Continue even if the server call fails
    }
    await SecureStorageService.clearAll();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primary),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                const SizedBox(height: 2),
                Text(value.isEmpty ? '—' : value,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
          color: Color(0xFF94A3B8),
        ),
      ),
    );
  }

  Widget _card(List<Widget> children) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: isDark
          ? BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppTheme.surfaceCard, width: 1.2),
            )
          : glassDecoration(context),
      child: Column(children: children),
    );
  }

  Widget _menuTile(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppTheme.primary),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_user);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('My Profile')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Column(
                children: [
                  GestureDetector(
                    onTap: _uploading ? null : _pickAvatar,
                    child: Stack(
                      children: [
                        UserAvatar(user: _user, radius: 48),
                        if (_uploading)
                          Positioned.fill(
                            child: Container(
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.black45,
                              ),
                              child: const Center(
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 3),
                              ),
                            ),
                          ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.all(7),
                            decoration: BoxDecoration(
                              color: AppTheme.secondary,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Theme.of(context).scaffoldBackgroundColor,
                                width: 3,
                              ),
                            ),
                            child: const Icon(Icons.camera_alt_rounded,
                                size: 16, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(_user.name,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      roleLabel(_user.role),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _sectionTitle('Personal Information'),
            _card([
              _infoRow(Icons.email_outlined, 'Email', _user.email),
              _infoRow(Icons.badge_outlined, 'ID Number', _user.identifierNumber ?? ''),
              _infoRow(Icons.phone_outlined, 'Phone', _user.phone ?? ''),
            ]),
            _sectionTitle('Settings'),
            _card([
              _menuTile(Icons.edit_outlined, 'Edit Profile', _openEditProfile),
              _menuTile(Icons.lock_outline, 'Change Password', _openChangePassword),
              if (_user.isStudent)
                _menuTile(Icons.picture_as_pdf_outlined, 'Export Attendance (PDF)', _openExport),
              ValueListenableBuilder<ThemeMode>(
                valueListenable: ThemeController.mode,
                builder: (context, mode, _) {
                  final dark = mode == ThemeMode.dark;
                  return SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    secondary: Icon(
                      dark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: AppTheme.primary,
                    ),
                    title: Text(
                      dark ? 'Dark Mode' : 'Light Mode',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    value: dark,
                    activeThumbColor: AppTheme.primary,
                    onChanged: (v) => ThemeController.setDark(v),
                  );
                },
              ),
            ]),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.error,
                side: const BorderSide(color: AppTheme.error),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: _signOut,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Sign Out'),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
