<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherLeaveApprovalController extends Controller
{
    /**
     * List leave requests that require teacher action or relate to teacher's subjects.
     */
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        // Subjects taught by teacher
        $taughtSubjectIds = $teacher->taughtClassSubjects()->pluck('subject_id');
        $taughtClassRoomIds = $teacher->taughtClassSubjects()->pluck('class_room_id');

        $query = LeaveRequest::with([
            'student:id,name,email,identifier_number',
            'classRoom:id,name,code',
            'subject:id,name,code',
            'attendanceSession',
        ])
        ->where(function ($q) use ($taughtSubjectIds, $taughtClassRoomIds) {
            $q->whereIn('subject_id', $taughtSubjectIds)
              ->orWhereIn('class_room_id', $taughtClassRoomIds);
        });

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * Approve or reject a leave request as subject teacher.
     */
    public function updateStatus(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $teacher = $request->user();

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $isApproved = $validated['action'] === 'approve';

        $leaveRequest->update([
            'teacher_approval' => $isApproved ? 'approved' : 'rejected',
            'teacher_approved_by' => $teacher->id,
            'teacher_approved_at' => now(),
            'teacher_notes' => $validated['notes'] ?? null,
            'status' => $isApproved ? 'approved' : 'rejected',
        ]);

        // If approved and tied to an attendance session, automatically record status as 'excused'
        if ($isApproved && $leaveRequest->attendance_session_id) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $leaveRequest->attendance_session_id,
                    'student_id' => $leaveRequest->student_id,
                ],
                [
                    'status' => 'excused',
                    'method' => 'manual_teacher',
                    'marked_by' => $teacher->id,
                    'remarks' => "Leave approved: {$leaveRequest->leave_type}",
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => "Leave request " . ($isApproved ? 'approved' : 'rejected') . " successfully.",
            'data' => $leaveRequest,
        ]);
    }
}
