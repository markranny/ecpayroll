<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create()
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request)
    {
        // Validate request
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Log attempt for debugging
        Log::info('Login attempt', ['email' => $request->email]);
        
        // Explicitly get the user for debugging
        $user = \App\Models\User::where('email', $request->email)->first();
        if ($user) {
            Log::info('User found', [
                'id' => $user->id, 
                'email' => $user->email, 
                'is_employee' => $user->is_employee,
                'employee_idno' => $user->employee_idno
            ]);
        } else {
            Log::warning('User not found', ['email' => $request->email]);
        }
        
        // Attempt authentication
        if (Auth::attempt([
            'email' => $request->email,
            'password' => $request->password,
        ], $request->boolean('remember'))) {
            
            $request->session()->regenerate();
            
            $user = Auth::user();
            Log::info('User authenticated successfully', ['id' => $user->id, 'email' => $user->email]);
            
            $role = $user->getRoleSlug();
            Log::info('User role', ['role' => $role]);
            
            // Handle JSON request (for API/Ajax requests)
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'redirect' => $role ? route($role.'.dashboard') : route('dashboard')
                ]);
            }
            
            // Handle standard form submission
            if ($role) {
                return redirect()->intended(route($role.'.dashboard'));
            }
            
            return redirect()->intended(route('dashboard'));
        }
        
        // Authentication failed
        Log::warning('Authentication failed', ['email' => $request->email]);
        
        // Handle JSON request
        if ($request->wantsJson()) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        // Standard form response - throw validation exception
        throw ValidationException::withMessages([
            'email' => 'Invalid credentials',
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Successfully logged out']);
        }

        return redirect('/');
    }
}