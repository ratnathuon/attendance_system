<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestManagementController extends Controller
{
    /**
     * List all student leave requests with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::with([
            'student:id,name,email,identifier_number',
            'classRoom:id,name,code',
            'subject:id,name,code',
            'attendanceSession:id,title,session_date',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('class_room_id')) {
            $query->where('class_room_id', $request->class_room_id);
        }

        if ($request->filled('student_id')) {
            $query->where('student_id', $request->student_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('student', function ($sq) use ($search) {
                $sq->where('name', 'like', "%{$search}%")
                   ->orWhere('email', 'like', "%{$search}%")
                   ->orWhere('identifier_number', 'like', "%{$search}%");
            });
        }

        $leaves = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $leaves,
        ]);
    }

    /**
     * Show a single leave request.
     */
    public function show(LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->load([
            'student:id,name,email,identifier_number',
            'classRoom:id,name,code',
            'subject:id,name,code',
            'attendanceSession:id,title,session_date',
        ]);

        return response()->json([
            'success' => true,
            'data' => $leaveRequest,
        ]);
    }

    /**
     * Update/Edit a student leave request.
     */
    public function update(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $validated = $request->validate([
            'leave_type' => ['nullable', 'string', 'in:sick,personal,official,other'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:1000'],
            'status' => ['required', 'string', 'in:pending,pending_mazer,pending_teacher,approved,rejected'],
        ]);

        $updateData = [
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'reason' => $validated['reason'],
            'status' => $validated['status'],
        ];

        if (isset($validated['leave_type'])) {
            $updateData['leave_type'] = $validated['leave_type'];
        }

        if ($validated['status'] === 'approved') {
            $updateData['mazer_approval'] = 'approved';
            $updateData['teacher_approval'] = 'approved';
            $updateData['mazer_approved_by'] = $request->user()->id;
            $updateData['teacher_approved_by'] = $request->user()->id;
            $updateData['mazer_approved_at'] = now();
            $updateData['teacher_approved_at'] = now();
        } elseif ($validated['status'] === 'rejected') {
            $updateData['mazer_approval'] = 'rejected';
            $updateData['teacher_approval'] = 'rejected';
        }

        $leaveRequest->update($updateData);

        // If linked to attendance session and approved, update record to 'excused'
        if ($validated['status'] === 'approved' && $leaveRequest->attendance_session_id) {
            AttendanceRecord::updateOrCreate(
                [
                    'attendance_session_id' => $leaveRequest->attendance_session_id,
                    'student_id' => $leaveRequest->student_id,
                ],
                [
                    'status' => 'excused',
                    'override_reason' => 'Leave approved: ' . $validated['reason'],
                    'overridden_by' => $request->user()->id,
                    'overridden_at' => now(),
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Student leave request updated successfully.',
            'data' => $leaveRequest->fresh([
                'student:id,name,email,identifier_number',
                'classRoom:id,name,code',
                'subject:id,name,code',
            ]),
        ]);
    }

    /**
     * Remove/Delete a student leave request.
     */
    public function destroy(LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->delete();

        return response()->json([
            'success' => true,
            'message' => 'Student leave request removed successfully.',
        ]);
    }
}
