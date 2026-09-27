<?php

namespace App\Policies;

use App\Models\LeaveRequest;
use App\Models\User;

class LeaveRequestPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can approve as Mazer (1st tier).
     */
    public function approveMazer(User $user, LeaveRequest $leaveRequest): bool
    {
        if (!$user->isMazer()) {
            return false;
        }

        return $leaveRequest->classRoom && $leaveRequest->classRoom->mazer_id === $user->id;
    }

    /**
     * Determine whether the user can approve as Teacher (2nd tier or subject teacher).
     */
    public function approveTeacher(User $user, LeaveRequest $leaveRequest): bool
    {
        if (!$user->isTeacher()) {
            return false;
        }

        if ($leaveRequest->attendanceSession) {
            return $leaveRequest->attendanceSession->teacher_id === $user->id;
        }

        return true;
    }

    /**
     * Determine whether the user can view the leave request.
     */
    public function view(User $user, LeaveRequest $leaveRequest): bool
    {
        if ($user->id === $leaveRequest->student_id) {
            return true;
        }

        if ($user->isMazer() && $leaveRequest->classRoom && $leaveRequest->classRoom->mazer_id === $user->id) {
            return true;
        }

        if ($user->isTeacher()) {
            return true;
        }

        return false;
    }
}
