<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            $extraData['enrolled_class'] = $enrollment?->classRoom;
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
            $extraData['advised_classes'] = $user->advisedClassRooms()->select('id', 'name', 'code', 'room_number')->get();
        } elseif ($user->isTeacher()) {
            $extraData['taught_subjects'] = $user->taughtClassSubjects()->with(['classRoom:id,name,code', 'subject:id,name,code'])->get();
        } elseif ($user->isStudent()) {
            $enrollment = $user->enrollments()->with('classRoom:id,name,code')->where('status', 'active')->first();
            $extraData['enrolled_class'] = $enrollment?->classRoom;
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
}
