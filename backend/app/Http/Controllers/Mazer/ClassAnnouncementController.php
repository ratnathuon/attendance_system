<?php

namespace App\Http\Controllers\Mazer;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
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
     * Post a new announcement to the classroom.
     */
    public function store(Request $request, ClassRoom $classRoom): JsonResponse
    {
        $mazer = $request->user();

        if ($classRoom->mazer_id !== $mazer->id && !$mazer->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Only the assigned Mazer or admin can broadcast announcements.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'priority' => ['nullable', 'string', 'in:normal,high,urgent'],
        ]);

        $newAnnouncement = [
            'id' => uniqid('ann_'),
            'title' => $validated['title'],
            'message' => $validated['message'],
            'priority' => $validated['priority'] ?? 'normal',
            'author_name' => $mazer->name,
            'created_at' => now()->toIso8601String(),
        ];

        $cacheKey = "class_announcements_{$classRoom->id}";
        $announcements = Cache::get($cacheKey, []);
        array_unshift($announcements, $newAnnouncement);

        // Keep last 50 announcements
        $announcements = array_slice($announcements, 0, 50);
        Cache::put($cacheKey, $announcements, now()->addDays(90));

        return response()->json([
            'success' => true,
            'message' => 'Announcement posted successfully to the class.',
            'data' => $newAnnouncement,
        ], 201);
    }
}
