<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEmployeeUploadAttendancesTable extends Migration
{
    public function up()
    {
        Schema::create('employee_upload_attendances', function (Blueprint $table) {
            $table->id(); // Primary key (optional)
            $table->string('employee_no', 255)->nullable();
            $table->date('date')->nullable();
            $table->string('day', 255)->nullable();
            $table->time('in1')->nullable();
            $table->time('out1')->nullable();
            $table->time('in2')->nullable();
            $table->time('out2')->nullable();
            $table->time('nextday')->nullable();
            $table->decimal('hours_work', 18, 2)->nullable();
            $table->timestamps(); // Optional: adds created_at and updated_at columns
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_upload_attendances');
    }
}

