<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Overtime;
use App\Models\Employee;
use App\Models\DepartmentManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;

class OvertimeController extends Controller
{
    /**
     * Display a listing of overtime requests.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        // Get all departments for filtering
        $departments = Employee::select('Department')
            ->distinct()
            ->whereNotNull('Department')
            ->orderBy('Department')
            ->pluck('Department')
            ->toArray();
            
        // Get available rate multipliers
        $rateMultipliers = [
            ['value' => 1.25, 'label' => 'Ordinary Weekday Overtime (125%)'],
            ['value' => 1.30, 'label' => 'Rest Day/Special Day (130%)'],
            ['value' => 1.50, 'label' => 'Scheduled Rest Day (150%)'],
            ['value' => 2.00, 'label' => 'Regular Holiday (200%)'],
            ['value' => 1.69, 'label' => 'Rest Day/Special Day Overtime (169%)'],
            ['value' => 1.95, 'label' => 'Scheduled Rest Day Overtime (195%)'],
            ['value' => 2.60, 'label' => 'Regular Holiday Overtime (260%)'],
            ['value' => 1.375, 'label' => 'Ordinary Weekday Overtime + Night Differential (137.5%)'],
            ['value' => 1.43, 'label' => 'Rest Day/Special Day + Night Differential (143%)'],
            ['value' => 1.65, 'label' => 'Scheduled Rest Day + Night Differential (165%)'],
            ['value' => 2.20, 'label' => 'Regular Holiday + Night Differential (220%)'],
            ['value' => 1.859, 'label' => 'Rest Day/Special Day Overtime + Night Differential (185.9%)'],
            ['value' => 2.145, 'label' => 'Scheduled Rest Day Overtime + Night Differential (214.5%)'],
            ['value' => 2.86, 'label' => 'Regular Holiday Overtime + Night Differential (286%)'],
        ];
        
        // Query overtimes based on user role
        $overtimesQuery = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own overtime requests
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $overtimesQuery->where('employee_id', $employeeId);
            } else {
                // If no employee record linked, show overtimes created by this user
                $overtimesQuery->where('created_by', $user->id);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see:
            // 1. Overtimes they created
            // 2. Overtimes assigned to them for approval
            // 3. Overtimes for employees in their department
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $overtimesQuery->where(function($query) use ($user, $managedDepartments) {
                $query->where('created_by', $user->id)
                    ->orWhere('dept_manager_id', $user->id)
                    ->orWhereHas('employee', function($q) use ($managedDepartments) {
                        $q->whereIn('Department', $managedDepartments);
                    });
            });
        } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // HRD managers can see all overtime requests
            // No additional filtering needed
        }
        
        // Sort by latest first
        $overtimesQuery->orderBy('created_at', 'desc');
        
        // Get active employees for the form
        $employees = Employee::where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get();
            
        // Check if a specific overtime is selected for viewing
        $selectedId = $request->input('selected');
        $selectedOvertime = null;
        
        if ($selectedId) {
            $selectedOvertime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
                ->find($selectedId);
        }
        
        // Get the list of overtimes
        $overtimes = $overtimesQuery->get();
        
        return inertia('Overtime/OvertimePage', [
            'auth' => [
                'user' => $user,
            ],
            'overtimes' => $overtimes,
            'employees' => $employees,
            'departments' => $departments,
            'rateMultipliers' => $rateMultipliers,
            'selectedOvertime' => $selectedOvertime,
            'userRoles' => $userRoles
        ]);
    }

    private function getUserRoles($user)
{
    // Check department manager directly from database first
    $isDepartmentManager = DepartmentManager::where('manager_id', $user->id)->exists();
    
    // Check if user is an HRD manager
    $isHrdManager = $this->isHrdManager($user);
    
    $userRoles = [
        'isSuperAdmin' => $user->hasRole('superadmin'),
        'isHrdManager' => $isHrdManager,
        'isDepartmentManager' => $isDepartmentManager || $user->hasRole('department_manager'),
        'isEmployee' => $user->is_employee || ($user->employee && $user->employee->exists()),
        'userId' => $user->id,
        'employeeId' => $user->employee ? $user->employee->id : null,
        'managedDepartments' => [],
    ];
    
    // If user is a department manager, get their managed departments
    if ($userRoles['isDepartmentManager']) {
        $userRoles['managedDepartments'] = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
    }
    
    return $userRoles;
}

/**
 * Bulk update the status of multiple overtime requests.
 */
public function bulkUpdateStatus(Request $request)
{
    $user = Auth::user();
    
    // Validate request
    $validated = $request->validate([
        'overtime_ids' => 'required|array',
        'overtime_ids.*' => 'required|integer|exists:overtimes,id',
        'status' => 'required|in:manager_approved,approved,rejected',
        'remarks' => 'nullable|string|max:500',
    ]);
    
    // Log the bulk update action
    \Log::info('Bulk update of overtime statuses initiated', [
        'user_id' => $user->id,
        'user_name' => $user->name,
        'count' => count($validated['overtime_ids']),
        'target_status' => $validated['status']
    ]);
    
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    DB::beginTransaction();
    
    try {
        foreach ($validated['overtime_ids'] as $overtimeId) {
            $overtime = Overtime::findOrFail($overtimeId);
            $currentStatus = $overtime->status;
            
            // Check permission for the specific overtime
            $canUpdate = false;
            
            // Department manager can approve pending overtime for their department
            if ($currentStatus === 'pending' && $validated['status'] === 'manager_approved') {
                $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);
                if ($isDeptManager || $this->isSuperAdmin($user)) {
                    $canUpdate = true;
                    
                    // Update department manager approval info
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = $validated['remarks'] ?? 'Bulk approved by department manager';
                }
            }
            // HRD manager can approve manager_approved overtime to final approved status
            elseif ($currentStatus === 'manager_approved' && $validated['status'] === 'approved') {
                if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                    $canUpdate = true;
                    
                    // Update HRD manager approval info
                    $overtime->hrd_approved_by = $user->id;
                    $overtime->hrd_approved_at = now();
                    $overtime->hrd_remarks = $validated['remarks'] ?? 'Bulk approved by HRD manager';
                }
            }
            // Either department manager or HRD manager can reject based on current status
            elseif ($validated['status'] === 'rejected') {
                if ($currentStatus === 'pending') {
                    // Department manager can reject pending overtime
                    $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);
                    if ($isDeptManager || $this->isSuperAdmin($user)) {
                        $canUpdate = true;
                        
                        // Update department manager rejection info
                        $overtime->dept_approved_by = $user->id;
                        $overtime->dept_approved_at = now();
                        $overtime->dept_remarks = $validated['remarks'] ?? 'Bulk rejected by department manager';
                    }
                } elseif ($currentStatus === 'manager_approved') {
                    // HRD manager can reject manager_approved overtime
                    if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                        $canUpdate = true;
                        
                        // Update HRD manager rejection info
                        $overtime->hrd_approved_by = $user->id;
                        $overtime->hrd_approved_at = now();
                        $overtime->hrd_remarks = $validated['remarks'] ?? 'Bulk rejected by HRD manager';
                    }
                }
            }
            
            // Skip if not authorized to update this overtime
            if (!$canUpdate) {
                $failCount++;
                $errors[] = "Not authorized to update overtime #{$overtimeId} from status '{$currentStatus}' to '{$validated['status']}'";
                continue;
            }
            
            // Update the status and save
            $overtime->status = $validated['status'];
            $overtime->save();
            $successCount++;
            
            \Log::info("Successfully updated overtime #{$overtimeId}", [
                'from_status' => $currentStatus,
                'to_status' => $validated['status'],
                'by_user' => $user->name
            ]);
        }
        
        DB::commit();
        
        // Create success message
        $message = "{$successCount} overtime requests updated successfully.";
        if ($failCount > 0) {
            $message .= " {$failCount} updates failed.";
        }
        
        return redirect()->back()->with('message', $message);
    } catch (\Exception $e) {
        DB::rollBack();
        
        \Log::error('Error during bulk overtime update', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return redirect()->back()->with('error', 'Error updating overtime statuses: ' . $e->getMessage());
    }
}

    private function isHrdManager($user)
{
    // First try checking through the roles relationship
    if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
        if ($user->roles->contains('name', 'hrd_manager') || $user->roles->contains('slug', 'hrd')) {
            return true;
        }
    }
    
    // Then try the hasRole method
    if (method_exists($user, 'hasRole') && $user->hasRole('hrd_manager')) {
        return true;
    }
    
    // Fallback check by name or email - adjust this based on your setup
    if (stripos($user->name, 'hrd manager') !== false || 
        stripos($user->email, 'hrd@') !== false ||
        stripos($user->email, 'hrdmanager') !== false) {
        return true;
    }
    
    return false;
}

    private function isSuperAdmin($user)
    {
        // First try checking through the roles relationship
        if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
            if ($user->roles->contains('name', 'superadmin') || $user->roles->contains('slug', 'superadmin')) {
                return true;
            }
        }
        
        // Then try the hasRole method
        if (method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            return true;
        }
        
        // Fallback check by user ID or name - adjust this based on your setup
        if ($user->id === 1 || stripos($user->name, 'admin') !== false) {
            return true;
        }
        
        return false;
    }

    /**
     * Store a newly created overtime request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'required|integer|exists:employees,id',
            'date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'reason' => 'required|string|max:1000',
            'rate_multiplier' => 'required|numeric',
        ]);
        
        // Calculate total hours
        $startTime = Carbon::parse($validated['date'] . ' ' . $validated['start_time']);
        $endTime = Carbon::parse($validated['date'] . ' ' . $validated['end_time']);
        
        // Handle case where end time is on the next day
        if ($endTime->lt($startTime)) {
            $endTime->addDay();
        }
        
        $totalHours = $endTime->diffInMinutes($startTime) / 60;
        
        // Get the current authenticated user
        $user = Auth::user();
        
        // Check if user is a department manager
        $userRoles = $this->getUserRoles($user);
        $isDepartmentManager = $userRoles['isDepartmentManager'];
        
        // Find the appropriate department manager for each employee
        $successCount = 0;
        $failCount = 0;
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['employee_ids'] as $employeeId) {
                $employee = Employee::find($employeeId);
                
                if (!$employee) {
                    continue;
                }
                
                // Find department manager for this employee
                $deptManager = DepartmentManager::where('department', $employee->Department)
                    ->first();
                
                $overtime = new Overtime();
                $overtime->employee_id = $employeeId;
                $overtime->date = $validated['date'];
                $overtime->start_time = $startTime;
                $overtime->end_time = $endTime;
                $overtime->total_hours = $totalHours;
                $overtime->rate_multiplier = $validated['rate_multiplier'];
                $overtime->reason = $validated['reason'];
                
                // Set initial status based on conditions
                // 1. If user is a department manager filing their own overtime and it's at least 4 hours
                if ($isDepartmentManager && $totalHours >= 4.0 && 
                    // Check if the employee is the department manager themselves
                    ($employeeId == $user->employee_id || 
                     ($employee->Department && DepartmentManager::where('manager_id', $user->id)
                                                         ->where('department', $employee->Department)
                                                         ->exists()))) {
                    
                    // Auto-approve at department manager level
                    $overtime->status = 'manager_approved';
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = 'Auto-approved (Department Manager)';
                } else {
                    // Normal pending status
                    $overtime->status = 'pending';
                }
                
                $overtime->created_by = $user->id;
                
                // Assign department manager if found
                if ($deptManager) {
                    $overtime->dept_manager_id = $deptManager->manager_id;
                }
                
                $overtime->save();
                $successCount++;
            }
            
            DB::commit();
            
            return redirect()->back()->with('message', "Successfully created {$successCount} overtime request(s)");
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating overtime requests: ' . $e->getMessage());
        }
    }


    private function isDepartmentManagerFor($user, $overtime)
{
    // First check if the user is directly assigned as the department manager for this overtime
    if ($overtime->dept_manager_id === $user->id) {
        return true;
    }
    
    // Then check if the user is a department manager for the employee's department
    $employeeDepartment = $overtime->employee ? $overtime->employee->Department : null;
    
    if ($employeeDepartment) {
        // Check directly in the department_managers table
        $isManager = DepartmentManager::where('manager_id', $user->id)
            ->where('department', $employeeDepartment)
            ->exists();
            
        if ($isManager) {
            return true;
        }
    }
    
    // Fallback to user role check
    if (method_exists($user, 'hasRole') && $user->hasRole('department_manager')) {
        // If user has department_manager role, check if they manage any departments
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)->count();
        return $managedDepartments > 0;
    }
    
    return false;
}

/**
 * Force approve overtime requests (admin only).
 */
public function forceApprove(Request $request)
{
    // Ensure only superadmins can force approve
    if (!$this->isSuperAdmin(Auth::user())) {
        return Inertia::render('Overtime/OvertimePage', [
            'auth' => ['user' => Auth::user()],
            'flash' => ['error' => 'Only administrators can force approve overtime requests.']
        ]);
    }
    
    $validated = $request->validate([
        'overtime_ids' => 'required|array',
        'overtime_ids.*' => 'required|integer|exists:overtimes,id',
        'remarks' => 'nullable|string|max:500',
    ]);
    
    $user = Auth::user();
    $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    // Log the force approval action
    \Log::info('Force approval of overtime initiated', [
        'admin_id' => $user->id,
        'admin_name' => $user->name,
        'count' => count($validated['overtime_ids'])
    ]);
    
    foreach ($validated['overtime_ids'] as $overtimeId) {
        try {
            $overtime = Overtime::findOrFail($overtimeId);
            
            // Skip already approved overtimes
            if ($overtime->status === 'approved') {
                $errors[] = "Overtime #{$overtimeId} is already approved";
                $failCount++;
                continue;
            }
            
            // Force approve - set all necessary approval information
            $overtime->dept_approved_by = $overtime->dept_approved_by ?: $user->id;
            $overtime->dept_approved_at = $overtime->dept_approved_at ?: now();
            $overtime->dept_remarks = $overtime->dept_remarks ?: 'Administrative override: ' . $remarks;
            
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = 'Administrative override: ' . $remarks;
            
            // Set status to approved
            $overtime->status = 'approved';
            $overtime->save();
            
            $successCount++;
            
            // Log individual approvals
            \Log::info("Force approved overtime #{$overtimeId}", [
                'admin_id' => $user->id,
                'overtime_id' => $overtimeId,
                'previous_status' => $overtime->getOriginal('status')
            ]);
        } catch (\Exception $e) {
            \Log::error("Error force approving overtime #{$overtimeId}: " . $e->getMessage());
            $failCount++;
            $errors[] = "Error force approving overtime #{$overtimeId}: " . $e->getMessage();
        }
    }
    
    // Create appropriate flash message
    $message = "{$successCount} overtime requests force approved successfully.";
    if ($failCount > 0) {
        $message .= " {$failCount} force approvals failed.";
    }
    
    // Query overtimes for refreshed data
    $overtimes = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
        ->orderBy('created_at', 'desc')
        ->get();
    
    // Get data required for the page
    $employees = Employee::where('JobStatus', 'Active')
        ->orderBy('Lname')
        ->get();
        
    $departments = Employee::select('Department')
        ->distinct()
        ->whereNotNull('Department')
        ->orderBy('Department')
        ->pluck('Department')
        ->toArray();
        
    $rateMultipliers = [
        ['value' => 1.25, 'label' => 'Ordinary Weekday Overtime (125%)'],
        ['value' => 1.30, 'label' => 'Rest Day/Special Day (130%)'],
        ['value' => 1.50, 'label' => 'Scheduled Rest Day (150%)'],
        ['value' => 2.00, 'label' => 'Regular Holiday (200%)'],
        ['value' => 1.69, 'label' => 'Rest Day/Special Day Overtime (169%)'],
        ['value' => 1.95, 'label' => 'Scheduled Rest Day Overtime (195%)'],
        ['value' => 2.60, 'label' => 'Regular Holiday Overtime (260%)'],
        ['value' => 1.375, 'label' => 'Ordinary Weekday Overtime + Night Differential (137.5%)'],
        ['value' => 1.43, 'label' => 'Rest Day/Special Day + Night Differential (143%)'],
        ['value' => 1.65, 'label' => 'Scheduled Rest Day + Night Differential (165%)'],
        ['value' => 2.20, 'label' => 'Regular Holiday + Night Differential (220%)'],
        ['value' => 1.859, 'label' => 'Rest Day/Special Day Overtime + Night Differential (185.9%)'],
        ['value' => 2.145, 'label' => 'Scheduled Rest Day Overtime + Night Differential (214.5%)'],
        ['value' => 2.86, 'label' => 'Regular Holiday Overtime + Night Differential (286%)'],
    ];
    
    // Get user roles for the page
    $userRoles = $this->getUserRoles($user);
    
    // Return Inertia response with data and flash message
    return Inertia::render('Overtime/OvertimePage', [
        'auth' => ['user' => Auth::user()],
        'overtimes' => $overtimes,
        'employees' => $employees,
        'departments' => $departments,
        'rateMultipliers' => $rateMultipliers,
        'userRoles' => $userRoles,
        'flash' => [
            'message' => $message,
            'errors' => $errors
        ]
    ]);
}

    /**
     * Update the status of an overtime request.
     */
    public function updateStatus(Request $request, Overtime $overtime)
{
    $user = Auth::user();
    
    // Validate request
    $validated = $request->validate([
        'status' => 'required|in:manager_approved,approved,rejected,force_approved',
        'remarks' => 'nullable|string|max:500',
    ]);

    // Log the action for debugging
    \Log::info('Updating overtime status', [
        'overtime_id' => $overtime->id,
        'current_status' => $overtime->status,
        'new_status' => $validated['status'],
        'user_id' => $user->id,
        'user_name' => $user->name
    ]);

    // If the status isn't changing, we should still update remarks if provided
    if ($overtime->status === $validated['status']) {
        try {
            // Just update remarks if they're provided
            if (!empty($validated['remarks'])) {
                if ($overtime->status === 'pending') {
                    $overtime->dept_remarks = $validated['remarks'];
                } else if ($overtime->status === 'manager_approved') {
                    $overtime->hrd_remarks = $validated['remarks'];
                }
                $overtime->save();
                
                \Log::info('Overtime remarks updated successfully', [
                    'overtime_id' => $overtime->id,
                    'status' => $overtime->status,
                    'by_user' => $user->name
                ]);
            }
            
            // Get fresh overtime data for the response
            $overtime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
                ->find($overtime->id);
                
            // Get full updated list
            $overtimes = $this->getFilteredOvertimes($user);

            return response()->json([
                'message' => 'Overtime remarks updated successfully.',
                'overtime' => $overtime,
                'overtimes' => $overtimes
            ]);
        } catch (\Exception $e) {
            // Log the error
            \Log::error('Failed to update overtime remarks', [
                'overtime_id' => $overtime->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return error response
            return response()->json([
                'message' => 'Failed to update overtime remarks: ' . $e->getMessage()
            ], 500);
        }
    }

    // Check permission for status update
    $canUpdate = false;
    $isForceApproval = $validated['status'] === 'force_approved';
    
    // Only superadmin can force approve
    if ($isForceApproval && $this->isSuperAdmin($user)) {
        $canUpdate = true;
        // Force approval becomes a regular approval but with admin override
        $validated['status'] = 'approved';
    } 
    // Department manager can approve pending overtime for their department
    elseif ($overtime->status === 'pending' && $validated['status'] === 'manager_approved') {
        // Check if user is a department manager for this overtime using the reliable method
        $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);

        if ($isDeptManager || $this->isSuperAdmin($user)) {
            $canUpdate = true;
        }
    }
    // HRD manager can approve manager_approved overtime to final approved status
    elseif ($overtime->status === 'manager_approved' && $validated['status'] === 'approved') {
        if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
            $canUpdate = true;
        }
    }
    // Either department manager or HRD manager can reject based on current status
    elseif ($validated['status'] === 'rejected') {
        if ($overtime->status === 'pending') {
            // Department manager can reject pending overtime
            $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);

            if ($isDeptManager || $this->isSuperAdmin($user)) {
                $canUpdate = true;
            }
        } elseif ($overtime->status === 'manager_approved') {
            // HRD manager can reject manager_approved overtime
            if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                $canUpdate = true;
            }
        }
    }

    if (!$canUpdate) {
        \Log::warning('Unauthorized overtime status update attempt', [
            'overtime_id' => $overtime->id,
            'user_id' => $user->id,
            'current_status' => $overtime->status,
            'requested_status' => $validated['status']
        ]);
        
        return response()->json([
            'message' => 'You are not authorized to update this overtime request status.'
        ], 403);
    }

    try {
        // Process the status update based on the current approval level
        if ($overtime->status === 'pending') {
            // Department manager approval/rejection
            $overtime->dept_approved_by = $user->id;
            $overtime->dept_approved_at = now();
            $overtime->dept_remarks = $validated['remarks'];
        } else if ($overtime->status === 'manager_approved') {
            // HRD manager approval/rejection
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = $validated['remarks'];
        }

        // Special case for force approval by superadmin
        if ($isForceApproval) {
            // Force approval should fill both approval levels
            if (!$overtime->dept_approved_by) {
                $overtime->dept_approved_by = $user->id;
                $overtime->dept_approved_at = now();
                $overtime->dept_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
            }
            
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
        }

        // Update the status
        $overtime->status = $validated['status'];
        $overtime->save();

        // Log success
        \Log::info('Overtime status updated successfully', [
            'overtime_id' => $overtime->id,
            'new_status' => $overtime->status,
            'by_user' => $user->name
        ]);

        // Get fresh overtime data for the response
        $overtime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
            ->find($overtime->id);
            
        // Get full updated list
        $overtimes = $this->getFilteredOvertimes($user);

        return response()->json([
            'message' => 'Overtime status updated successfully.',
            'overtime' => $overtime,
            'overtimes' => $overtimes
        ]);
    } catch (\Exception $e) {
        // Log the error
        \Log::error('Failed to update overtime status', [
            'overtime_id' => $overtime->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Return error response
        return response()->json([
            'message' => 'Failed to update overtime status: ' . $e->getMessage()
        ], 500);
    }
}

private function getFilteredOvertimes($user)
{
    $userRoles = $this->getUserRoles($user);
    
    // Query overtimes based on user role
    $overtimesQuery = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
    
    // Filter based on user roles
    if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // Regular employees can only see their own overtime requests
        $employeeId = $user->employee ? $user->employee->id : null;
        if ($employeeId) {
            $overtimesQuery->where('employee_id', $employeeId);
        } else {
            // If no employee record linked, show overtimes created by this user
            $overtimesQuery->where('created_by', $user->id);
        }
    } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
        // Department managers can see:
        // 1. Overtimes they created
        // 2. Overtimes assigned to them for approval
        // 3. Overtimes for employees in their department
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
            
        $overtimesQuery->where(function($query) use ($user, $managedDepartments) {
            $query->where('created_by', $user->id)
                ->orWhere('dept_manager_id', $user->id)
                ->orWhereHas('employee', function($q) use ($managedDepartments) {
                    $q->whereIn('Department', $managedDepartments);
                });
        });
    } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // HRD managers can see all overtime requests
        // No additional filtering needed
    }
    
    // Sort by latest first
    $overtimesQuery->orderBy('created_at', 'desc');
    
    return $overtimesQuery->get();
}
}