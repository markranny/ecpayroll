<?php
// app/Http/Middleware/CheckRole.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\DepartmentManager;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|array  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roleGroups): Response
    {
        $user = Auth::user();

        // If no user is logged in, redirect to login
        if (!$user) {
            \Log::warning('No authenticated user found, redirecting to login');
            return redirect()->route('login');
        }

        // Log detailed information about the current request
        \Log::info('=== ROLE CHECK STARTED ===');
        \Log::info('Request URI: ' . $request->getRequestUri());
        \Log::info('Request Method: ' . $request->method());
        \Log::info('User ID: ' . $user->id);
        \Log::info('User Email: ' . $user->email);
        \Log::info('User Name: ' . $user->name);
        
        // Parse all roles from potentially comma-separated strings
        $allowedRoles = [];
        foreach ($roleGroups as $roleGroup) {
            $parsed = explode(',', $roleGroup);
            $allowedRoles = array_merge($allowedRoles, $parsed);
        }
        
        // Debug log to see parsed roles
        \Log::info('All allowed roles after parsing: ' . implode(', ', $allowedRoles));
        
        // Enhanced role verification
        foreach ($allowedRoles as $role) {
            $role = trim($role); // Remove any whitespace
            \Log::info('Checking if user has role: "' . $role . '"');
            
            if ($this->userHasRole($user, $role)) {
                \Log::info('Access GRANTED - User has required role: ' . $role);
                \Log::info('=== ROLE CHECK COMPLETED SUCCESSFULLY ===');
                return $next($request);
            }
        }

        // Log detailed information when access is denied
        \Log::warning('Access DENIED - User does not have any of the required roles');
        \Log::warning('User ID: ' . $user->id);
        \Log::warning('User Email: ' . $user->email);
        \Log::warning('Required roles: ' . implode(', ', $allowedRoles));
        \Log::warning('=== ROLE CHECK FAILED ===');
        
        // If user doesn't have any of the required roles
        return redirect()->route('dashboard')->with('error', 'You do not have permission to access this page.');
    }

    /**
     * Enhanced method to check if a user has a specific role.
     * This addresses the reliability issues in role checking.
     *
     * @param  \App\Models\User  $user
     * @param  string  $roleName
     * @return bool
     */
    private function userHasRole($user, $roleName)
    {
        // Special case: For department_manager role, check the department_managers table first
        if ($roleName === 'department_manager') {
            $isDeptManager = \App\Models\DepartmentManager::where('manager_id', $user->id)->exists();
            if ($isDeptManager) {
                \Log::info("User IS a department manager (direct DB check)");
                return true;
            }
        }
        
        // Method 1: Check through roles relationship
        if (method_exists($user, 'roles') && is_object($user->roles)) {
            $userRoles = $user->roles->pluck('name')->toArray();
            $userRoleSlugs = $user->roles->pluck('slug')->toArray();
            
            if (in_array($roleName, $userRoles) || in_array($roleName, $userRoleSlugs)) {
                \Log::info("Role check via relationship: MATCH FOUND");
                return true;
            }
        }
        
        // Method 2: Check through hasRole method if available
        if (method_exists($user, 'hasRole')) {
            $result = $user->hasRole($roleName);
            
            if ($result) {
                \Log::info("Role check via hasRole: MATCH FOUND");
                return true;
            }
        }
        
        // Method 3: For specific role types, use customized checks
        switch ($roleName) {
            case 'superadmin':
                if ($user->id === 1 || stripos($user->name, 'admin') !== false) {
                    \Log::info("Superadmin check based on ID/name: MATCH FOUND");
                    return true;
                }
                break;
                
            case 'hrd_manager':
                if (stripos($user->name, 'hrd') !== false || stripos($user->email, 'hrd') !== false) {
                    \Log::info("HRD manager check based on name/email: MATCH FOUND");
                    return true;
                }
                break;
                
            case 'department_manager':
                // This case is already handled at the beginning
                break;
                
            case 'finance':
                if (stripos($user->name, 'finance') !== false || stripos($user->email, 'finance') !== false) {
                    \Log::info("Finance role check based on name/email: MATCH FOUND");
                    return true;
                }
                break;
                
            case 'employee':
                // Check if user has is_employee flag or has employee record
                if ($user->is_employee || ($user->employee && $user->employee->exists())) {
                    \Log::info("Employee check: MATCH FOUND");
                    return true;
                }
                break;
        }
        
        \Log::info("No role match found for {$roleName}");
        return false;
    }
}