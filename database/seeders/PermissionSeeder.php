<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        $permissions = [
            // User Management
            [
                'name' => 'View Users',
                'slug' => 'view-users',
            ],
            [
                'name' => 'Create Users',
                'slug' => 'create-users',
            ],
            [
                'name' => 'Edit Users',
                'slug' => 'edit-users',
            ],
            [
                'name' => 'Delete Users',
                'slug' => 'delete-users',
            ],
            
            // Employee Management
            [
                'name' => 'View Employees',
                'slug' => 'view-employees',
            ],
            [
                'name' => 'Manage Employees',
                'slug' => 'manage-employees',
            ],
            
            // Finance Management
            [
                'name' => 'View Finance',
                'slug' => 'view-finance',
            ],
            [
                'name' => 'Manage Finance',
                'slug' => 'manage-finance',
            ],
        ];

        foreach ($permissions as $permission) {
            Permission::create($permission);
        }
    }
}