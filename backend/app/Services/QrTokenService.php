<?php

namespace App\Services;

use App\Models\AttendanceSession;

class QrTokenService
{
    /**
     * Generate the dynamic QR token payload for an active session.
     */
    public function generateToken(AttendanceSession $session): array
    {
        $refreshInterval = $session->qr_refresh_seconds ?: 15;
        $now = time();
        $step = (int) floor($now / $refreshInterval);
        
        $signature = hash_hmac(
            'sha256',
            "{$session->id}:{$step}",
            $session->qr_secret
        );
        $shortToken = substr($signature, 0, 32);

        $nextRefreshAt = ($step + 1) * $refreshInterval;
        $remainingSeconds = max(1, $nextRefreshAt - $now);

        $payload = [
            'type' => 'attendance_qr',
            'session_id' => $session->id,
            'step' => $step,
            'token' => $shortToken,
            'timestamp' => $now,
            'expires_in' => $remainingSeconds,
            'refresh_interval' => $refreshInterval,
        ];

        return [
            'raw_token' => $shortToken,
            'step' => $step,
            'expires_in' => $remainingSeconds,
            'qr_payload' => json_encode($payload),
            'qr_string' => base64_encode(json_encode($payload)),
        ];
    }

    /**
     * Validate an incoming scanned token against the session secret and time-stepped window.
     */
    public function validateToken(AttendanceSession $session, string $token, int $step): bool
    {
        if ($session->status !== 'active') {
            return false;
        }

        if ($session->expires_at && now()->isAfter($session->expires_at)) {
            return false;
        }

        $refreshInterval = $session->qr_refresh_seconds ?: 15;
        $currentStep = (int) floor(time() / $refreshInterval);

        // Allow current step and previous 1 step to tolerate scan/network latency
        $validSteps = [$currentStep, $currentStep - 1];

        if (!in_array($step, $validSteps, true)) {
            return false;
        }

        $expectedSignature = substr(
            hash_hmac('sha256', "{$session->id}:{$step}", $session->qr_secret),
            0,
            32
        );

        return hash_equals($expectedSignature, $token);
    }
}
