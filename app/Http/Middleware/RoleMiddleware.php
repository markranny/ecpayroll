<?php
// app/Http/Middleware/RoleMiddleware.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\DepartmentManager;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = Auth::user();

        if (!$user) {
            return redirect('/login');
        }

        // Log the role check
        \Log::info("RoleMiddleware checking roles: " . implode(', ', $roles) . " for user {$user->id}");

        foreach ($roles as $role) {
            if ($this->userHasRole($user, $role)) {
                return $next($request);
            }
        }

        return redirect('/dashboard')
            ->with('error', 'You do not have permission to access this page.');
    }

    /**
     * Check if a user has a specific role.
     *
     * @param  \App\Models\User  $user
     * @param  string  $roleName
     * @return bool
     */
    private function userHasRole($user, $roleName)
    {
        // Add logging for debugging
        \Log::info("Checking if user {$user->id} has role: {$roleName}");
        \Log::info("User data: " . json_encode([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email
        ]));
        
        // Method 1: Check if user has roles relationship - First priority
        if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
            \Log::info("User has 'roles' method with data");
            $userRoles = $user->roles->pluck('name')->toArray();
            $userRoleSlugs = $user->roles->pluck('slug')->toArray();
            \Log::info("User roles from relationship: " . implode(', ', $userRoles));
            \Log::info("User role slugs from relationship: " . implode(', ', $userRoleSlugs));
            
            // Check by both name and slug for better compatibility
            if (in_array($roleName, $userRoles) || in_array($roleName, $userRoleSlugs)) {
                \Log::info("Role check via relationship: MATCH FOUND");
                return true;
            }
        }
        
        // Method 2: Use hasRole method if available - Second priority
        if (method_exists($user, 'hasRole')) {
            \Log::info("Checking via 'hasRole' method");
            $result = $user->hasRole($roleName);
            \Log::info("hasRole({$roleName}) returned: " . ($result ? 'true' : 'false'));
            
            if ($result) {
                \Log::info("Role check via hasRole: MATCH FOUND");
                return true;
            }
        }
        
        // Method 3: Check if user has getRoleSlug method - Third priority
        if (method_exists($user, 'getRoleSlug')) {
            \Log::info("Checking via 'getRoleSlug' method");
            $roleSlug = $user->getRoleSlug();
            \Log::info("getRoleSlug returned: " . $roleSlug);
            
            if ($roleSlug === $roleName) {
                \Log::info("Role check via getRoleSlug: MATCH FOUND");
                return true;
            }
        }
        
        // Method 4: Fallback checks based on specific role needs
        \Log::info("Using fallback role detection for: {$roleName}");
        $result = false;
        
        switch ($roleName) {
            case 'superadmin':
                $nameCheck = stripos($user->name, 'admin') !== false;
                $idCheck = $user->id === 1;
                $result = $nameCheck || $idCheck;
                \Log::info("Superadmin check: " . ($result ? 'MATCH FOUND' : 'No match'));
                break;
            
            case 'hrd_manager':
                $nameCheck = stripos($user->name, 'hrd manager') !== false;
                $emailCheck = stripos($user->email, 'hrdmanager') !== false;
                $result = $nameCheck || $emailCheck;
                \Log::info("HRD manager check: " . ($result ? 'MATCH FOUND' : 'No match'));
                break;
            
            case 'department_manager':
                try {
                    // This is the key improvement - more reliable checking for department managers
                    $dbCheck = DepartmentManager::where('manager_id', $user->id)->exists();
                    \Log::info("Department manager DB check: " . ($dbCheck ? 'true' : 'false'));
                    
                    if ($dbCheck) {
                        \Log::info("Department manager DB check: MATCH FOUND");
                        $result = true;
                        break;
                    }
                    
                    // Also check if the user has the department_manager role explicitly
                    if (method_exists($user, 'roles') && $user->roles) {
                        $hasExplicitRole = $user->roles->contains(function ($role) {
                            return $role->name === 'department_manager' || $role->slug === 'department_manager';
                        });
                        
                        \Log::info("Department manager explicit role check: " . ($hasExplicitRole ? 'true' : 'false'));
                        if ($hasExplicitRole) {
                            \Log::info("User has explicit department_manager role");
                            $result = true;
                            break;
                        }
                    }
                    
                    \Log::info("Department manager check: No match");
                    $result = false;
                } catch (\Exception $e) {
                    \Log::error("Error checking department_manager role: " . $e->getMessage());
                    $result = false;
                }
                break;
            
            case 'finance':
                $nameCheck = stripos($user->name, 'finance') !== false;
                $emailCheck = stripos($user->email, 'finance') !== false;
                $result = $nameCheck || $emailCheck;
                \Log::info("Finance check: " . ($result ? 'MATCH FOUND' : 'No match'));
                break;
                
            default:
                \Log::warning("No specific check defined for role: '{$roleName}'");
                $result = false;
        }
        
        return $result;
    }
}