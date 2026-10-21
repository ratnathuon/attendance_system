<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassSubject;
use App\Models\Enrollment;
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

    /**
     * Get attendance report and student summary for a specific taught subject.
     */
    public function subjectReport(ClassSubject $classSubject, Request $request): JsonResponse
    {
        $teacher = $request->user();
        if ($classSubject->teacher_id !== $teacher->id && !$teacher->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $classSubject->load(['classRoom', 'subject', 'teacher']);

        $sessionsQuery = $classSubject->attendanceSessions()
            ->withCount([
                'attendanceRecords',
                'attendanceRecords as present_count' => fn ($q) => $q->whereIn('status', ['present', 'late']),
            ]);

        $filterLabel = 'All Recorded Sessions';

        // Filter by date range
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $sessionsQuery->whereBetween('session_date', [$request->start_date, $request->end_date]);
            $filterLabel = "{$request->start_date} to {$request->end_date}";
        } elseif ($request->filled('start_date')) {
            $sessionsQuery->where('session_date', '>=', $request->start_date);
            $filterLabel = "From {$request->start_date}";
        } elseif ($request->filled('end_date')) {
            $sessionsQuery->where('session_date', '<=', $request->end_date);
            $filterLabel = "Up to {$request->end_date}";
        }

        // Filter by month (e.g. "2026-10" or month=10)
        if ($request->filled('month')) {
            if (str_contains($request->month, '-')) {
                [$y, $m] = explode('-', $request->month);
                $sessionsQuery->whereYear('session_date', (int)$y)->whereMonth('session_date', (int)$m);
                $filterLabel = date('F Y', mktime(0, 0, 0, (int)$m, 1, (int)$y));
            } else {
                $monthNum = (int)$request->month;
                $sessionsQuery->whereMonth('session_date', $monthNum);
                if ($request->filled('year')) {
                    $yearNum = (int)$request->year;
                    $sessionsQuery->whereYear('session_date', $yearNum);
                    $filterLabel = date('F Y', mktime(0, 0, 0, $monthNum, 1, $yearNum));
                } else {
                    $filterLabel = date('F', mktime(0, 0, 0, $monthNum, 1));
                }
            }
        } elseif ($request->filled('year')) {
            $yearNum = (int)$request->year;
            $sessionsQuery->whereYear('session_date', $yearNum);
            $filterLabel = "Academic Year {$yearNum}";
        }

        // Filter by specific day if requested (e.g. day="2026-10-21")
        if ($request->filled('day')) {
            $sessionsQuery->whereDate('session_date', $request->day);
            $filterLabel = "Date: {$request->day}";
        }

        $sessions = $sessionsQuery->orderBy('session_date', 'asc')->get();

        $sessionIds = $sessions->pluck('id');
        $totalSessions = $sessions->count();

        // Enrolled students
        $enrollments = Enrollment::with('student:id,name,email,identifier_number')
            ->where('class_room_id', $classSubject->class_room_id)
            ->where('status', 'active')
            ->get();

        $allRecords = AttendanceRecord::whereIn('attendance_session_id', $sessionIds)->get();

        $studentsReport = $enrollments->map(function ($enrollment) use ($allRecords, $totalSessions) {
            $student = $enrollment->student;
            $studentRecords = $allRecords->where('student_id', $student->id);

            $present = $studentRecords->where('status', 'present')->count();
            $late = $studentRecords->where('status', 'late')->count();
            $absent = $studentRecords->where('status', 'absent')->count();
            $excused = $studentRecords->where('status', 'excused')->count();

            $totalAttended = $present + $late;
            $rate = $totalSessions > 0 ? round(($totalAttended / $totalSessions) * 100, 1) : 100.0;

            return [
                'id' => $student->id,
                'name' => $student->name,
                'identifier_number' => $student->identifier_number,
                'email' => $student->email,
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'excused' => $excused,
                'total_attended' => $totalAttended,
                'attendance_rate' => $rate,
            ];
        });

        // Overall stats
        $totalMarks = $allRecords->count();
        $overallPresent = $allRecords->whereIn('status', ['present', 'late'])->count();
        $overallRate = $totalMarks > 0 ? round(($overallPresent / $totalMarks) * 100, 1) : 0.0;

        return response()->json([
            'success' => true,
            'subject_info' => [
                'id' => $classSubject->id,
                'subject_name' => $classSubject->subject?->name ?? 'Subject',
                'subject_code' => $classSubject->subject?->code ?? 'SUBJ',
                'class_name' => $classSubject->classRoom?->name ?? 'Class',
                'class_code' => $classSubject->classRoom?->code ?? 'CLS',
                'teacher_name' => $classSubject->teacher?->name ?? $teacher->name,
                'room' => $classSubject->room,
                'schedule_day' => $classSubject->schedule_day,
                'period_label' => $filterLabel,
            ],
            'stats' => [
                'total_sessions' => $totalSessions,
                'total_students' => $enrollments->count(),
                'overall_rate' => $overallRate,
                'total_present' => $allRecords->where('status', 'present')->count(),
                'total_late' => $allRecords->where('status', 'late')->count(),
                'total_absent' => $allRecords->where('status', 'absent')->count(),
                'total_excused' => $allRecords->where('status', 'excused')->count(),
            ],
            'sessions' => $sessions->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'session_date' => $s->session_date,
                'status' => $s->status,
                'present_count' => $s->present_count,
                'total_count' => $s->attendance_records_count,
            ]),
            'students' => $studentsReport,
        ]);
    }
}
