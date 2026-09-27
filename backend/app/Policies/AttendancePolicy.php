<?php

namespace App\Policies;

use App\Models\AttendanceSession;
use App\Models\ClassRoom;
use App\Models\User;

class AttendancePolicy
{
    /**
     * Admin has full bypass.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can manage the given attendance session.
     */
    public function manageSession(User $user, AttendanceSession $session): bool
    {
        return $user->id === $session->teacher_id;
    }

    /**
     * Determine whether the user can view or override class attendance.
     */
    public function manageClassRoster(User $user, ClassRoom $classRoom): bool
    {
        if ($user->isMazer() && $classRoom->mazer_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can mark attendance for a session.
     */
    public function markSubjectAttendance(User $user, AttendanceSession $session): bool
    {
        return $user->id === $session->teacher_id;
    }
}
