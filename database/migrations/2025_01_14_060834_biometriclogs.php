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
        Schema::create('biometriclogs', function (Blueprint $table) {
            $table->id();
            $table->string('idno');
            $table->datetime('punch_time');
            $table->integer('punch_state')->comment('0: Time In, 1: Time Out');
            $table->string('device_ip');
            $table->boolean('processed')->default(false);
            $table->boolean('is_wrong_punch')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('biometriclogs');
    }
};
