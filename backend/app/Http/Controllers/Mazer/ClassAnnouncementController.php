<?php

namespace App\Http\Controllers\Mazer;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ClassAnnouncementController extends Controller
{
    /**
     * List announcements for a class room.
     */
    public function index(ClassRoom $classRoom): JsonResponse
    {
        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);

        return response()->json([
            'success' => true,
            'class_room' => $classRoom->only(['id', 'name', 'code']),
            'data' => $announcements,
        ]);
    }

    /**
     * List announcements for the authenticated student's enrolled classroom.
     */
    public function studentAnnouncements(Request $request): JsonResponse
    {
        $user = $request->user();
        $enrollment = $user->enrollments()->with('classRoom')->where('status', 'active')->first();
        $classRoom = $enrollment?->classRoom;

        if (!$classRoom) {
            $classRoom = $user->enrollments()->with('classRoom')->first()?->classRoom ?? ClassRoom::first();
        }

        if (!$classRoom) {
            return response()->json([
                'success' => true,
                'class_room' => null,
                'data' => [],
            ]);
        }

        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);

        return response()->json([
            'success' => true,
            'class_room' => $classRoom->only(['id', 'name', 'code']),
            'data' => $announcements,
        ]);
    }

    /**
     * List all announcements across classes for Admin Console.
     */
    public function allAdmin(Request $request): JsonResponse
    {
        $classes = ClassRoom::select('id', 'name', 'code', 'room_number')->get();
        $allAnnouncements = [];

        foreach ($classes as $class) {
            $cacheKey = "class_announcements_{$class->id}";
            $items = Cache::get($cacheKey, []);
            foreach ($items as $item) {
                $item['class_room'] = $class->only(['id', 'name', 'code']);
                $item['class_room_id'] = $class->id;
                $allAnnouncements[] = $item;
            }
        }

        // Sort by created_at desc
        usort($allAnnouncements, function ($a, $b) {
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });

        if ($request->filled('class_room_id')) {
            $cId = (int) $request->class_room_id;
            $allAnnouncements = array_values(array_filter($allAnnouncements, fn ($a) => ($a['class_room_id'] ?? 0) === $cId));
        }

        return response()->json([
            'success' => true,
            'classes' => $classes,
            'data' => $allAnnouncements,
        ]);
    }

    /**
     * List announcements for classrooms taught by the authenticated Teacher.
     */
    public function teacherAnnouncements(Request $request): JsonResponse
    {
        $teacher = $request->user();
        $classRoomIds = ClassSubject::where('teacher_id', $teacher->id)->pluck('class_room_id')->unique();
        $classes = ClassRoom::whereIn('id', $classRoomIds)->select('id', 'name', 'code', 'room_number')->get();

        if ($classes->isEmpty() && $teacher->isAdmin()) {
            $classes = ClassRoom::select('id', 'name', 'code', 'room_number')->get();
        }

        $allAnnouncements = [];
        foreach ($classes as $class) {
            $cacheKey = "class_announcements_{$class->id}";
            $items = Cache::get($cacheKey, []);
            foreach ($items as $item) {
                $item['class_room'] = $class->only(['id', 'name', 'code']);
                $item['class_room_id'] = $class->id;
                $allAnnouncements[] = $item;
            }
        }

        usort($allAnnouncements, function ($a, $b) {
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });

        if ($request->filled('class_room_id')) {
            $cId = (int) $request->class_room_id;
            $allAnnouncements = array_values(array_filter($allAnnouncements, fn ($a) => ($a['class_room_id'] ?? 0) === $cId));
        }

        return response()->json([
            'success' => true,
            'classes' => $classes,
            'data' => $allAnnouncements,
        ]);
    }

    /**
     * Post a new announcement to the classroom.
     */
    public function store(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $user = $request->user();

        $teachesClass = ClassSubject::where('class_room_id', $classRoom->id)
            ->where('teacher_id', $user->id)
            ->exists();

        if ($classRoom->mazer_id !== $user->id && !$user->isAdmin() && !$teachesClass) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only the assigned Mazer, class teacher, or admin can broadcast announcements.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'priority' => ['nullable', 'string', 'in:normal,high,urgent'],
        ]);

        $roleSuffix = $user->isTeacher() ? ' (Teacher)' : ($user->isMazer() ? ' (Mazer)' : ($user->isAdmin() ? ' (Admin)' : ''));
        $newAnnouncement = [
            'id' => uniqid('ann_'),
            'title' => $validated['title'],
            'message' => $validated['message'],
            'priority' => $validated['priority'] ?? 'normal',
            'author_name' => $user->name . $roleSuffix,
            'author_role' => $user->role,
            'author_id' => $user->id,
            'created_at' => now()->toIso8601String(),
        ];

        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);
        array_unshift($announcements, $newAnnouncement);

        // Keep last 50 announcements
        $announcements = array_slice($announcements, 0, 50);
        Cache::put($cacheKey, $announcements, now()->addDays(90));

        $newAnnouncement['class_room'] = $classRoom->only(['id', 'name', 'code']);
        $newAnnouncement['class_room_id'] = $classRoom->id;

        return response()->json([
            'success' => true,
            'message' => 'Announcement posted successfully to the class.',
            'data' => $newAnnouncement,
        ], 201);
    }

    /**
     * Update an existing announcement.
     */
    public function update(Request $request, ClassRoom $classRoom, string $announcementId): JsonResponse
    {
        $user = $request->user();

        $teachesClass = ClassSubject::where('class_room_id', $classRoom->id)
            ->where('teacher_id', $user->id)
            ->exists();

        if ($classRoom->mazer_id !== $user->id && !$user->isAdmin() && !$teachesClass) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only the assigned Mazer, class teacher, or admin can edit announcements.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'priority' => ['nullable', 'string', 'in:normal,high,urgent'],
        ]);

        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);
        $foundIndex = -1;

        foreach ($announcements as $idx => $item) {
            if (($item['id'] ?? '') === $announcementId) {
                $foundIndex = $idx;
                break;
            }
        }

        if ($foundIndex === -1) {
            return response()->json([
                'success' => false,
                'message' => 'Announcement not found.',
            ], 404);
        }

        $announcements[$foundIndex]['title'] = $validated['title'];
        $announcements[$foundIndex]['message'] = $validated['message'];
        if (isset($validated['priority'])) {
            $announcements[$foundIndex]['priority'] = $validated['priority'];
        }
        $announcements[$foundIndex]['updated_at'] = now()->toIso8601String();

        Cache::put($cacheKey, $announcements, now()->addDays(90));

        $updatedItem = $announcements[$foundIndex];
        $updatedItem['class_room'] = $classRoom->only(['id', 'name', 'code']);
        $updatedItem['class_room_id'] = $classRoom->id;

        return response()->json([
            'success' => true,
            'message' => 'Announcement updated successfully.',
            'data' => $updatedItem,
        ]);
    }

    /**
     * Delete an announcement.
     */
    public function destroy(Request $request, ClassRoom $classRoom, string $announcementId): JsonResponse
    {
        $user = $request->user();

        $teachesClass = ClassSubject::where('class_room_id', $classRoom->id)
            ->where('teacher_id', $user->id)
            ->exists();

        if ($classRoom->mazer_id !== $user->id && !$user->isAdmin() && !$teachesClass) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only the assigned Mazer, class teacher, or admin can remove announcements.',
            ], 403);
        }

        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);
        $initialCount = count($announcements);

        $announcements = array_values(array_filter($announcements, function ($item) use ($announcementId) {
            return ($item['id'] ?? '') !== $announcementId;
        }));

        if (count($announcements) === $initialCount) {
            return response()->json([
                'success' => false,
                'message' => 'Announcement not found.',
            ], 404);
        }

        Cache::put($cacheKey, $announcements, now()->addDays(90));

        return response()->json([
            'success' => true,
            'message' => 'Announcement deleted successfully.',
        ]);
    }
}
