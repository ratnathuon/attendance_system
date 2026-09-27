<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\ScanAttendanceRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
use App\Services\QrTokenService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class AttendanceScanController extends Controller
{
    public function __construct(
        protected QrTokenService $qrTokenService
    ) {}

    /**
     * Check in student via dynamic QR code token scan.
     */
    public function scan(ScanAttendanceRequest $request): JsonResponse
    {
        $student = $request->user();
        $session = AttendanceSession::with('classSubject')->findOrFail($request->session_id);

        // 1. Verify session is active
        if ($session->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Attendance session is closed.',
            ], 400);
        }

        if ($session->expires_at && now()->isAfter($session->expires_at)) {
            $session->update(['status' => 'closed']);
            return response()->json([
                'success' => false,
                'message' => 'Attendance session has expired.',
            ], 400);
        }

        // 2. Validate dynamic rotating HMAC token
        $isValidToken = $this->qrTokenService->validateToken(
            $session,
            $request->token,
            $request->step
        );

        if (!$isValidToken) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired QR code. Please scan the current code displayed on the screen.',
            ], 422);
        }

        // 3. Verify student enrollment in this class
        $classRoomId = $session->classSubject->class_room_id;
        $isEnrolled = Enrollment::where('student_id', $student->id)
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->exists();

        if (!$isEnrolled) {
            return response()->json([
                'success' => false,
                'message' => 'You are not enrolled in this class.',
            ], 403);
        }

        // 4. Check if student already checked in
        $existingRecord = AttendanceRecord::where('attendance_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existingRecord) {
            return response()->json([
                'success' => true,
                'message' => 'Attendance already recorded previously.',
                'already_recorded' => true,
                'data' => $existingRecord,
            ]);
        }

        // 5. Determine status (present vs late)
        $status = 'present';
        if ($session->allow_late && $session->late_threshold_minutes > 0) {
            $sessionStart = Carbon::parse($session->start_time);
            $minutesElapsed = $sessionStart->diffInMinutes(now(), false);
            if ($minutesElapsed > $session->late_threshold_minutes) {
                $status = 'late';
            }
        }

        // 6. Record attendance
        $record = AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => $status,
            'scanned_at' => now(),
            'method' => 'qr_scan',
            'device_info' => $request->device_info,
            'ip_address' => $request->ip(),
            'remarks' => "Checked in at " . now()->format('H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => $status === 'late' 
                ? 'Attendance recorded (Marked Late).' 
                : 'Attendance recorded successfully (Present)!',
            'data' => [
                'record' => $record,
                'session' => [
                    'title' => $session->title,
                    'subject' => $session->classSubject->subject->name ?? 'Subject',
                ],
                'status' => $status,
                'timestamp' => now()->toIso8601String(),
            ],
        ], 201);
    }
}
