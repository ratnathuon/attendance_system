import 'package:flutter/material.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/theme/app_theme.dart';

class AnnouncementScreen extends StatefulWidget {
  final int classRoomId;
  final String className;
  final bool isTab;
  final bool isTeacher;
  final bool isStudent;
  final bool isReadOnly;
  final bool hideAppBar;

  const AnnouncementScreen({
    super.key,
    this.classRoomId = 0,
    this.className = '',
    this.isTab = false,
    this.isTeacher = false,
    this.isStudent = false,
    this.isReadOnly = false,
    this.hideAppBar = false,
  });

  @override
  State<AnnouncementScreen> createState() => _AnnouncementScreenState();
}

class _AnnouncementScreenState extends State<AnnouncementScreen> {
  final _titleController = TextEditingController();
  final _messageController = TextEditingController();
  String _priority = 'normal';
  bool _isLoading = true;
  bool _isPosting = false;
  List<dynamic> _announcements = [];
  String? _resolvedClassName;

  String get _endpoint {
    if (widget.isStudent) {
      return widget.classRoomId > 0
          ? ApiEndpoints.studentClassAnnouncements(widget.classRoomId)
          : ApiEndpoints.studentAnnouncements;
    }
    if (widget.isTeacher) {
      return ApiEndpoints.teacherClassAnnouncements(widget.classRoomId);
    }
    return ApiEndpoints.mazerClassAnnouncements(widget.classRoomId);
  }

  bool get _canBroadcast => !widget.isReadOnly && !widget.isStudent;

  @override
  void initState() {
    super.initState();
    _fetchAnnouncements();
  }

  @override
  void didUpdateWidget(covariant AnnouncementScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.classRoomId != widget.classRoomId ||
        oldWidget.isStudent != widget.isStudent ||
        oldWidget.isTeacher != widget.isTeacher) {
      _fetchAnnouncements();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _fetchAnnouncements() async {
    setState(() => _isLoading = true);
    try {
      final response = await DioClient.instance.get(_endpoint);
      if (response.data['success'] == true) {
        setState(() {
          _announcements = response.data['data'] as List<dynamic>? ?? [];
          if (response.data['class_room'] != null) {
            _resolvedClassName = response.data['class_room']['name'] as String?;
          }
        });
      }
    } catch (_) {
      // preview/error fallback
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handlePost() async {
    final title = _titleController.text.trim();
    final message = _messageController.text.trim();

    if (title.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in title and message.')),
      );
      return;
    }

    setState(() => _isPosting = true);
    try {
      await DioClient.instance.post(
        _endpoint,
        data: {
          'title': title,
          'message': message,
          'priority': _priority,
        },
      );

      _titleController.clear();
      _messageController.clear();
      _fetchAnnouncements();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Announcement broadcasted to class!'),
            backgroundColor: AppTheme.success,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to post announcement.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isPosting = false);
    }
  }

  String _formatDateTime(dynamic raw) {
    if (raw == null) return '';
    try {
      final dt = DateTime.parse(raw.toString()).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';

      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return raw.toString();
    }
  }

  Widget _buildPriorityBadge(String? priority) {
    final p = (priority ?? 'normal').toLowerCase();
    Color bg;
    Color fg;
    String label;

    switch (p) {
      case 'urgent':
        bg = const Color(0xFFFEE2E2);
        fg = const Color(0xFFDC2626);
        label = 'URGENT';
        break;
      case 'high':
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFFD97706);
        label = 'HIGH';
        break;
      default:
        bg = const Color(0xFFEFF6FF);
        fg = const Color(0xFF2563EB);
        label = 'NORMAL';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: fg,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final displayClassName = widget.className.isNotEmpty
        ? widget.className
        : (_resolvedClassName ?? 'Class');

    return Scaffold(
      appBar: widget.hideAppBar
          ? null
          : AppBar(
              title: Text(
                widget.isStudent
                    ? 'Class Announcements'
                    : 'Announcements: $displayClassName',
              ),
              automaticallyImplyLeading: !widget.isTab,
            ),
      body: RefreshIndicator(
        onRefresh: _fetchAnnouncements,
        color: AppTheme.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Compose Card (Only visible to Teacher/Mazer)
              if (_canBroadcast) ...[
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Broadcast Class Announcement',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          hintText: 'Announcement Subject / Title',
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _messageController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'Write message to enrolled students...',
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Text(
                            'Priority:',
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                          ),
                          const SizedBox(width: 10),
                          DropdownButton<String>(
                            value: _priority,
                            dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            menuMaxHeight: 250,
                            underline: const SizedBox(),
                            items: const [
                              DropdownMenuItem(
                                value: 'normal',
                                child: Text('Normal', overflow: TextOverflow.ellipsis, maxLines: 1),
                              ),
                              DropdownMenuItem(
                                value: 'high',
                                child: Text('High Priority', overflow: TextOverflow.ellipsis, maxLines: 1),
                              ),
                              DropdownMenuItem(
                                value: 'urgent',
                                child: Text('Urgent', overflow: TextOverflow.ellipsis, maxLines: 1),
                              ),
                            ],
                            onChanged: (v) => setState(() => _priority = v ?? 'normal'),
                          ),
                          const Spacer(),
                          ElevatedButton(
                            onPressed: _isPosting ? null : _handlePost,
                            child: _isPosting
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text('Broadcast'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Header for announcements
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.isStudent ? 'Latest Notices' : 'Past Announcements',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                  if (_announcements.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_announcements.length} ${widget.isStudent ? 'Notices' : 'Broadcasts'}',
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              _isLoading
                  ? const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                    )
                  : _announcements.isEmpty
                      ? Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.campaign_outlined,
                                  size: 32,
                                  color: AppTheme.primary,
                                ),
                              ),
                              const SizedBox(height: 14),
                              Text(
                                widget.isStudent
                                    ? 'No announcements yet'
                                    : 'No announcements broadcasted yet.',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                widget.isStudent
                                    ? 'Updates and alerts from your class advisor and teachers will appear here.'
                                    : 'Broadcast announcements to notify all enrolled students.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _announcements.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (ctx, idx) {
                            final item = _announcements[idx];
                            final title = item['title'] as String? ?? 'Notice';
                            final message = item['message'] as String? ?? '';
                            final priority = item['priority'] as String? ?? 'normal';
                            final author = item['author_name'] as String? ?? 'Class Advisor';
                            final time = _formatDateTime(item['created_at']);

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: priority == 'urgent'
                                      ? const Color(0xFFFCA5A5)
                                      : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                  width: priority == 'urgent' ? 1.4 : 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          title,
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      _buildPriorityBadge(priority),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    message,
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      height: 1.45,
                                      color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  Container(
                                    padding: const EdgeInsets.only(top: 10),
                                    decoration: BoxDecoration(
                                      border: Border(
                                        top: BorderSide(
                                          color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                                        ),
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.person_outline_rounded,
                                          size: 15,
                                          color: Color(0xFF64748B),
                                        ),
                                        const SizedBox(width: 5),
                                        Expanded(
                                          child: Text(
                                            author,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                              color: Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                        if (time.isNotEmpty) ...[
                                          const Icon(
                                            Icons.access_time_rounded,
                                            size: 13,
                                            color: Color(0xFF94A3B8),
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            time,
                                            style: const TextStyle(
                                              fontSize: 11.5,
                                              color: Color(0xFF94A3B8),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
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
