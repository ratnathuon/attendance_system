<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
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
        }

        return response()->json([
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
