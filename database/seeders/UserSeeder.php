<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Create main test users
        $users = [
            [
                'name' => 'Super Admin User',
                'email' => 'superadmin@example.com',
                'password' => 'password123',
                'role' => 'superadmin'
            ],
            [
                'name' => 'HRD User',
                'email' => 'hrd@example.com',
                'password' => 'password123',
                'role' => 'hrd'
            ],
            [
                'name' => 'Finance User',
                'email' => 'finance@example.com',
                'password' => 'password123',
                'role' => 'finance'
            ],
        ];

        foreach ($users as $userData) {
            $role = $userData['role'];
            unset($userData['role']);
            
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'password' => Hash::make($userData['password']),
            ]);

            $roleModel = Role::where('slug', $role)->first();
            $user->roles()->attach($roleModel->id);
        }

        // Create additional test users for each role
        foreach (['superadmin', 'hrd', 'finance'] as $role) {
            for ($i = 1; $i <= 3; $i++) {
                $user = User::create([
                    'name' => ucfirst($role) . " Test User {$i}",
                    'email' => "{$role}{$i}@example.com",
                    'password' => Hash::make('password123'),
                ]);

                $roleModel = Role::where('slug', $role)->first();
                $user->roles()->attach($roleModel->id);
            }
        }
    }
}