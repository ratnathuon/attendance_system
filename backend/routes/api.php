<?php

use App\Http\Controllers\Admin\AssignmentController;
use App\Http\Controllers\Admin\ClassRoomController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Admin\SystemReportController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Mazer\ClassAnnouncementController;
use App\Http\Controllers\Mazer\ClassAttendanceController;
use App\Http\Controllers\Mazer\MazerLeaveApprovalController;
use App\Http\Controllers\Student\AttendanceScanController;
use App\Http\Controllers\Student\LeaveRequestController;
use App\Http\Controllers\Student\StudentHistoryController;
use App\Http\Controllers\Teacher\AttendanceSessionController;
use App\Http\Controllers\Teacher\SubjectAttendanceController;
use App\Http\Controllers\Teacher\TeacherLeaveApprovalController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Authentication
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth Profile
    Route::prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // -------------------------------------------------------------------------
    // ADMIN ENDPOINTS
    // -------------------------------------------------------------------------
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        // Users Management
        Route::apiResource('users', UserController::class);

        // Classes Management
        Route::apiResource('classes', ClassRoomController::class);

        // Subjects Management
        Route::apiResource('subjects', SubjectController::class);

        // Assignments & Enrollments
        Route::get('/assignments', [AssignmentController::class, 'classSubjects']);
        Route::post('/assignments/teacher', [AssignmentController::class, 'assignTeacherToSubject']);
        Route::delete('/assignments/{classSubject}', [AssignmentController::class, 'removeClassSubject']);
        Route::post('/classes/{classRoom}/assign-mazer', [AssignmentController::class, 'assignMazerToClass']);
        Route::post('/classes/{classRoom}/enroll', [AssignmentController::class, 'enrollStudents']);
        Route::delete('/classes/{classRoom}/students/{student}', [AssignmentController::class, 'unenrollStudent']);

        // System Reports & Analytics
        Route::get('/reports/overview', [SystemReportController::class, 'dashboardOverview']);
        Route::get('/reports/attendance', [SystemReportController::class, 'attendanceReport']);
    });

    // -------------------------------------------------------------------------
    // TEACHER ENDPOINTS
    // -------------------------------------------------------------------------
    Route::prefix('teacher')->middleware('role:teacher,admin')->group(function () {
        // Sessions & Dynamic QR
        Route::get('/sessions', [AttendanceSessionController::class, 'index']);
        Route::post('/sessions', [AttendanceSessionController::class, 'store']);
        Route::get('/sessions/{session}/qr', [AttendanceSessionController::class, 'getQrToken']);
        Route::post('/sessions/{session}/close', [AttendanceSessionController::class, 'close']);
        Route::get('/sessions/{session}/records', [AttendanceSessionController::class, 'sessionRecords']);

        // Manual Attendance Mark / Override
        Route::post('/sessions/{session}/attendance', [SubjectAttendanceController::class, 'markAttendance']);
        Route::post('/sessions/{session}/batch-attendance', [SubjectAttendanceController::class, 'batchMark']);

        // Teacher Leave Approvals
        Route::get('/leave-requests', [TeacherLeaveApprovalController::class, 'index']);
        Route::post('/leave-requests/{leaveRequest}/status', [TeacherLeaveApprovalController::class, 'updateStatus']);
    });

    // -------------------------------------------------------------------------
    // MAZER ENDPOINTS (Class Advisor / Homeroom)
    // -------------------------------------------------------------------------
    Route::prefix('mazer')->middleware('role:mazer,admin')->group(function () {
        // Class Attendance Roster & Override
        Route::get('/classes/{classRoom}/roster', [ClassAttendanceController::class, 'classRoster']);
        Route::post('/classes/{classRoom}/override', [ClassAttendanceController::class, 'overrideRecord']);

        // 1st Level Leave Request Approvals
        Route::get('/leave-requests', [MazerLeaveApprovalController::class, 'index']);
        Route::post('/leave-requests/{leaveRequest}/status', [MazerLeaveApprovalController::class, 'updateStatus']);

        // Announcements
        Route::get('/classes/{classRoom}/announcements', [ClassAnnouncementController::class, 'index']);
        Route::post('/classes/{classRoom}/announcements', [ClassAnnouncementController::class, 'store']);
    });

    // -------------------------------------------------------------------------
    // STUDENT ENDPOINTS
    // -------------------------------------------------------------------------
    Route::prefix('student')->middleware('role:student,admin')->group(function () {
        // Dynamic QR Scan Check-in
        Route::post('/scan', [AttendanceScanController::class, 'scan'])->middleware('session.valid');

        // History & Statistics
        Route::get('/history', [StudentHistoryController::class, 'index']);
        Route::get('/stats', [StudentHistoryController::class, 'stats']);

        // Leave Requests
        Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
        Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
        Route::get('/leave-requests/{leaveRequest}', [LeaveRequestController::class, 'show']);
    });
});
