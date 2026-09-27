<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AttendanceSession extends Model
{
    use HasFactory;

    protected $table = 'attendance_sessions';

    protected $fillable = [
        'class_subject_id',
        'teacher_id',
        'session_date',
        'title',
        'start_time',
        'end_time',
        'expires_at',
        'status',
        'qr_secret',
        'qr_refresh_seconds',
        'allow_late',
        'late_threshold_minutes',
        'room',
        'latitude',
        'longitude',
        'radius_meters',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'expires_at' => 'datetime',
            'allow_late' => 'boolean',
            'qr_refresh_seconds' => 'integer',
            'late_threshold_minutes' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'radius_meters' => 'integer',
        ];
    }

    public function classSubject(): BelongsTo
    {
        return $this->belongsTo(ClassSubject::class, 'class_subject_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'attendance_session_id');
    }

    public function isExpired(): bool
    {
        if ($this->status !== 'active') {
            return true;
        }

        if ($this->expires_at && now()->isAfter($this->expires_at)) {
            return true;
        }

        return false;
    }
}
