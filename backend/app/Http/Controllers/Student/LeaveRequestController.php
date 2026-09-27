<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmitLeaveRequest;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    /**
     * Get student's leave requests.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user();

        $requests = LeaveRequest::with([
            'classRoom:id,name,code',
            'subject:id,name,code',
            'attendanceSession:id,title,session_date',
        ])
        ->where('student_id', $student->id)
        ->orderBy('created_at', 'desc')
        ->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * Submit a leave or attendance correction request.
     */
    public function store(SubmitLeaveRequest $request): JsonResponse
    {
        $student = $request->user();

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('leave_attachments', 'public');
        }

        $leaveRequest = LeaveRequest::create([
            'student_id' => $student->id,
            'class_room_id' => $request->class_room_id,
            'subject_id' => $request->subject_id,
            'attendance_session_id' => $request->attendance_session_id,
            'leave_type' => $request->leave_type,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'reason' => $request->reason,
            'attachment_path' => $attachmentPath,
            'status' => 'pending_mazer',
            'mazer_approval' => 'pending',
            'teacher_approval' => 'pending',
        ]);

        $leaveRequest->load(['classRoom', 'subject']);

        return response()->json([
            'success' => true,
            'message' => 'Leave request submitted successfully. It has been forwarded to your Mazer for 1st-level review.',
            'data' => $leaveRequest,
        ], 201);
    }

    /**
     * View detail of a leave request.
     */
    public function show(LeaveRequest $leaveRequest, Request $request): JsonResponse
    {
        if ($leaveRequest->student_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $leaveRequest->load([
            'classRoom',
            'subject',
            'attendanceSession',
            'mazerReviewer:id,name,email',
            'teacherReviewer:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $leaveRequest,
        ]);
    }
}
