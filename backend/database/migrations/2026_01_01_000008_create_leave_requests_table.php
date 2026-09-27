<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('class_room_id')->constrained('class_rooms')->cascadeOnDelete();
            $table->foreignId('attendance_session_id')->nullable()->constrained('attendance_sessions')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->nullOnDelete();
            $table->string('leave_type'); // sick, permission, dispensation, correction
            $table->date('start_date');
            $table->date('end_date');
            $table->text('reason');
            $table->string('attachment_path')->nullable();
            
            // Workflow: 1st stage Mazer -> 2nd stage Teacher -> Final Approved
            $table->string('status')->default('pending_mazer'); // pending_mazer, pending_teacher, approved, rejected
            
            $table->string('mazer_approval')->default('pending'); // pending, approved, rejected
            $table->foreignId('mazer_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('mazer_approved_at')->nullable();
            $table->text('mazer_notes')->nullable();

            $table->string('teacher_approval')->default('pending'); // pending, approved, rejected
            $table->foreignId('teacher_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('teacher_approved_at')->nullable();
            $table->text('teacher_notes')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
