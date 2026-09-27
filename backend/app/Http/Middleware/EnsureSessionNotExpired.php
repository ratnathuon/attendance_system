<?php

namespace App\Http\Middleware;

use App\Models\AttendanceSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSessionNotExpired
{
    /**
     * Handle an incoming request.
     * Ensures target attendance session is active and not expired.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $sessionId = $request->route('session') 
            ?? $request->route('attendance_session') 
            ?? $request->input('session_id') 
            ?? $request->input('attendance_session_id');

        if ($sessionId) {
            $session = $sessionId instanceof AttendanceSession 
                ? $sessionId 
                : AttendanceSession::find($sessionId);

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attendance session not found.',
                ], 404);
            }

            if ($session->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => "Attendance session is {$session->status} and no longer accepting check-ins.",
                ], 400);
            }

            if ($session->expires_at && now()->isAfter($session->expires_at)) {
                $session->update(['status' => 'closed']);
                return response()->json([
                    'success' => false,
                    'message' => 'Attendance session has expired.',
                ], 400);
            }
        }

        return $next($request);
    }
}
