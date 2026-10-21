<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentHistoryController extends Controller
{
    /**
     * Get student's overall attendance history.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $query = AttendanceRecord::with([
            'attendanceSession.classSubject.subject:id,name,code',
            'attendanceSession.classSubject.classRoom:id,name,code',
            'attendanceSession.teacher:id,name',
        ])->where('student_id', $student->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('subject_id')) {
            $query->whereHas('attendanceSession.classSubject', function ($cs) use ($request) {
                $cs->where('subject_id', $request->subject_id);
            });
        }

        $records = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $records,
        ]);
    }

    /**
     * Personal attendance statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        $student = $request->user();

        $records = AttendanceRecord::where('student_id', $student->id);

        $present = (clone $records)->where('status', 'present')->count();
        $late = (clone $records)->where('status', 'late')->count();
        $absent = (clone $records)->where('status', 'absent')->count();
        $excused = (clone $records)->where('status', 'excused')->count();
        $total = $present + $late + $absent + $excused;

        $attendanceRate = $total > 0
            ? round((($present + $late) / $total) * 100, 1)
            : 100.0;

        // Today's classes / active sessions
        $enrollment = Enrollment::where('student_id', $student->id)
            ->where('status', 'active')
            ->first();

        $activeSessions = [];
        if ($enrollment) {
            $activeSessions = AttendanceSession::with([
                'classSubject.subject:id,name,code',
                'teacher:id,name',
            ])
            ->whereHas('classSubject', function ($cs) use ($enrollment) {
                $cs->where('class_room_id', $enrollment->class_room_id);
            })
            ->where('status', 'active')
            ->whereDate('session_date', Carbon::today())
            ->get();
        } elseif ($student->role === 'mazer') {
            $activeSessions = AttendanceSession::with([
                'classSubject.subject:id,name,code',
                'teacher:id,name',
            ])
            ->whereHas('classSubject.classRoom', function ($cr) use ($student) {
                $cr->where('mazer_id', $student->id);
            })
            ->where('status', 'active')
            ->whereDate('session_date', Carbon::today())
            ->get();
        }

        $allRecords = AttendanceRecord::with('attendanceSession.classSubject.subject:id,name,code')
            ->where('student_id', $student->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $subjectName = fn ($r) => $r->attendanceSession?->classSubject?->subject?->name ?? 'Unknown';

        $perSubject = $allRecords->groupBy($subjectName)->map(function ($rows, $name) {
            $attended = $rows->whereIn('status', ['present', 'late'])->count();
            return [
                'subject' => $name,
                'total' => $rows->count(),
                'attended' => $attended,
                'rate' => round(($attended / max($rows->count(), 1)) * 100, 1),
            ];
        })->values();

        $recent = $allRecords->take(5)->map(fn ($r) => [
            'subject' => $subjectName($r),
            'status' => $r->status,
            'time' => optional($r->created_at)->toIso8601String(),
        ])->values();

        $leaves = LeaveRequest::where('student_id', $student->id)->pluck('status');
        $leaveCounts = [
            'pending' => $leaves->filter(fn ($s) => str_starts_with((string) $s, 'pending'))->count(),
            'approved' => $leaves->filter(fn ($s) => $s === 'approved')->count(),
            'rejected' => $leaves->filter(fn ($s) => $s === 'rejected')->count(),
        ];

        $enrolledIds = $student->enrollments()->where('status', 'active')->pluck('class_room_id')->filter()->unique();
        if ($enrolledIds->isEmpty()) {
            $enrolledIds = $student->enrollments()->pluck('class_room_id')->filter()->unique();
        }
        if ($enrolledIds->isEmpty()) {
            $enrolledIds = \App\Models\ClassRoom::pluck('id');
        }
        $announcementsCount = 0;
        foreach ($enrolledIds as $cId) {
            $announcementsCount += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
        }
        if ($announcementsCount === 0 && \App\Models\ClassRoom::count() > 0) {
            foreach (\App\Models\ClassRoom::pluck('id') as $cId) {
                $announcementsCount += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
            }
        }

        return response()->json([
            'per_subject' => $perSubject,
            'recent_activity' => $recent,
            'leave_counts' => $leaveCounts,
            'announcements_count' => $announcementsCount,
            'success' => true,
            'stats' => [
                'total_sessions' => $total,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'excused' => $excused,
                'attendance_rate' => $attendanceRate,
            ],
            'active_sessions_today' => $activeSessions,
        ]);
    }
}
