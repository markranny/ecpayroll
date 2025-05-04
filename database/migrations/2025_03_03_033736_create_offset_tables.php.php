<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        // Create offset types table
        Schema::create('offset_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Create offsets table
        Schema::create('offsets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id');
            $table->date('date')->comment('The date when the work was done');
            $table->date('workday')->comment('The date when the offset will be taken');
            $table->unsignedBigInteger('offset_type_id');
            $table->decimal('hours', 5, 2)->comment('Number of hours');
            $table->text('reason');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            
            // Foreign key constraints
            $table->foreign('employee_id')->references('id')->on('employees');
            $table->foreign('offset_type_id')->references('id')->on('offset_types');
            $table->foreign('approved_by')->references('id')->on('users');
        });
        
        // Insert default offset types
        DB::table('offset_types')->insert([
            [
                'name' => 'Regular Day Offset',
                'description' => 'Time off in lieu of working on a regular day',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Rest Day/Weekend Offset',
                'description' => 'Time off in lieu of working on a rest day or weekend',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Holiday Offset',
                'description' => 'Time off in lieu of working on a holiday',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Special Event Offset',
                'description' => 'Time off in lieu of working for a special company event',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('offsets');
        Schema::dropIfExists('offset_types');
    }
};
