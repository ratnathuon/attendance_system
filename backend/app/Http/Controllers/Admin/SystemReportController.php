<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassRoom;
use App\Models\Subject;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SystemReportController extends Controller
{
    /**
     * High-level statistics overview for dashboard.
     */
    public function dashboardOverview(): JsonResponse
    {
        $today = Carbon::today();

        $totalStudents = User::where('role', 'student')->where('is_active', true)->count();
        $totalTeachers = User::where('role', 'teacher')->where('is_active', true)->count();
        $totalMazers = User::where('role', 'mazer')->where('is_active', true)->count();
        $totalClasses = ClassRoom::count();
        $totalSubjects = Subject::count();

        $activeSessionsCount = AttendanceSession::where('status', 'active')
            ->whereDate('session_date', $today)
            ->count();

        // Today's attendance records
        $todayRecords = AttendanceRecord::whereHas('attendanceSession', function ($q) use ($today) {
            $q->whereDate('session_date', $today);
        });

        $todayPresent = (clone $todayRecords)->where('status', 'present')->count();
        $todayLate = (clone $todayRecords)->where('status', 'late')->count();
        $todayAbsent = (clone $todayRecords)->where('status', 'absent')->count();
        $todayExcused = (clone $todayRecords)->where('status', 'excused')->count();
        $todayTotal = $todayPresent + $todayLate + $todayAbsent + $todayExcused;

        $overallRate = $todayTotal > 0 
            ? round((($todayPresent + $todayLate) / $todayTotal) * 100, 1) 
            : 0.0;

        // Recent 7 days trend
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dateStr = $date->format('Y-m-d');
            
            $dayRecords = AttendanceRecord::whereHas('attendanceSession', function ($q) use ($date) {
                $q->whereDate('session_date', $date);
            });

            $p = (clone $dayRecords)->whereIn('status', ['present', 'late'])->count();
            $a = (clone $dayRecords)->where('status', 'absent')->count();
            $e = (clone $dayRecords)->where('status', 'excused')->count();
            $total = $p + $a + $e;

            $trend[] = [
                'date' => $dateStr,
                'day' => $date->format('D'),
                'present' => $p,
                'absent' => $a,
                'excused' => $e,
                'rate' => $total > 0 ? round(($p / $total) * 100, 1) : 0,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'counts' => [
                    'students' => $totalStudents,
                    'teachers' => $totalTeachers,
                    'mazers' => $totalMazers,
                    'classes' => $totalClasses,
                    'subjects' => $totalSubjects,
                    'active_sessions' => $activeSessionsCount,
                ],
                'today' => [
                    'attendance_rate' => $overallRate,
                    'present' => $todayPresent,
                    'late' => $todayLate,
                    'absent' => $todayAbsent,
                    'excused' => $todayExcused,
                    'total_marks' => $todayTotal,
                ],
                'attendance_trend' => $trend,
            ],
        ]);
    }

    /**
     * Institution attendance report by class, subject, or date range.
     */
    public function attendanceReport(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', Carbon::today()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::today()->toDateString());

        $query = AttendanceRecord::with([
            'student:id,name,email,identifier_number',
            'attendanceSession.classSubject.classRoom:id,name,code',
            'attendanceSession.classSubject.subject:id,name,code',
            'attendanceSession.teacher:id,name',
        ])->whereHas('attendanceSession', function ($q) use ($startDate, $endDate, $request) {
            $q->whereBetween('session_date', [$startDate, $endDate]);

            if ($request->filled('class_room_id')) {
                $q->whereHas('classSubject', function ($cs) use ($request) {
                    $cs->where('class_room_id', $request->class_room_id);
                });
            }

            if ($request->filled('subject_id')) {
                $q->whereHas('classSubject', function ($cs) use ($request) {
                    $cs->where('subject_id', $request->subject_id);
                });
            }
        });

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $records = $query->orderBy('scanned_at', 'desc')->paginate($request->integer('per_page', 25));

        return response()->json([
            'success' => true,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'data' => $records,
        ]);
    }
}
