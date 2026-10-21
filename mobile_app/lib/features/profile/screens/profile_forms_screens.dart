import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/user_model.dart';

String profileErrorText(Object e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map) {
      final errors = data['errors'];
      if (errors is Map && errors.isNotEmpty) {
        final first = errors.values.first;
        if (first is List && first.isNotEmpty) return first.first.toString();
      }
      if (data['message'] != null) return data['message'].toString();
    }
    return 'Unable to reach server.';
  }
  return 'Something went wrong. Please try again.';
}

void profileToast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(msg),
      backgroundColor: error ? AppTheme.error : AppTheme.success,
    ),
  );
}

Widget profileLoader() => const SizedBox(
      width: 20,
      height: 20,
      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
    );

/// Screen: edit name / phone. Pops with the updated [UserModel] (if saved).
class EditProfileScreen extends StatefulWidget {
  final UserModel user;
  const EditProfileScreen({super.key, required this.user});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late UserModel _user;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _phoneCtrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _user = widget.user;
    _nameCtrl = TextEditingController(text: _user.name);
    _phoneCtrl = TextEditingController(text: _user.phone ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      profileToast(context, 'Name cannot be empty.', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      final res = await DioClient.instance.put(
        ApiEndpoints.updateProfile,
        data: {'name': name, 'phone': _phoneCtrl.text.trim()},
      );
      final updated = UserModel.fromJson(res.data['user'] as Map<String, dynamic>);
      await SecureStorageService.saveUser(updated.toJson());
      if (!mounted) return;
      setState(() => _user = updated);
      profileToast(context, 'Profile updated.');
      Navigator.of(context).pop(updated);
    } catch (e) {
      if (mounted) profileToast(context, profileErrorText(e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_user);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Edit Profile')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Full Name',
                prefixIcon: Icon(Icons.person_outline, size: 20),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone',
                prefixIcon: Icon(Icons.phone_outlined, size: 20),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving ? profileLoader() : const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Screen: change password.
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _currentCtrl = TextEditingController();
  final _newCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _saving = false;
  bool _obscure = true;

  @override
  void dispose() {
    _currentCtrl.dispose();
    _newCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_currentCtrl.text.isEmpty || _newCtrl.text.isEmpty) {
      profileToast(context, 'Please fill in all password fields.', error: true);
      return;
    }
    if (_newCtrl.text != _confirmCtrl.text) {
      profileToast(context, 'New passwords do not match.', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await DioClient.instance.post(
        ApiEndpoints.changePassword,
        data: {
          'current_password': _currentCtrl.text,
          'new_password': _newCtrl.text,
        },
      );
      if (!mounted) return;
      profileToast(context, 'Password changed.');
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) profileToast(context, profileErrorText(e), error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(TextEditingController c, String label, {bool toggle = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: c,
        obscureText: toggle ? _obscure : true,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.lock_outline, size: 20),
          suffixIcon: toggle
              ? IconButton(
                  icon: Icon(
                    _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    size: 20,
                    color: AppTheme.primary,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                )
              : null,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Change Password')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _field(_currentCtrl, 'Current Password'),
          _field(_newCtrl, 'New Password', toggle: true),
          _field(_confirmCtrl, 'Confirm New Password', toggle: true),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => profileToast(
                context,
                'Please contact your administrator to reset your password.',
              ),
              child: const Text('Forgot password?'),
            ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: _saving ? null : _submit,
            child: _saving ? profileLoader() : const Text('Update Password'),
          ),
        ],
      ),
    );
  }
}
