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
        // First check if the table exists
        if (Schema::hasTable('processed_attendances')) {
            // Drop the table completely to ensure clean structure
            Schema::dropIfExists('processed_attendances');
        }
        
        // Recreate the table with the correct structure
        Schema::create('processed_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->date('attendance_date');
            $table->string('day')->nullable();
            $table->datetime('time_in')->nullable();
            $table->datetime('time_out')->nullable();
            $table->datetime('break_in')->nullable();
            $table->datetime('break_out')->nullable();
            $table->datetime('next_day_timeout')->nullable();
            $table->decimal('hours_worked', 8, 2)->nullable();
            $table->boolean('is_nightshift')->default(false);
            $table->string('source')->default('import');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Create a unique constraint to prevent duplicate attendance records
            $table->unique(['employee_id', 'attendance_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // In the rollback, we won't try to restore the old structure
        // Just drop the table
        Schema::dropIfExists('processed_attendances');
    }
};