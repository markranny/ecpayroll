<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            [
                'name' => 'Super Admin',
                'slug' => 'superadmin',
            ],
            [
                'name' => 'HRD',
                'slug' => 'hrd',
            ],
            [
                'name' => 'Finance',
                'slug' => 'finance',
            ],
        ];

        foreach ($roles as $role) {
            Role::create($role);
        }
    }
}