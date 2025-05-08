<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BiometricController;
use App\Models\Role;
use App\Models\User;
use App\Models\Permission;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {
    Route::post('api/biometric/fetch-logs', [BiometricController::class, 'fetchLogs']);
    Route::get('api/attendance/report', [BiometricController::class, 'getAttendanceReport'])->name('attendance.report');

    Route::get('api/attendance/generate', function () {
        return Inertia::render('timesheets/AttendanceManagement');
    })->name('attendance.report');
    
    // Roles and Access Management API Routes
    Route::get('/api/roles', function (Request $request) {
        // Get search parameter
        $search = $request->query('search', '');
        
        // Query roles from database
        $query = Role::with('permissions');
        
        // Apply search filter if provided
        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }
        
        $roles = $query->get();
        
        // Transform roles to the expected format
        $roles = $roles->map(function($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions' => $role->permissions->pluck('id')->toArray()
            ];
        });
        
        return response()->json([
            'data' => $roles
        ]);
    });

    Route::get('/api/users', function (Request $request) {
        // Get search parameter
        $search = $request->query('search', '');
        
        // Query users from database
        $query = User::with('roles');
        
        // Apply search filter if provided
        if (!empty($search)) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('surname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->get();
        
        // Transform users to the expected format
        $users = $users->map(function($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'surname' => $user->surname,
                'email' => $user->email,
                'roles' => $user->roles->pluck('id')->toArray()
            ];
        });
        
        return response()->json([
            'data' => $users
        ]);
    });

    Route::get('/api/permissions', function () {
        // Get all permissions from database
        $permissions = Permission::all();
        
        // Transform permissions to the expected format
        $permissions = $permissions->map(function($permission) {
            return [
                'id' => $permission->id,
                'name' => $permission->name,
                'category' => $permission->category
            ];
        });
        
        return response()->json([
            'data' => $permissions
        ]);
    });

    Route::post('/api/roles', function (Request $request) {
        // Validate request
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);
        
        // Create new role
        $role = new Role();
        $role->name = $request->input('name');
        $role->description = $request->input('description');
        $role->save();
        
        // Attach permissions
        if ($request->has('permissions')) {
            $role->permissions()->attach($request->input('permissions'));
        }
        
        // Reload role with permissions
        $role->load('permissions');
        
        // Transform role to the expected format
        $result = [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissions->pluck('id')->toArray()
        ];
        
        return response()->json($result);
    });

    Route::put('/api/roles/{id}', function (Request $request, $id) {
        // Find role
        $role = Role::findOrFail($id);
        
        // Validate request
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);
        
        // Update role
        $role->name = $request->input('name');
        $role->description = $request->input('description');
        $role->save();
        
        // Sync permissions
        if ($request->has('permissions')) {
            $role->permissions()->sync($request->input('permissions'));
        }
        
        // Reload role with permissions
        $role->load('permissions');
        
        // Transform role to the expected format
        $result = [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'permissions' => $role->permissions->pluck('id')->toArray()
        ];
        
        return response()->json($result);
    });

    Route::delete('/api/roles/{id}', function ($id) {
        // Find and delete role
        $role = Role::findOrFail($id);
        
        // Detach all users from this role first
        $role->users()->detach();
        
        // Then detach all permissions
        $role->permissions()->detach();
        
        // Now delete the role
        $role->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully'
        ]);
    });

    Route::put('/api/users/{id}/roles', function (Request $request, $id) {
        // Validate request
        $request->validate([
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,id'
        ]);
        
        // Find user
        $user = User::findOrFail($id);
        
        // Sync roles
        $user->roles()->sync($request->input('roles'));
        
        // Reload user with roles
        $user->load('roles');
        
        // Transform user to the expected format
        $result = [
            'id' => $user->id,
            'name' => $user->name,
            'surname' => $user->surname,
            'email' => $user->email,
            'roles' => $user->roles->pluck('id')->toArray()
        ];
        
        return response()->json($result);
    });
});