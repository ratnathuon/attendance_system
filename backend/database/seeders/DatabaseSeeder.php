<?php

namespace Database\Seeders;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\LeaveRequest;
use App\Models\Subject;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('password123');

        // 1. Admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@attendance.com'],
            [
                'name' => 'System Administrator',
                'password' => $password,
                'role' => 'admin',
                'identifier_number' => 'ADM-001',
                'phone' => '+1-555-0100',
                'is_active' => true,
            ]
        );

        // 2. Teachers
        $teacher1 = User::firstOrCreate(
            ['email' => 'teacher@attendance.com'],
            [
                'name' => 'Prof. Marcus Vance',
                'password' => $password,
                'role' => 'teacher',
                'identifier_number' => 'TCH-101',
                'phone' => '+1-555-0101',
                'is_active' => true,
            ]
        );

        $teacher2 = User::firstOrCreate(
            ['email' => 'teacher2@attendance.com'],
            [
                'name' => 'Dr. Sarah Jenkins',
                'password' => $password,
                'role' => 'teacher',
                'identifier_number' => 'TCH-102',
                'phone' => '+1-555-0102',
                'is_active' => true,
            ]
        );

        // 3. Mazers (Homeroom Teachers / Class Advisors)
        $mazer1 = User::firstOrCreate(
            ['email' => 'mazer@attendance.com'],
            [
                'name' => 'Elena Rostova',
                'password' => $password,
                'role' => 'mazer',
                'identifier_number' => 'MZR-201',
                'phone' => '+1-555-0201',
                'is_active' => true,
            ]
        );

        $mazer2 = User::firstOrCreate(
            ['email' => 'mazer2@attendance.com'],
            [
                'name' => 'Kenji Sato',
                'password' => $password,
                'role' => 'mazer',
                'identifier_number' => 'MZR-202',
                'phone' => '+1-555-0202',
                'is_active' => true,
            ]
        );

        // 4. Students
        $student1 = User::firstOrCreate(
            ['email' => 'student@attendance.com'],
            [
                'name' => 'Alex Morgan',
                'password' => $password,
                'role' => 'student',
                'identifier_number' => 'STU-9001',
                'phone' => '+1-555-0301',
                'is_active' => true,
            ]
        );

        $student2 = User::firstOrCreate(
            ['email' => 'student2@attendance.com'],
            [
                'name' => 'Chloe Bennett',
                'password' => $password,
                'role' => 'student',
                'identifier_number' => 'STU-9002',
                'phone' => '+1-555-0302',
                'is_active' => true,
            ]
        );

        $student3 = User::firstOrCreate(
            ['email' => 'student3@attendance.com'],
            [
                'name' => 'David Kim',
                'password' => $password,
                'role' => 'student',
                'identifier_number' => 'STU-9003',
                'phone' => '+1-555-0303',
                'is_active' => true,
            ]
        );

        $student4 = User::firstOrCreate(
            ['email' => 'student4@attendance.com'],
            [
                'name' => 'Emma Watson',
                'password' => $password,
                'role' => 'student',
                'identifier_number' => 'STU-9004',
                'phone' => '+1-555-0304',
                'is_active' => true,
            ]
        );

        // 5. Classes
        $classA = ClassRoom::firstOrCreate(
            ['code' => 'CLS-10A'],
            [
                'name' => 'Class 10-A (Science)',
                'academic_year' => '2025/2026',
                'grade_level' => 'Grade 10',
                'room_number' => 'Room 204',
                'mazer_id' => $mazer1->id,
                'description' => 'Science and Technology focus stream',
            ]
        );

        $classB = ClassRoom::firstOrCreate(
            ['code' => 'CLS-10B'],
            [
                'name' => 'Class 10-B (Arts & Humanities)',
                'academic_year' => '2025/2026',
                'grade_level' => 'Grade 10',
                'room_number' => 'Room 205',
                'mazer_id' => $mazer2->id,
                'description' => 'Arts and Social Sciences track',
            ]
        );

        $classCS = ClassRoom::firstOrCreate(
            ['code' => 'CS-Y3'],
            [
                'name' => 'Computer Science Year 3',
                'academic_year' => '2025/2026',
                'grade_level' => 'Undergraduate 3',
                'room_number' => 'Lab B-02',
                'mazer_id' => $mazer1->id,
                'description' => 'Software engineering cohort',
            ]
        );

        // 6. Subjects
        $subjMath = Subject::firstOrCreate(
            ['code' => 'MATH-301'],
            ['name' => 'Advanced Mathematics', 'credit_hours' => 4, 'description' => 'Calculus, linear algebra, and discrete math']
        );

        $subjAlgo = Subject::firstOrCreate(
            ['code' => 'CS-201'],
            ['name' => 'Algorithms & Data Structures', 'credit_hours' => 3, 'description' => 'Core computing fundamentals and complexity']
        );

        $subjDb = Subject::firstOrCreate(
            ['code' => 'CS-202'],
            ['name' => 'Database Engineering', 'credit_hours' => 3, 'description' => 'Relational schemas, SQL tuning, indexing, and ACID']
        );

        $subjPhys = Subject::firstOrCreate(
            ['code' => 'PHY-101'],
            ['name' => 'Applied Physics', 'credit_hours' => 3, 'description' => 'Classical mechanics and electrodynamics']
        );

        // 7. Class Subject Assignments
        $assign1 = ClassSubject::updateOrCreate(
            ['class_room_id' => $classA->id, 'subject_id' => $subjMath->id],
            ['teacher_id' => $teacher1->id, 'schedule_day' => 'Monday', 'start_time' => '08:00', 'end_time' => '09:30', 'room' => 'Hall A']
        );

        $assign2 = ClassSubject::updateOrCreate(
            ['class_room_id' => $classA->id, 'subject_id' => $subjAlgo->id],
            ['teacher_id' => $teacher2->id, 'schedule_day' => 'Tuesday', 'start_time' => '10:00', 'end_time' => '11:30', 'room' => 'Lab 3']
        );

        $assign3 = ClassSubject::updateOrCreate(
            ['class_room_id' => $classB->id, 'subject_id' => $subjDb->id],
            ['teacher_id' => $teacher1->id, 'schedule_day' => 'Wednesday', 'start_time' => '13:00', 'end_time' => '14:30', 'room' => 'Hall C']
        );

        $assign4 = ClassSubject::updateOrCreate(
            ['class_room_id' => $classCS->id, 'subject_id' => $subjAlgo->id],
            ['teacher_id' => $teacher2->id, 'schedule_day' => 'Thursday', 'start_time' => '09:00', 'end_time' => '11:00', 'room' => 'Lab B-02']
        );

        // 8. Enrollments
        Enrollment::updateOrCreate(
            ['student_id' => $student1->id, 'class_room_id' => $classA->id, 'academic_year' => '2025/2026'],
            ['status' => 'active', 'enrolled_at' => Carbon::now()->subMonths(2)]
        );

        Enrollment::updateOrCreate(
            ['student_id' => $student2->id, 'class_room_id' => $classA->id, 'academic_year' => '2025/2026'],
            ['status' => 'active', 'enrolled_at' => Carbon::now()->subMonths(2)]
        );

        Enrollment::updateOrCreate(
            ['student_id' => $student3->id, 'class_room_id' => $classB->id, 'academic_year' => '2025/2026'],
            ['status' => 'active', 'enrolled_at' => Carbon::now()->subMonths(2)]
        );

        Enrollment::updateOrCreate(
            ['student_id' => $student4->id, 'class_room_id' => $classB->id, 'academic_year' => '2025/2026'],
            ['status' => 'active', 'enrolled_at' => Carbon::now()->subMonths(2)]
        );

        // 9. Active Attendance Session for Today
        $activeSession = AttendanceSession::firstOrCreate(
            ['class_subject_id' => $assign1->id, 'session_date' => Carbon::today()->toDateString(), 'status' => 'active'],
            [
                'teacher_id' => $teacher1->id,
                'title' => 'Advanced Math - Real Analysis & Series',
                'start_time' => now(),
                'expires_at' => now()->addMinutes(90),
                'qr_secret' => Str::random(64),
                'qr_refresh_seconds' => 15,
                'allow_late' => true,
                'late_threshold_minutes' => 15,
                'room' => 'Hall A',
                'notes' => 'Please bring scientific calculators for problem set 4.',
            ]
        );

        // Mark Alex Morgan present in active session
        AttendanceRecord::firstOrCreate(
            ['attendance_session_id' => $activeSession->id, 'student_id' => $student1->id],
            [
                'status' => 'present',
                'scanned_at' => now()->subMinutes(5),
                'method' => 'qr_scan',
                'device_info' => 'Flutter Mobile (Pixel 7)',
                'ip_address' => '10.0.2.2',
                'remarks' => 'Checked in at on-time scan',
            ]
        );

        // 10. Sample Past Session & Attendance History
        $pastSession = AttendanceSession::firstOrCreate(
            ['class_subject_id' => $assign1->id, 'session_date' => Carbon::yesterday()->toDateString()],
            [
                'teacher_id' => $teacher1->id,
                'title' => 'Advanced Math - Integration Review',
                'start_time' => Carbon::yesterday()->setHour(8)->setMinute(0),
                'end_time' => Carbon::yesterday()->setHour(9)->setMinute(30),
                'expires_at' => Carbon::yesterday()->setHour(9)->setMinute(30),
                'status' => 'closed',
                'qr_secret' => Str::random(64),
                'qr_refresh_seconds' => 15,
                'room' => 'Hall A',
            ]
        );

        AttendanceRecord::firstOrCreate(
            ['attendance_session_id' => $pastSession->id, 'student_id' => $student1->id],
            ['status' => 'present', 'scanned_at' => Carbon::yesterday()->setHour(8)->setMinute(5), 'method' => 'qr_scan']
        );

        AttendanceRecord::firstOrCreate(
            ['attendance_session_id' => $pastSession->id, 'student_id' => $student2->id],
            ['status' => 'late', 'scanned_at' => Carbon::yesterday()->setHour(8)->setMinute(22), 'method' => 'qr_scan', 'remarks' => 'Scanned after 15m threshold']
        );

        // 11. Sample Leave Request
        LeaveRequest::firstOrCreate(
            [
                'student_id' => $student2->id,
                'class_room_id' => $classA->id,
                'start_date' => Carbon::today()->toDateString(),
            ],
            [
                'subject_id' => $subjMath->id,
                'attendance_session_id' => $activeSession->id,
                'leave_type' => 'sick',
                'end_date' => Carbon::today()->addDay()->toDateString(),
                'reason' => 'Severe fever and doctor recommended 2 days bed rest.',
                'status' => 'pending_mazer',
                'mazer_approval' => 'pending',
                'teacher_approval' => 'pending',
            ]
        );
    }
}
