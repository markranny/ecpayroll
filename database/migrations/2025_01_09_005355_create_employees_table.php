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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('idno')->unique()->nullable();
            $table->string('bid')->nullable();
            $table->string('Lname')->nullable();
            $table->string('Fname')->nullable();
            $table->string('MName')->nullable();
            $table->string('Suffix')->nullable();
            $table->enum('Gender', ['Male', 'Female'])->nullable();
            $table->string('EducationalAttainment')->nullable();
            $table->string('Degree')->nullable();
            $table->string('CivilStatus')->nullable();
            $table->date('Birthdate')->nullable();
            $table->string('ContactNo')->nullable();
            $table->string('Email')->unique()->nullable();
            $table->text('PresentAddress')->nullable();
            $table->text('PermanentAddress')->nullable();
            $table->string('EmerContactName')->nullable();
            $table->string('EmerContactNo')->nullable();
            $table->string('EmerRelationship')->nullable();
            $table->string('EmpStatus')->nullable();
            $table->string('JobStatus')->nullable();
            $table->string('RankFile')->nullable();
            $table->string('Department')->nullable();
            $table->string('Line')->nullable();
            $table->string('Jobtitle')->nullable();
            $table->date('HiredDate')->nullable();
            $table->date('EndOfContract')->nullable();
            $table->string('pay_type')->nullable();
            $table->decimal('payrate', 8, 2)->nullable();
            $table->decimal('pay_allowance', 8, 2)->nullable();
            $table->string('SSSNO')->nullable();
            $table->string('PHILHEALTHNo')->nullable();
            $table->string('HDMFNo')->nullable();
            $table->string('TaxNo')->nullable();
            $table->boolean('Taxable')->default(true);
            $table->string('CostCenter')->nullable();
            $table->timestamps();
        });
        
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
