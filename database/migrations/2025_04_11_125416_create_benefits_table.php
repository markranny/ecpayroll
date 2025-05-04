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
        Schema::create('benefits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            // Removed the three specific decimal fields as requested
            $table->decimal('mf_shares', 10, 2)->default(0);
            $table->decimal('mf_loan', 10, 2)->default(0);
            $table->decimal('sss_loan', 10, 2)->default(0);
            $table->decimal('hmdf_loan', 10, 2)->default(0);
            $table->decimal('hmdf_prem', 10, 2)->default(0);
            $table->decimal('sss_prem', 10, 2)->default(0);
            $table->decimal('philhealth', 10, 2)->default(0);
            $table->enum('cutoff', ['1st', '2nd'])->comment('1st (1-15), 2nd (16-31)');
            $table->date('date');
            $table->date('date_posted')->nullable();
            $table->boolean('is_posted')->default(false);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            
            // Index for faster queries
            $table->index(['employee_id', 'cutoff', 'date']);
            $table->index('is_posted');
            $table->index('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('benefits');
    }
};