<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class ClassRoom extends Model
{
    use HasFactory;

    protected $table = 'class_rooms';

    protected $fillable = [
        'name',
        'code',
        'academic_year',
        'grade_level',
        'room_number',
        'mazer_id',
        'description',
    ];

    public function mazer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mazer_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_room_id');
    }

    public function students(): HasManyThrough
    {
        return $this->hasManyThrough(
            User::class,
            Enrollment::class,
            'class_room_id',
            'id',
            'id',
            'student_id'
        );
    }

    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class, 'class_room_id');
    }
}
