<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $table = 'leave_requests';

    protected $fillable = [
        'student_id',
        'class_room_id',
        'attendance_session_id',
        'subject_id',
        'leave_type',
        'start_date',
        'end_date',
        'reason',
        'attachment_path',
        'status',
        'mazer_approval',
        'mazer_approved_by',
        'mazer_approved_at',
        'mazer_notes',
        'teacher_approval',
        'teacher_approved_by',
        'teacher_approved_at',
        'teacher_notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'mazer_approved_at' => 'datetime',
            'teacher_approved_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class, 'class_room_id');
    }

    public function attendanceSession(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function mazerReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mazer_approved_by');
    }

    public function teacherReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_approved_by');
    }
}
