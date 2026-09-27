<?php

namespace App\Http\Controllers\Mazer;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MazerLeaveApprovalController extends Controller
{
    /**
     * List leave requests from students in Mazer's advised class rooms.
     */
    public function index(Request $request): JsonResponse
    {
        $mazer = $request->user();
        $classRoomIds = ClassRoom::where('mazer_id', $mazer->id)->pluck('id');

        $query = LeaveRequest::with([
            'student:id,name,email,identifier_number',
            'classRoom:id,name,code',
            'subject:id,name,code',
            'attendanceSession',
        ])->whereIn('class_room_id', $classRoomIds);

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
     * Process 1st level leave request approval or rejection.
     */
    public function updateStatus(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $mazer = $request->user();

        // Check if leaveRequest belongs to Mazer's class
        if ($leaveRequest->classRoom->mazer_id !== $mazer->id && !$mazer->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'action' => ['required', 'string', 'in:approve,reject'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $isApproved = $validated['action'] === 'approve';

        // If approved by Mazer, it moves to teacher or becomes fully approved
        $newOverallStatus = $isApproved
            ? ($leaveRequest->subject_id ? 'pending_teacher' : 'approved')
            : 'rejected';

        $leaveRequest->update([
            'mazer_approval' => $isApproved ? 'approved' : 'rejected',
            'mazer_approved_by' => $mazer->id,
            'mazer_approved_at' => now(),
            'mazer_notes' => $validated['notes'] ?? null,
            'status' => $newOverallStatus,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Leave request " . ($isApproved ? 'endorsed/approved' : 'rejected') . " by Mazer.",
            'data' => $leaveRequest,
        ]);
    }
}
