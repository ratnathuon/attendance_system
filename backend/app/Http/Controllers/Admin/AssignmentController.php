<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssignmentController extends Controller
{
    /**
     * Get list of all class-subject assignments.
     */
    public function classSubjects(Request $request): JsonResponse
    {
        $query = ClassSubject::with([
            'classRoom:id,name,code',
            'subject:id,name,code',
            'teacher:id,name,email',
        ]);

        if ($request->filled('class_room_id')) {
            $query->where('class_room_id', $request->class_room_id);
        }

        if ($request->filled('teacher_id')) {
            $query->where('teacher_id', $request->teacher_id);
        }

        $assignments = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $assignments,
        ]);
    }

    /**
     * Assign teacher to a subject in a classroom.
     */
    public function assignTeacherToSubject(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_room_id' => ['required', 'integer', 'exists:class_rooms,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'teacher_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'teacher'),
            ],
            'schedule_day' => ['nullable', 'string'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string', 'max:50'],
        ]);

        $assignment = ClassSubject::updateOrCreate(
            [
                'class_room_id' => $validated['class_room_id'],
                'subject_id' => $validated['subject_id'],
            ],
            [
                'teacher_id' => $validated['teacher_id'],
                'schedule_day' => $validated['schedule_day'] ?? null,
                'start_time' => $validated['start_time'] ?? null,
                'end_time' => $validated['end_time'] ?? null,
                'room' => $validated['room'] ?? null,
            ]
        );

        $assignment->load(['classRoom', 'subject', 'teacher']);

        return response()->json([
            'success' => true,
            'message' => 'Teacher assigned to subject successfully.',
            'data' => $assignment,
        ]);
    }

    /**
     * Remove teacher/subject assignment.
     */
    public function removeClassSubject(ClassSubject $classSubject): JsonResponse
    {
        $classSubject->delete();

        return response()->json([
            'success' => true,
            'message' => 'Subject assignment removed.',
        ]);
    }

    /**
     * Assign or update a Mazer (homeroom advisor) for a classroom.
     */
    public function assignMazerToClass(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $validated = $request->validate([
            'mazer_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'mazer'),
            ],
        ]);

        $classRoom->update(['mazer_id' => $validated['mazer_id']]);
        $classRoom->load('mazer:id,name,email,phone');

        return response()->json([
            'success' => true,
            'message' => "Mazer assigned to {$classRoom->name}.",
            'data' => $classRoom,
        ]);
    }

    /**
     * Enroll students into a classroom.
     */
    public function enrollStudents(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => [
                'integer',
                Rule::exists('users', 'id')->where('role', 'student'),
            ],
            'academic_year' => ['nullable', 'string'],
        ]);

        $academicYear = $validated['academic_year'] ?? $classRoom->academic_year;
        $enrolledCount = 0;

        foreach ($validated['student_ids'] as $studentId) {
            Enrollment::updateOrCreate(
                [
                    'student_id' => $studentId,
                    'class_room_id' => $classRoom->id,
                    'academic_year' => $academicYear,
                ],
                [
                    'status' => 'active',
                    'enrolled_at' => now(),
                ]
            );
            $enrolledCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully enrolled {$enrolledCount} student(s) to {$classRoom->name}.",
        ]);
    }

    /**
     * Unenroll a student from a classroom.
     */
    public function unenrollStudent(ClassRoom $classRoom, User $student): JsonResponse
    {
        Enrollment::where('class_room_id', $classRoom->id)
            ->where('student_id', $student->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => "Student {$student->name} removed from {$classRoom->name}.",
        ]);
    }
}
