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
        Schema::create('offset_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->decimal('total_hours', 8, 2)->default(0);
            $table->decimal('used_hours', 8, 2)->default(0);
            $table->decimal('remaining_hours', 8, 2)->default(0);
            $table->datetime('last_updated')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Add unique constraint to ensure one record per employee
            $table->unique('employee_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offset_banks');
    }
};
