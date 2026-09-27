<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ScanAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'student';
    }

    public function rules(): array
    {
        return [
            'session_id' => ['required', 'integer', 'exists:attendance_sessions,id'],
            'token' => ['required', 'string'],
            'step' => ['required', 'integer'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'device_info' => ['nullable', 'string', 'max:255'],
        ];
    }
}
