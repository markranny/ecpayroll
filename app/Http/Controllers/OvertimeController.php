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
            'overtimes' => $overtimes,
            'employees' => $employees,
            'departments' => $departments,
            'rateMultipliers' => $rateMultipliers,
            'selectedOvertime' => $selectedOvertime,
            'userRoles' => $userRoles
        ]);
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
                $overtime->status = 'pending';
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
        'user_name' => $user->name,
        'user_roles' => $user->roles ? $user->roles->pluck('name') : 'No roles collection'
    ]);

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
     * Update the status of multiple overtime requests at once.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'overtime_ids' => 'required|array',
            'overtime_ids.*' => 'required|integer|exists:overtimes,id',
            'status' => 'required|in:manager_approved,approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);

        $user = Auth::user();
        $status = $validated['status'];
        $remarks = $validated['remarks'] ?? null;
        $successCount = 0;
        $failCount = 0;
        $errors = [];

        // Log the bulk action
        \Log::info('Bulk overtime status update initiated', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'count' => count($validated['overtime_ids']),
            'target_status' => $status
        ]);

        // Process each overtime record individually using the same logic as single updates
        foreach ($validated['overtime_ids'] as $overtimeId) {
            try {
                $overtime = Overtime::findOrFail($overtimeId);
                
                // Check permissions similar to the updateStatus method
                $canUpdate = false;
                $isForceApproval = $status === 'force_approved';
                
                // Only superadmin can force approve
                if ($isForceApproval && $user->hasRole('superadmin')) {
                    $canUpdate = true;
                    $actualStatus = 'approved'; // Force approval becomes a regular approval
                } 
                // Department manager approval
                elseif ($overtime->status === 'pending' && $status === 'manager_approved') {
                    $isDeptManager = $user->hasRole('department_manager') || 
                        (
                            $overtime->dept_manager_id === $user->id || 
                            DepartmentManager::where('manager_id', $user->id)
                                ->where('department', $overtime->employee->Department)
                                ->exists()
                        );
                
                    if ($isDeptManager || $user->hasRole('superadmin')) {
                        $canUpdate = true;
                        $actualStatus = $status;
                        \Log::info("User authorized as department manager for bulk approval", [
                            'user_id' => $user->id,
                            'overtime_id' => $overtime->id
                        ]);
                    }
                }
                // HRD manager approval
                elseif ($overtime->status === 'manager_approved' && $status === 'approved') {
                    if ($user->hasRole('hrd_manager') || $user->hasRole('superadmin')) {
                        $canUpdate = true;
                        $actualStatus = $status;
                    }
                }
                // Rejection handling
                elseif ($status === 'rejected') {
                    if (($overtime->status === 'pending' && 
                         ($user->hasRole('department_manager') || $user->hasRole('superadmin'))) ||
                        ($overtime->status === 'manager_approved' && 
                         ($user->hasRole('hrd_manager') || $user->hasRole('superadmin')))) {
                        $canUpdate = true;
                        $actualStatus = $status;
                    }
                }

                if (!$canUpdate) {
                    $failCount++;
                    $errors[] = "Unauthorized to update overtime #{$overtimeId}";
                    continue;
                }

                // Update the overtime status
                if ($overtime->status === 'pending') {
                    // Department manager approval/rejection
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = $remarks;
                } else if ($overtime->status === 'manager_approved') {
                    // HRD manager approval/rejection
                    $overtime->hrd_approved_by = $user->id;
                    $overtime->hrd_approved_at = now();
                    $overtime->hrd_remarks = $remarks;
                }

                // Special case for force approval by superadmin
                if ($isForceApproval) {
                    // Force approval should fill both approval levels
                    $overtime->dept_approved_by = $overtime->dept_approved_by ?: $user->id;
                    $overtime->dept_approved_at = $overtime->dept_approved_at ?: now();
                    $overtime->dept_remarks = $overtime->dept_remarks ?: 'Administrative override: ' . ($remarks ?? 'Force approved by admin');
                    
                    $overtime->hrd_approved_by = $user->id;
                    $overtime->hrd_approved_at = now();
                    $overtime->hrd_remarks = 'Administrative override: ' . ($remarks ?? 'Force approved by admin');
                }

                // Update the status
                $overtime->status = $actualStatus ?? $status;
                $overtime->save();
                
                $successCount++;
            } catch (\Exception $e) {
                \Log::error("Error updating overtime #{$overtimeId}: " . $e->getMessage());
                $failCount++;
                $errors[] = "Error updating overtime #{$overtimeId}: " . $e->getMessage();
            }
        }

        // Log the results
        \Log::info('Bulk overtime status update completed', [
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors
        ]);
        
        // Get fresh list of overtimes
        $overtimes = $this->getFilteredOvertimes($user);

        return response()->json([
            'message' => "{$successCount} overtime requests updated successfully." . 
                         ($failCount > 0 ? " {$failCount} updates failed." : ''),
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
            'overtimes' => $overtimes
        ]);
    }

    /**
     * Force approve overtime requests (admin only).
     */
    public function forceApprove(Request $request)
    {
        // Ensure only superadmins can force approve
        if (!Auth::user()->hasRole('superadmin')) {
            return response()->json([
                'message' => 'Only administrators can force approve overtime requests.'
            ], 403);
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
        
        // Get fresh list of overtimes
        $overtimes = $this->getFilteredOvertimes($user);
        
        return response()->json([
            'message' => "{$successCount} overtime requests force approved successfully." . 
                         ($failCount > 0 ? " {$failCount} force approvals failed." : ''),
            'success_count' => $successCount,
            'fail_count' => $failCount,
            'errors' => $errors,
            'overtimes' => $overtimes
        ]);
    }

    /**
     * Remove the specified overtime request.
     */
    public function destroy(Overtime $overtime)
    {
        $user = Auth::user();
        
        // Check if user is authorized to delete this overtime
        $canDelete = $user->hasRole('superadmin') || 
            $overtime->created_by === $user->id ||
            ($user->hasRole('department_manager') && (
                $overtime->dept_manager_id === $user->id || 
                DepartmentManager::where('manager_id', $user->id)
                    ->where('department', $overtime->employee->Department)
                    ->exists()
            ));
            
        // Only allow deletion of pending overtimes
        if (!$canDelete || $overtime->status !== 'pending') {
            return response()->json([
                'message' => 'You are not authorized to delete this overtime request.'
            ], 403);
        }
        
        try {
            $overtime->delete();
            
            // Get fresh list of overtimes
            $overtimes = $this->getFilteredOvertimes($user);
            
            return response()->json([
                'message' => 'Overtime request deleted successfully.',
                'overtimes' => $overtimes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error deleting overtime request: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export overtime data to Excel.
     */
    public function export(Request $request)
    {
        $user = Auth::user();
        
        // Get filter parameters
        $status = $request->query('status');
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');
        $search = $request->query('search');
        
        // Base query with relationships
        $query = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
        
        // Apply filters
        if ($status) {
            $query->where('status', $status);
        }
        
        if ($fromDate) {
            $query->whereDate('date', '>=', $fromDate);
        }
        
        if ($toDate) {
            $query->whereDate('date', '<=', $toDate);
        }
        
        if ($search) {
            $search = '%' . $search . '%';
            $query->where(function($q) use ($search) {
                $q->whereHas('employee', function($q2) use ($search) {
                    $q2->where('Fname', 'like', $search)
                        ->orWhere('Lname', 'like', $search)
                        ->orWhere('idno', 'like', $search)
                        ->orWhere('Department', 'like', $search);
                })->orWhere('reason', 'like', $search);
            });
        }
        
        // Limit access based on user role
        if (!$user->hasRole('superadmin') && !$user->hasRole('hrd_manager')) {
            if ($user->hasRole('department_manager')) {
                $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                    ->pluck('department')
                    ->toArray();
                    
                $query->where(function($q) use ($user, $managedDepartments) {
                    $q->where('created_by', $user->id)
                        ->orWhere('dept_manager_id', $user->id)
                        ->orWhereHas('employee', function($q2) use ($managedDepartments) {
                            $q2->whereIn('Department', $managedDepartments);
                        });
                });
            } else {
                // Regular employee - only see own overtimes
                $employeeId = $user->employee ? $user->employee->id : null;
                if ($employeeId) {
                    $query->where('employee_id', $employeeId);
                } else {
                    $query->where('created_by', $user->id);
                }
            }
        }
        
        // Order by date and creation date
        $query->orderBy('date', 'desc')->orderBy('created_at', 'desc');
        
        // Get data
        $overtimes = $query->get();
        
        // Create spreadsheet
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Employee ID');
        $sheet->setCellValue('C1', 'Employee Name');
        $sheet->setCellValue('D1', 'Department');
        $sheet->setCellValue('E1', 'Date');
        $sheet->setCellValue('F1', 'Start Time');
        $sheet->setCellValue('G1', 'End Time');
        $sheet->setCellValue('H1', 'Total Hours');
        $sheet->setCellValue('I1', 'Rate Multiplier');
        $sheet->setCellValue('J1', 'Reason');
        $sheet->setCellValue('K1', 'Status');
        $sheet->setCellValue('L1', 'Created By');
        $sheet->setCellValue('M1', 'Created At');
        $sheet->setCellValue('N1', 'Dept. Manager');
        $sheet->setCellValue('O1', 'Dept. Approved By');
        $sheet->setCellValue('P1', 'Dept. Approved At');
        $sheet->setCellValue('Q1', 'Dept. Remarks');
        $sheet->setCellValue('R1', 'HRD Approved By');
        $sheet->setCellValue('S1', 'HRD Approved At');
        $sheet->setCellValue('T1', 'HRD Remarks');
        
        // Fill data
        $row = 2;
        foreach ($overtimes as $overtime) {
            $sheet->setCellValue('A' . $row, $overtime->id);
            $sheet->setCellValue('B' . $row, $overtime->employee ? $overtime->employee->idno : 'N/A');
            $sheet->setCellValue('C' . $row, $overtime->employee ? 
                "{$overtime->employee->Lname}, {$overtime->employee->Fname} {$overtime->employee->MName}" : 'N/A');
            $sheet->setCellValue('D' . $row, $overtime->employee ? $overtime->employee->Department : 'N/A');
            $sheet->setCellValue('E' . $row, $overtime->date);
            $sheet->setCellValue('F' . $row, $overtime->start_time ? Carbon::parse($overtime->start_time)->format('H:i') : 'N/A');
            $sheet->setCellValue('G' . $row, $overtime->end_time ? Carbon::parse($overtime->end_time)->format('H:i') : 'N/A');
            $sheet->setCellValue('H' . $row, $overtime->total_hours);
            $sheet->setCellValue('I' . $row, $overtime->rate_multiplier . 'x');
            $sheet->setCellValue('J' . $row, $overtime->reason);
            $sheet->setCellValue('K' . $row, ucfirst(str_replace('_', ' ', $overtime->status)));
            $sheet->setCellValue('L' . $row, $overtime->creator ? $overtime->creator->name : 'N/A');
            $sheet->setCellValue('M' . $row, $overtime->created_at ? $overtime->created_at->format('Y-m-d H:i:s') : 'N/A');
            $sheet->setCellValue('N' . $row, $overtime->departmentManager ? $overtime->departmentManager->name : 'N/A');
            $sheet->setCellValue('O' . $row, $overtime->departmentApprover ? $overtime->departmentApprover->name : 'N/A');
            $sheet->setCellValue('P' . $row, $overtime->dept_approved_at ? Carbon::parse($overtime->dept_approved_at)->format('Y-m-d H:i:s') : 'N/A');
            $sheet->setCellValue('Q' . $row, $overtime->dept_remarks ?: 'N/A');
            $sheet->setCellValue('R' . $row, $overtime->hrdApprover ? $overtime->hrdApprover->name : 'N/A');
            $sheet->setCellValue('S' . $row, $overtime->hrd_approved_at ? Carbon::parse($overtime->hrd_approved_at)->format('Y-m-d H:i:s') : 'N/A');
            $sheet->setCellValue('T' . $row, $overtime->hrd_remarks ?: 'N/A');
            
            $row++;
        }
        
        // Auto-size columns
        foreach (range('A', 'T') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        
        // Create Excel file
        $writer = new Xlsx($spreadsheet);
        $filename = 'overtime_report_' . date('Y-m-d_His') . '.xlsx';
        $tempPath = storage_path('app/public/' . $filename);
        $writer->save($tempPath);
        
        // Return file for download
        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
    
    /**
     * Get user roles and permissions.
     */
    private function getUserRoles($user)
{
    // Check department manager directly from database first
    $isDepartmentManager = DepartmentManager::where('manager_id', $user->id)->exists();
    
    $userRoles = [
        'isSuperAdmin' => $user->hasRole('superadmin'),
        'isHrdManager' => $user->hasRole('hrd_manager'),
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
            
        \Log::info("User recognized as department manager", [
            'user_id' => $user->id,
            'direct_db_check' => $isDepartmentManager,
            'role_check' => $user->hasRole('department_manager'),
            'managed_departments' => $userRoles['managedDepartments']
        ]);
    }
    
    return $userRoles;
}

private function isHrdManager($user)
{
    // First try checking through the roles relationship
    if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
        if ($user->roles->contains('name', 'hrd_manager') || $user->roles->contains('slug', 'hrd_manager')) {
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
    
    /**
     * Get filtered overtimes based on user role.
     */
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