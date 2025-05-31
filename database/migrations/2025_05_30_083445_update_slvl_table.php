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
        Schema::table('slvl', function (Blueprint $table) {
            // Update documents_path to support longer file paths if needed
            $table->string('documents_path', 500)->nullable()->change();
            
            // Add indexes for better performance
            $table->index(['employee_id', 'status']);
            $table->index(['type', 'status']);
            $table->index(['start_date', 'end_date']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('slvl', function (Blueprint $table) {
            $table->dropIndex(['employee_id', 'status']);
            $table->dropIndex(['type', 'status']);
            $table->dropIndex(['start_date', 'end_date']);
            $table->dropIndex(['created_at']);
        });
    }
};