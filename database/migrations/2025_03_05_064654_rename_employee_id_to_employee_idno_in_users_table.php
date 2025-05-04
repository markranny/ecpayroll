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
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'employee_id') && !Schema::hasColumn('users', 'employee_idno')) {
                $table->renameColumn('employee_id', 'employee_idno');
            } elseif (!Schema::hasColumn('users', 'employee_idno')) {
                $table->string('employee_idno')->nullable()->after('email');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'employee_idno')) {
                $table->renameColumn('employee_idno', 'employee_id');
            }
        });
    }
};