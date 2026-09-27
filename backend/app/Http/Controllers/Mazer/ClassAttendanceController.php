<?php

namespace App\Http\Controllers\Mazer;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassRoom;
use App\Models\Enrollment;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassAttendanceController extends Controller
{
    /**
     * View today's attendance roster and summary for Mazer's homeroom class.
     */
    public function classRoster(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $mazer = $request->user();

        if ($classRoom->mazer_id !== $mazer->id && !$mazer->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned as the Mazer/advisor for this class.',
            ], 403);
        }

        $date = $request->input('date', Carbon::today()->toDateString());

        // Enrolled students in this class
        $enrollments = Enrollment::with('student:id,name,email,identifier_number,phone')
            ->where('class_room_id', $classRoom->id)
            ->where('status', 'active')
            ->get();

        // Get sessions that took place for this classroom on this date
        $sessions = AttendanceSession::whereHas('classSubject', function ($q) use ($classRoom) {
            $q->where('class_room_id', $classRoom->id);
        })->whereDate('session_date', $date)->get();

        $sessionIds = $sessions->pluck('id');

        $records = AttendanceRecord::whereIn('attendance_session_id', $sessionIds)->get();

        $studentAttendance = $enrollments->map(function ($enrollment) use ($records) {
            $studentRecords = $records->where('student_id', $enrollment->student_id);
            $presentCount = $studentRecords->whereIn('status', ['present', 'late'])->count();
            $absentCount = $studentRecords->where('status', 'absent')->count();
            $excusedCount = $studentRecords->where('status', 'excused')->count();

            return [
                'student' => $enrollment->student,
                'total_sessions_today' => $studentRecords->count(),
                'present' => $presentCount,
                'absent' => $absentCount,
                'excused' => $excusedCount,
                'records' => $studentRecords->values(),
            ];
        });

        return response()->json([
            'success' => true,
            'class_room' => $classRoom,
            'date' => $date,
            'total_students' => $enrollments->count(),
            'students' => $studentAttendance,
        ]);
    }

    /**
     * Mazer homeroom override: mark a student as excused or override a status for a session.
     */
    public function overrideRecord(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $mazer = $request->user();

        if ($classRoom->mazer_id !== $mazer->id && !$mazer->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'attendance_session_id' => ['required', 'integer', 'exists:attendance_sessions,id'],
            'student_id' => ['required', 'integer', 'exists:users,id'],
            'status' => ['required', 'string', 'in:present,late,absent,excused'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $record = AttendanceRecord::updateOrCreate(
            [
                'attendance_session_id' => $validated['attendance_session_id'],
                'student_id' => $validated['student_id'],
            ],
            [
                'status' => $validated['status'],
                'scanned_at' => now(),
                'method' => 'manual_mazer',
                'marked_by' => $mazer->id,
                'remarks' => $validated['remarks'] ?? 'Status updated by Mazer advisor',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Attendance status overridden by Mazer.',
            'data' => $record,
        ]);
    }
}
