<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Models\Role;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class EmployeeRegistrationController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create()
    {
        return Inertia::render('Auth/EmployeeRegister');
    }

    /**
     * Handle an incoming registration request.
     */
    public function store(Request $request)
    {
        // Log the incoming request for debugging
        Log::info('Employee registration attempt', ['request' => $request->only(['idno', 'email'])]);
        
        // Validate the request
        $validator = Validator::make($request->all(), [
            'idno' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed', ['errors' => $validator->errors()]);
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Begin transaction for atomic operations
            DB::beginTransaction();
            
            // Verify employee exists and details match
            // First check if employee with this ID exists at all
            $employeeById = Employee::where('idno', $request->idno)->first();
            
            if (!$employeeById) {
                Log::warning('No employee found with the provided ID', [
                    'idno' => $request->idno
                ]);
                
                DB::rollBack();
                return back()->withErrors([
                    'idno' => 'No employee found with the provided ID. Please contact HR department.',
                ])->withInput();
            }
            
            // Log the employee found by ID
            Log::info('Employee found by ID', [
                'idno' => $employeeById->idno,
                'email' => $employeeById->Email,
                'name' => $employeeById->Fname . ' ' . $employeeById->Lname,
                'status' => $employeeById->JobStatus
            ]);
            
            // Check if the email matches
            if (strtolower($employeeById->Email) !== strtolower($request->email)) {
                Log::warning('Email does not match employee record', [
                    'provided_email' => $request->email,
                    'employee_email' => $employeeById->Email
                ]);
                
                DB::rollBack();
                return back()->withErrors([
                    'email' => 'The provided email does not match our records. Please use the email registered with HR.',
                ])->withInput();
            }
            
            if (strtolower($employeeById->JobStatus) !== 'active') {
                Log::warning('Employee is not active', [
                    'idno' => $request->idno,
                    'status' => $employeeById->JobStatus
                ]);
                
                DB::rollBack();
                return back()->withErrors([
                    'idno' => 'Your employee account is not active. Please contact HR department.',
                ])->withInput();
            }
            
            // Everything is fine, create the user account
            $user = User::create([
                'name' => $employeeById->Fname . ' ' . $employeeById->Lname,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'employee_idno' => $employeeById->idno,
                'is_employee' => 1, // Set the is_employee flag to 1
            ]);

            Log::info('User created', ['user_id' => $user->id, 'email' => $user->email]);

            // Assign employee role - first get or create role
            $employeeRole = Role::firstOrCreate(
                ['slug' => 'employee'],
                ['name' => 'Employee']
            );
            
            // Check if role was created successfully
            if (!$employeeRole) {
                Log::error('Failed to create employee role');
                DB::rollBack();
                return back()->withErrors([
                    'error' => 'Failed to set up user permissions. Please contact support.'
                ])->withInput();
            }
            
            Log::info('Employee role status', [
                'role_id' => $employeeRole->id,
                'role_name' => $employeeRole->name,
                'role_slug' => $employeeRole->slug
            ]);
            
            // Attach the role to the user
            $user->roles()->attach($employeeRole->id);
            
            Log::info('Role assigned', [
                'user_id' => $user->id,
                'role' => 'employee',
                'role_id' => $employeeRole->id
            ]);
            
            // Double check that the role was assigned
            $roleAssigned = DB::table('role_user')
                ->where('user_id', $user->id)
                ->where('role_id', $employeeRole->id)
                ->exists();
                
            if (!$roleAssigned) {
                Log::error('Role assignment failed', [
                    'user_id' => $user->id,
                    'role_id' => $employeeRole->id
                ]);
                
                DB::rollBack();
                return back()->withErrors([
                    'error' => 'Failed to assign permissions. Please contact support.'
                ])->withInput();
            }
            
            // Commit the transaction
            DB::commit();
            
            // Fire registered event
            event(new Registered($user));

            // Redirect to login with success message
            return redirect()->route('login')->with('status', 'Registration successful! You can now log in.');
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error during employee registration', [
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return back()->withErrors([
                'error' => 'An unexpected error occurred during registration. Please try again later or contact support.'
            ])->withInput();
        }
    }
}