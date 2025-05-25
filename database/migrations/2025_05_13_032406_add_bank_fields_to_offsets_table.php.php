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
        Schema::table('offsets', function (Blueprint $table) {
            $table->boolean('is_bank_updated')->default(false)->after('remarks');
            $table->enum('transaction_type', ['credit', 'debit'])->default('credit')->after('is_bank_updated');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('offsets', function (Blueprint $table) {
            $table->dropColumn('is_bank_updated');
            $table->dropColumn('transaction_type');
        });
    }
};
