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
        Schema::create('overtimes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees');
            $table->date('date');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->decimal('total_hours', 8, 2);
            $table->decimal('rate_multiplier', 5, 2)->comment('Based on DOLE standards');
            $table->text('reason');
            
            // Modified status enum to include manager_approved for the multi-level approval workflow
            $table->enum('status', ['pending', 'manager_approved', 'approved', 'rejected'])->default('pending');
            
            // Original approval fields (kept for backward compatibility)
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->dateTime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            
            // Department manager approval fields
            $table->foreignId('dept_manager_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('dept_approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('dept_approved_at')->nullable();
            $table->text('dept_remarks')->nullable();
            
            // HRD manager approval fields
            $table->foreignId('hrd_approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('hrd_approved_at')->nullable();
            $table->text('hrd_remarks')->nullable();
            
            // Track who created the overtime request
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            
            $table->timestamps();
            
            // Composite index for efficient queries
            $table->index(['employee_id', 'date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('overtimes');
    }
};