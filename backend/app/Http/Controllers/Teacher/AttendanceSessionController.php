<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateSessionRequest;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Services\QrTokenService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AttendanceSessionController extends Controller
{
    public function __construct(
        protected QrTokenService $qrTokenService
    ) {}

    /**
     * List all sessions created by this teacher.
     */
    public function index(Request $request): JsonResponse
    {
        $teacher = $request->user();

        $query = AttendanceSession::with([
            'classSubject.classRoom:id,name,code',
            'classSubject.subject:id,name,code',
        ])
        ->withCount([
            'attendanceRecords',
            'attendanceRecords as present_count' => fn ($q) => $q->whereIn('status', ['present', 'late']),
        ])
        ->where('teacher_id', $teacher->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sessions = $query->orderBy('created_at', 'desc')->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $sessions,
        ]);
    }

    /**
     * Create a new attendance session with dynamic QR rotation secret.
     */
    public function store(CreateSessionRequest $request): JsonResponse
    {
        $teacher = $request->user();
        $classSubject = ClassSubject::findOrFail($request->class_subject_id);

        // Verify teacher teaches this subject
        if ($classSubject->teacher_id !== $teacher->id && !$teacher->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to teach this class subject.',
            ], 403);
        }

        // Close any currently active sessions for this subject
        AttendanceSession::where('class_subject_id', $classSubject->id)
            ->where('status', 'active')
            ->update(['status' => 'closed', 'end_time' => now()]);

        $durationMinutes = $request->integer('duration_minutes', 90);
        $expiresAt = Carbon::now()->addMinutes($durationMinutes);

        $session = AttendanceSession::create([
            'class_subject_id' => $classSubject->id,
            'teacher_id' => $teacher->id,
            'session_date' => $request->session_date ?: Carbon::today()->toDateString(),
            'title' => $request->title ?: "{$classSubject->subject->name} - " . Carbon::today()->format('d M Y'),
            'start_time' => now(),
            'expires_at' => $expiresAt,
            'status' => 'active',
            'qr_secret' => Str::random(64),
            'qr_refresh_seconds' => $request->integer('qr_refresh_seconds', 15),
            'allow_late' => $request->boolean('allow_late', true),
            'late_threshold_minutes' => $request->integer('late_threshold_minutes', 15),
            'room' => $request->room ?: $classSubject->room,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'radius_meters' => $request->radius_meters,
            'notes' => $request->notes,
        ]);

        $session->load([
            'classSubject.classRoom',
            'classSubject.subject',
        ]);

        $qrData = $this->qrTokenService->generateToken($session);

        return response()->json([
            'success' => true,
            'message' => 'Attendance session started successfully.',
            'session' => $session,
            'qr' => $qrData,
        ], 201);
    }

    /**
     * Get dynamic QR token & countdown for an active session.
     */
    public function getQrToken(AttendanceSession $session, Request $request): JsonResponse
    {
        if ($session->teacher_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        if ($session->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Session is no longer active.',
            ], 400);
        }

        $qrData = $this->qrTokenService->generateToken($session);

        $scannedCount = $session->attendanceRecords()->count();
        $totalEnrolled = Enrollment::where('class_room_id', $session->classSubject->class_room_id)
            ->where('status', 'active')
            ->count();

        return response()->json([
            'success' => true,
            'qr' => $qrData,
            'stats' => [
                'scanned_count' => $scannedCount,
                'total_enrolled' => $totalEnrolled,
            ],
        ]);
    }

    /**
     * Close an active attendance session and mark unrecorded enrolled students as absent.
     */
    public function close(AttendanceSession $session, Request $request): JsonResponse
    {
        if ($session->teacher_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $session->update([
            'status' => 'closed',
            'end_time' => now(),
        ]);

        // Automatically populate absent records for students who did not scan
        if ($request->boolean('mark_remaining_absent', true)) {
            $enrolledStudentIds = Enrollment::where('class_room_id', $session->classSubject->class_room_id)
                ->where('status', 'active')
                ->pluck('student_id');

            $alreadyRecordedIds = AttendanceRecord::where('attendance_session_id', $session->id)
                ->pluck('student_id');

            $unmarkedIds = $enrolledStudentIds->diff($alreadyRecordedIds);

            foreach ($unmarkedIds as $studentId) {
                AttendanceRecord::create([
                    'attendance_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => 'absent',
                    'method' => 'manual_teacher',
                    'marked_by' => $request->user()->id,
                    'remarks' => 'Auto-marked absent upon session closure',
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Session closed successfully.',
            'session' => $session,
        ]);
    }

    /**
     * Get live list of records and enrolled students for this session.
     */
    public function sessionRecords(AttendanceSession $session, Request $request): JsonResponse
    {
        if ($session->teacher_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $classRoomId = $session->classSubject->class_room_id;

        // All enrolled students
        $enrollments = Enrollment::with('student:id,name,email,identifier_number,phone')
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->get();

        $records = AttendanceRecord::where('attendance_session_id', $session->id)
            ->get()
            ->keyBy('student_id');

        $roster = $enrollments->map(function ($enrollment) use ($records) {
            $record = $records->get($enrollment->student_id);
            return [
                'student' => $enrollment->student,
                'record_id' => $record?->id,
                'status' => $record ? $record->status : 'unmarked',
                'scanned_at' => $record?->scanned_at,
                'method' => $record?->method,
                'remarks' => $record?->remarks,
            ];
        });

        return response()->json([
            'success' => true,
            'session' => $session->load(['classSubject.classRoom', 'classSubject.subject']),
            'roster' => $roster,
        ]);
    }
}
