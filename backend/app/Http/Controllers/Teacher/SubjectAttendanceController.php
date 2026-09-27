<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectAttendanceController extends Controller
{
    /**
     * Manually mark or override attendance for a student in own subject session.
     */
    public function markAttendance(Request $request, AttendanceSession $session): JsonResponse
    {
        $teacher = $request->user();

        if ($session->teacher_id !== $teacher->id && !$teacher->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to mark attendance for this session.',
            ], 403);
        }

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:users,id'],
            'status' => ['required', 'string', 'in:present,late,absent,excused'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $record = AttendanceRecord::updateOrCreate(
            [
                'attendance_session_id' => $session->id,
                'student_id' => $validated['student_id'],
            ],
            [
                'status' => $validated['status'],
                'scanned_at' => now(),
                'method' => 'manual_teacher',
                'marked_by' => $teacher->id,
                'remarks' => $validated['remarks'] ?? 'Manually marked by subject teacher',
            ]
        );

        $record->load('student:id,name,email,identifier_number');

        return response()->json([
            'success' => true,
            'message' => 'Student attendance updated successfully.',
            'data' => $record,
        ]);
    }

    /**
     * Batch override attendance for multiple students.
     */
    public function batchMark(Request $request, AttendanceSession $session): JsonResponse
    {
        $teacher = $request->user();

        if ($session->teacher_id !== $teacher->id && !$teacher->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'integer', 'exists:users,id'],
            'records.*.status' => ['required', 'string', 'in:present,late,absent,excused'],
            'records.*.remarks' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated['records'] as $item) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $session->id,
                    'student_id' => $item['student_id'],
                ],
                [
                    'status' => $item['status'],
                    'scanned_at' => now(),
                    'method' => 'manual_teacher',
                    'marked_by' => $teacher->id,
                    'remarks' => $item['remarks'] ?? 'Batch updated by teacher',
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Batch attendance updated successfully.',
        ]);
    }
}
