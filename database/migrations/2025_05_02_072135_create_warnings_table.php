<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->onDelete('cascade');
            $table->string('warning_type');
            $table->string('subject');
            $table->text('warning_description');
            $table->date('warning_date');
            $table->string('document_path')->nullable();
            $table->foreignId('issued_by')->constrained('users')->onDelete('cascade');
            $table->date('acknowledgement_date')->nullable();
            $table->text('employee_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warnings');
    }
};