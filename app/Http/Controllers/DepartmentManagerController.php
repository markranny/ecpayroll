<?php

namespace App\Http\Controllers;

use App\Models\DepartmentManager;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class DepartmentManagerController extends Controller
{
    /**
     * Store a new department manager assignment.
     */
    public function store(Request $request)
    {
        Log::info('Department manager assignment request received', [
            'user_id' => Auth::id(),
            'request_data' => $request->all()
        ]);

        $validator = Validator::make($request->all(), [
            'department' => 'required|string|max:255',
            'manager_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed for department manager assignment', [
                'errors' => $validator->errors()->toArray()
            ]);
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $user = Auth::user();
            
            // Check if user has permission (only superadmin can assign department managers)
            if (!$this->userHasRole($user, 'superadmin')) {
                return redirect()->back()
                    ->with('error', 'You do not have permission to assign department managers');
            }
            
            // Check if an assignment already exists for this department
            $existingAssignment = DepartmentManager::where('department', $request->department)->first();
            
            if ($existingAssignment) {
                return redirect()->back()
                    ->with('error', 'A manager is already assigned to this department. Please remove the existing assignment first.');
            }
            
            // Create new department manager assignment
            $departmentManager = new DepartmentManager([
                'department' => $request->department,
                'manager_id' => $request->manager_id,
            ]);
            
            $departmentManager->save();
            
            $managerName = User::find($request->manager_id)->name ?? 'Unknown';
            
            Log::info('Department manager assigned successfully', [
                'department' => $request->department,
                'manager_id' => $request->manager_id,
                'manager_name' => $managerName
            ]);
            
            return redirect()->back()
                ->with('message', "Successfully assigned $managerName as manager of {$request->department} department");
        } catch (\Exception $e) {
            Log::error('Failed to assign department manager', [
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to assign department manager: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Delete a department manager assignment.
     */
    public function destroy($id)
    {
        Log::info('Department manager deletion request received', [
            'user_id' => Auth::id(),
            'assignment_id' => $id
        ]);

        try {
            $user = Auth::user();
            
            // Check if user has permission (only superadmin can remove department managers)
            if (!$this->userHasRole($user, 'superadmin')) {
                return redirect()->back()
                    ->with('error', 'You do not have permission to remove department manager assignments');
            }
            
            $departmentManager = DepartmentManager::findOrFail($id);
            $department = $departmentManager->department;
            $managerName = $departmentManager->manager->name ?? 'Unknown';
            
            $departmentManager->delete();
            
            Log::info('Department manager assignment removed successfully', [
                'assignment_id' => $id,
                'department' => $department,
                'manager_name' => $managerName
            ]);
            
            return redirect()->back()
                ->with('message', "Successfully removed $managerName as manager of $department department");
        } catch (\Exception $e) {
            Log::error('Failed to remove department manager assignment', [
                'error' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'assignment_id' => $id
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to remove department manager assignment: ' . $e->getMessage());
        }
    }
    
    /**
     * Helper method to check if user has a specific role.
     */
    private function userHasRole($user, $roleName)
    {
        // If the user has a roles relationship
        if (method_exists($user, 'roles') && $user->roles) {
            return $user->roles->pluck('name')->contains($roleName);
        }
        
        // If the user has a getRoleSlug method
        if (method_exists($user, 'getRoleSlug')) {
            $roleSlug = $user->getRoleSlug();
            return $roleSlug === $roleName;
        }
        
        // Check user permissions/roles table if it exists
        if (method_exists($user, 'hasRole')) {
            return $user->hasRole($roleName);
        }
        
        // Fallback for simple role detection
        switch ($roleName) {
            case 'superadmin':
                return stripos($user->name, 'admin') !== false || $user->id === 1;
            default:
                return false;
        }
    }

    public function getEmployees()
{
    $user = Auth::user();
    
    // Get managed departments
    $managedDepartments = DepartmentManager::where('manager_id', $user->id)
        ->pluck('department')
        ->toArray();
    
    if (empty($managedDepartments)) {
        return response()->json([
            'message' => 'You are not assigned as a manager to any department.'
        ], 404);
    }
    
    // Get employees in these departments
    $employees = Employee::whereIn('Department', $managedDepartments)
        ->where('JobStatus', 'Active')
        ->orderBy('Lname')
        ->get();
    
    return response()->json([
        'employees' => $employees,
        'departments' => $managedDepartments
    ]);
}

/**
 * Get pending overtimes for approval.
 */
public function getPendingOvertimes()
{
    $user = Auth::user();
    
    // Get managed departments
    $managedDepartments = DepartmentManager::where('manager_id', $user->id)
        ->pluck('department')
        ->toArray();
    
    if (empty($managedDepartments)) {
        return response()->json([
            'message' => 'You are not assigned as a manager to any department.'
        ], 404);
    }
    
    // Get pending overtimes for employees in these departments
    $pendingOvertimes = Overtime::with(['employee', 'creator'])
        ->where('status', 'pending')
        ->whereHas('employee', function($query) use ($managedDepartments) {
            $query->whereIn('Department', $managedDepartments);
        })
        ->orderBy('created_at', 'desc')
        ->get();
    
    return response()->json([
        'pendingOvertimes' => $pendingOvertimes
    ]);
}
}