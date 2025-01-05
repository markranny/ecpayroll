<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionRoleSeeder extends Seeder
{
    public function run()
    {
        // Get all roles
        $superadmin = Role::where('slug', 'superadmin')->first();
        $hrd = Role::where('slug', 'hrd')->first();
        $finance = Role::where('slug', 'finance')->first();

        // Get all permissions
        $permissions = Permission::all();

        // Assign all permissions to superadmin
        $superadmin->permissions()->attach($permissions->pluck('id'));

        // Assign HRD-specific permissions
        $hrd->permissions()->attach(
            Permission::whereIn('slug', [
                'view-employees',
                'manage-employees',
            ])->pluck('id')
        );

        // Assign Finance-specific permissions
        $finance->permissions()->attach(
            Permission::whereIn('slug', [
                'view-finance',
                'manage-finance',
            ])->pluck('id')
        );
    }
}