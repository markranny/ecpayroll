<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OffsetType;

class OffsetTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $offsetTypes = [
            [
                'name' => 'Overtime Work',
                'description' => 'Hours worked beyond regular working hours',
                'is_active' => true,
            ],
            [
                'name' => 'Holiday Work',
                'description' => 'Work performed during holidays',
                'is_active' => true,
            ],
            [
                'name' => 'Weekend Work',
                'description' => 'Work performed during weekends',
                'is_active' => true,
            ],
            [
                'name' => 'Emergency Work',
                'description' => 'Emergency or urgent work outside regular hours',
                'is_active' => true,
            ],
            [
                'name' => 'Training/Meeting',
                'description' => 'Training sessions or meetings outside regular hours',
                'is_active' => true,
            ],
            [
                'name' => 'Project Work',
                'description' => 'Special project work requiring additional hours',
                'is_active' => true,
            ],
            [
                'name' => 'On-Call Duty',
                'description' => 'Being on-call for emergency situations',
                'is_active' => true,
            ],
            [
                'name' => 'Travel Time',
                'description' => 'Work-related travel outside regular hours',
                'is_active' => true,
            ],
        ];

        foreach ($offsetTypes as $type) {
            OffsetType::firstOrCreate(
                ['name' => $type['name']], // Check if exists by name
                $type // If not exists, create with these attributes
            );
        }
        
        echo "Offset types seeded successfully!\n";
    }
}