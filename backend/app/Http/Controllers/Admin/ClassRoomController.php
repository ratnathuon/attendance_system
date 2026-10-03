<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassRoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClassRoom::with(['mazer:id,name,email,phone'])
            ->withCount(['students', 'classSubjects']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('room_number', 'like', "%{$search}%");
            });
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->academic_year);
        }

        if ($request->filled('grade_level')) {
            $query->where('grade_level', $request->grade_level);
        }

        if ($request->filled('mazer_status')) {
            if ($request->mazer_status === 'assigned') {
                $query->whereNotNull('mazer_id');
            } elseif ($request->mazer_status === 'unassigned') {
                $query->whereNull('mazer_id');
            }
        }

        if ($request->filled('mazer_id')) {
            $query->where('mazer_id', $request->mazer_id);
        }

        $classes = $query->orderBy('name')->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $classes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', 'unique:class_rooms,code'],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'grade_level' => ['nullable', 'string', 'max:50'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'mazer_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        $classRoom = ClassRoom::create($validated);
        $classRoom->load('mazer:id,name,email');

        return response()->json([
            'success' => true,
            'message' => 'Class room created successfully.',
            'data' => $classRoom,
        ], 201);
    }

    public function show(ClassRoom $classRoom): JsonResponse
    {
        $classRoom->load([
            'mazer:id,name,email,phone',
            'students:id,name,email,identifier_number',
            'classSubjects.subject',
            'classSubjects.teacher:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $classRoom,
        ]);
    }

    public function update(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('class_rooms')->ignore($classRoom->id)],
            'academic_year' => ['nullable', 'string', 'max:20'],
            'grade_level' => ['nullable', 'string', 'max:50'],
            'room_number' => ['nullable', 'string', 'max:50'],
            'mazer_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string'],
        ]);

        $classRoom->update($validated);
        $classRoom->load('mazer:id,name,email');

        return response()->json([
            'success' => true,
            'message' => 'Class room updated successfully.',
            'data' => $classRoom,
        ]);
    }

    public function destroy(ClassRoom $classRoom): JsonResponse
    {
        $classRoom->delete();

        return response()->json([
            'success' => true,
            'message' => 'Class room deleted successfully.',
        ]);
    }
}
