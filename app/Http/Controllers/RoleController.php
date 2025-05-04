<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    /**
     * Display a listing of users with their roles.
     */
    public function index()
    {
        $users = User::with('roles')->get();
        $roles = Role::all();
        
        return Inertia::render('Roles/Index', [
            'users' => $users,
            'roles' => $roles,
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }

    /**
     * Assign a role to a user.
     */
    public function assignRole(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return back()->with('error', $validator->errors()->first());
        }

        $user = User::find($request->user_id);
        
        // Check if user already has this role
        if ($user->roles()->where('role_id', $request->role_id)->exists()) {
            return back()->with('info', 'User already has this role');
        }
        
        // Clear existing roles if we're enforcing one role per user
        // Comment this out if you want to allow multiple roles
        $user->roles()->detach();
        
        // Attach the new role
        $user->roles()->attach($request->role_id);
        
        return back()->with('message', 'Role assigned successfully');
    }

    /**
     * Remove a role from a user.
     */
    public function removeRole(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return back()->with('error', $validator->errors()->first());
        }

        $user = User::find($request->user_id);
        $user->roles()->detach($request->role_id);
        
        return back()->with('message', 'Role removed successfully');
    }
    
    /**
     * Show form to create a new role
     */
    public function create()
    {
        return Inertia::render('Roles/Create', [
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }
    
    /**
     * Store a new role
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:roles,slug',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator);
        }

        Role::create([
            'name' => $request->name,
            'slug' => $request->slug,
        ]);
        
        return redirect()->route('roles.index')->with('message', 'Role created successfully');
    }
}