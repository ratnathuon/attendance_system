<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && in_array($this->user()->role, ['admin', 'teacher'], true);
    }

    public function rules(): array
    {
        return [
            'class_subject_id' => ['required', 'integer', 'exists:class_subject,id'],
            'session_date' => ['nullable', 'date'],
            'title' => ['nullable', 'string', 'max:255'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:360'],
            'qr_refresh_seconds' => ['nullable', 'integer', 'min:5', 'max:60'],
            'allow_late' => ['nullable', 'boolean'],
            'late_threshold_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
            'room' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'radius_meters' => ['nullable', 'integer', 'min:5', 'max:10000'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
