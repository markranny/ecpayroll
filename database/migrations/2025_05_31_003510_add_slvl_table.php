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
            // Add pay_type column
            $table->enum('pay_type', ['with_pay', 'non_pay'])->nullable()->after('with_pay');
            
            // Add index for better query performance
            $table->index('pay_type');
        });

        // Update existing records to set pay_type based on with_pay value
        DB::statement("UPDATE slvl SET pay_type = CASE WHEN with_pay = 1 THEN 'with_pay' ELSE 'non_pay' END WHERE pay_type IS NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('slvl', function (Blueprint $table) {
            $table->dropIndex(['pay_type']);
            $table->dropColumn('pay_type');
        });
    }
};