<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ScheduleType;
use Illuminate\Support\Facades\DB;

class ScheduleTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $scheduleTypes = [
            [
                'name' => 'Regular Day Shift',
                'description' => 'Standard 8:00 AM - 5:00 PM schedule',
                'is_active' => true,
            ],
            [
                'name' => 'Night Shift',
                'description' => 'Night shift schedule 10:00 PM - 7:00 AM',
                'is_active' => true,
            ],
            [
                'name' => 'Flexible Schedule',
                'description' => 'Flexible working hours',
                'is_active' => true,
            ],
            [
                'name' => 'Part-Time',
                'description' => 'Part-time working schedule',
                'is_active' => true,
            ],
            [
                'name' => 'Compressed Work Week',
                'description' => '4-day work week with longer hours',
                'is_active' => true,
            ],
            [
                'name' => 'Split Shift',
                'description' => 'Split working hours with break in between',
                'is_active' => true,
            ],
        ];

        foreach ($scheduleTypes as $scheduleType) {
            ScheduleType::updateOrCreate(
                ['name' => $scheduleType['name']],
                $scheduleType
            );
        }
    }
}