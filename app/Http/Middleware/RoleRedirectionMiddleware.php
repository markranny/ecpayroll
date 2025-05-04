<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\DepartmentManager;
use Symfony\Component\HttpFoundation\Response;

class RoleRedirectionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // If not authenticated, redirect to login
        if (!$user) {
            return redirect('/login');
        }

        // Only apply redirection logic on the main dashboard route
        if ($request->route()->getName() === 'dashboard') {
            // Redirect department managers to their dedicated dashboard
            if ($this->isDepartmentManager($user)) {
                return redirect()->route('department_manager.dashboard');
            }
        }

        return $next($request);
    }

    /**
     * Check if the user is a department manager.
     *
     * @param  \App\Models\User  $user
     * @return bool
     */
    private function isDepartmentManager($user)
    {
        // First check if user has a direct department manager role
        if (method_exists($user, 'hasRole') && $user->hasRole('department_manager')) {
            return true;
        }

        // Check if user is assigned as a manager in department_managers table
        if (DepartmentManager::where('manager_id', $user->id)->exists()) {
            return true;
        }

        // Check through roles relationship if available
        if (method_exists($user, 'roles') && $user->roles) {
            return $user->roles->contains('name', 'department_manager') || 
                   $user->roles->contains('slug', 'department_manager');
        }

        // If the user has a getRoleSlug method
        if (method_exists($user, 'getRoleSlug')) {
            $roleSlug = $user->getRoleSlug();
            return $roleSlug === 'department_manager';
        }

        return false;
    }
}