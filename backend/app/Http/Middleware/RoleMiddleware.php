<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     * Accepts one or more comma/pipe separated roles: 'admin', 'admin|teacher', etc.
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        // Flatten roles if passed like "admin,teacher" or multiple arguments
        $allowedRoles = [];
        foreach ($roles as $role) {
            foreach (preg_split('/[,|]/', $role) as $r) {
                $allowedRoles[] = trim($r);
            }
        }

        if (!in_array($user->role, $allowedRoles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. You do not have permission to access this resource.',
                'required_roles' => $allowedRoles,
                'current_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}
