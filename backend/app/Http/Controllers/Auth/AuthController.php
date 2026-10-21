<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account is deactivated. Please contact your administrator.',
            ], 403);
        }

        $deviceName = $request->device_name ?: 'auth-token';
        $token = $user->createToken($deviceName)->plainTextToken;

        // Load relevant context based on role
        $extraData = [];
        if ($user->isMazer()) {
            $extraData['advised_classes'] = $user->advisedClassRooms()->select('id', 'name', 'code')->get();
        } elseif ($user->isTeacher()) {
            $extraData['taught_subjects'] = $user->taughtClassSubjects()->with(['classRoom:id,name,code', 'subject:id,name,code'])->get();
        } elseif ($user->isStudent()) {
            $enrollment = $user->enrollments()->with('classRoom:id,name,code')->where('status', 'active')->first();
            $classRoom = $enrollment?->classRoom ?? $user->enrollments()->with('classRoom:id,name,code')->first()?->classRoom ?? ClassRoom::first();
            $extraData['enrolled_class'] = $classRoom ? $classRoom->only(['id', 'name', 'code']) : null;
            $enrolledIds = $user->enrollments()->where('status', 'active')->pluck('class_room_id')->filter()->unique();
            if ($enrolledIds->isEmpty()) {
                $enrolledIds = $user->enrollments()->pluck('class_room_id')->filter()->unique();
            }
            if ($enrolledIds->isEmpty()) {
                $enrolledIds = ClassRoom::pluck('id');
            }
            $annCount = 0;
            foreach ($enrolledIds as $cId) {
                $annCount += count(Cache::get("class_announcements_{$cId}", []));
            }
            if ($annCount === 0 && ClassRoom::count() > 0) {
                foreach (ClassRoom::pluck('id') as $cId) {
                    $annCount += count(Cache::get("class_announcements_{$cId}", []));
                }
            }
            $extraData['announcements_count'] = $annCount;
        }

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'identifier_number' => $user->identifier_number,
                'phone' => $user->phone,
                'avatar_url' => $user->avatar_url,
            ],
            'meta' => $extraData,
        ]);
    }

    /**
     * Get currently authenticated user details.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $extraData = [];
        if ($user->isMazer()) {
            $advisedClasses = $user->advisedClassRooms()->select('id', 'name', 'code', 'room_number')->get();
            $extraData['advised_classes'] = $advisedClasses;
            $classRoomIds = $advisedClasses->pluck('id');
            $extraData['leave_requests_count'] = \App\Models\LeaveRequest::whereIn('class_room_id', $classRoomIds)->count();
            $extraData['pending_leave_count'] = \App\Models\LeaveRequest::whereIn('class_room_id', $classRoomIds)->where('status', 'pending')->count();
            $totalAnnouncements = 0;
            foreach ($classRoomIds as $cId) {
                $totalAnnouncements += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
            }
            $extraData['announcements_count'] = $totalAnnouncements;
            $extraData['my_leave_requests_count'] = \App\Models\LeaveRequest::where('student_id', $user->id)->count();
        } elseif ($user->isTeacher()) {
            $taughtSubjects = $user->taughtClassSubjects()->with(['classRoom:id,name,code', 'subject:id,name,code'])->get();
            $extraData['taught_subjects'] = $taughtSubjects;
            $classRoomIds = $taughtSubjects->pluck('class_room_id')->unique();
            $totalAnnouncements = 0;
            foreach ($classRoomIds as $cId) {
                $totalAnnouncements += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
            }
            $extraData['announcements_count'] = $totalAnnouncements;
        } elseif ($user->isStudent()) {
            $enrollment = $user->enrollments()->with('classRoom:id,name,code')->where('status', 'active')->first();
            $classRoom = $enrollment?->classRoom ?? $user->enrollments()->with('classRoom:id,name,code')->first()?->classRoom ?? ClassRoom::first();
            $extraData['enrolled_class'] = $classRoom ? $classRoom->only(['id', 'name', 'code']) : null;
            $enrolledIds = $user->enrollments()->where('status', 'active')->pluck('class_room_id')->filter()->unique();
            if ($enrolledIds->isEmpty()) {
                $enrolledIds = $user->enrollments()->pluck('class_room_id')->filter()->unique();
            }
            if ($enrolledIds->isEmpty()) {
                $enrolledIds = ClassRoom::pluck('id');
            }
            $annCount = 0;
            foreach ($enrolledIds as $cId) {
                $annCount += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
            }
            if ($annCount === 0 && ClassRoom::count() > 0) {
                foreach (ClassRoom::pluck('id') as $cId) {
                    $annCount += count(\Illuminate\Support\Facades\Cache::get("class_announcements_{$cId}", []));
                }
            }
            $extraData['announcements_count'] = $annCount;
        }

        return response()->json([
            'success' => true,
            'user' => $user,
            'meta' => $extraData,
        ]);
    }

    /**
     * Revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Update the authenticated user's editable profile fields.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $user = $request->user();
        $user->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Upload / replace the authenticated user's profile picture.
     */
    public function updateAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:4096'],
        ]);

        $user = $request->user();
        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update([
            'avatar_url' => $request->getSchemeAndHttpHost() . '/storage/' . $path,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile picture updated.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'different:current_password'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => $request->new_password]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }
}
