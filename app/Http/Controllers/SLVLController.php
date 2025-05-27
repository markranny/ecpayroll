<?php
// app/Http/Controllers/SLVLController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\SLVL;
use App\Models\SLVLBank;
use App\Models\Department;
use App\Models\DepartmentManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class SLVLController extends Controller
{
    /**
     * Display the SLVL management page.
     */
    public function index()
    {
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        // Get leaves based on user role
        $leavesQuery = SLVL::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own leave requests
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $leavesQuery->where('employee_id', $employeeId);
            } else {
                $leavesQuery->where('created_by', $user->id);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see leaves for their departments
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $leavesQuery->where(function($query) use ($user, $managedDepartments) {
                $query->where('created_by', $user->id)
                    ->orWhere('dept_manager_id', $user->id)
                    ->orWhereHas('employee', function($q) use ($managedDepartments) {
                        $q->whereIn('Department', $managedDepartments);
                    });
            });
        } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // HRD managers can see all leave requests
            // No additional filtering needed
        }
        
        $leaves = $leavesQuery->latest()->get();
        
        // Get active employees for the form
        $employees = Employee::where('JobStatus', 'Active')
            ->whereHas('department', function($query) {
                $query->where('is_active', true);
            })
            ->orderBy('Lname')
            ->get();
            
        // Get active departments
        $departments = Department::where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->toArray();
            
        // Get leave types
        $leaveTypes = [
            ['value' => 'sick', 'label' => 'Sick Leave'],
            ['value' => 'vacation', 'label' => 'Vacation Leave'],
            ['value' => 'emergency', 'label' => 'Emergency Leave'],
            ['value' => 'bereavement', 'label' => 'Bereavement Leave'],
            ['value' => 'maternity', 'label' => 'Maternity Leave'],
            ['value' => 'paternity', 'label' => 'Paternity Leave'],
            ['value' => 'personal', 'label' => 'Personal Leave'],
            ['value' => 'study', 'label' => 'Study Leave'],
        ];

        return Inertia::render('SLVL/SLVLPage', [
            'leaves' => $leaves,
            'employees' => $employees,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'userRoles' => $userRoles,
            'auth' => [
                'user' => $user,
            ],
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
        
        // Fallback check by name or email
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
        
        // Fallback check by user ID or name
        if ($user->id === 1 || stripos($user->name, 'admin') !== false) {
            return true;
        }
        
        return false;
    }

    /**
     * Store multiple new leave records.
     */
    public function store(Request $request)
    {
        Log::info('SLVL store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token', 'documents'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'type' => 'required|string|in:sick,vacation,emergency,bereavement,maternity,paternity,personal,study',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'half_day' => 'sometimes|boolean',
            'am_pm' => 'required_if:half_day,true|in:am,pm',
            'with_pay' => 'sometimes|boolean',
            'reason' => 'required|string|max:500',
            'documents' => 'nullable|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:10240',
        ]);

        if ($validator->fails()) {
            Log::warning('SLVL validation failed', [
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Calculate total days
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $this->calculateLeaveDays($startDate, $endDate, $request->half_day, $request->am_pm);
            
            // Process document upload if provided
            $documentPath = null;
            if ($request->hasFile('documents')) {
                $file = $request->file('documents');
                $filename = time() . '_' . $file->getClientOriginalName();
                $documentPath = $file->storeAs('documents/slvl', $filename, 'public');
                
                Log::info('Document uploaded', [
                    'original_name' => $file->getClientOriginalName(),
                    'stored_as' => $documentPath
                ]);
            }
            
            // Get the current authenticated user
            $user = Auth::user();
            $userRoles = $this->getUserRoles($user);
            $isDepartmentManager = $userRoles['isDepartmentManager'];
            
            $successCount = 0;
            $skippedCount = 0;
            $errorMessages = [];
            
            DB::beginTransaction();
            
            foreach ($request->employee_ids as $employeeId) {
                $employee = Employee::with('department')->find($employeeId);
                
                if (!$employee) {
                    $errorMessages[] = "Employee ID $employeeId not found";
                    continue;
                }
                
                // Check if employee belongs to an active department
                if (!$employee->department || !$employee->department->is_active) {
                    $errorMessages[] = "Employee {$employee->Fname} {$employee->Lname} belongs to an inactive department";
                    continue;
                }
                
                // Check for overlapping leave requests
                $overlappingLeave = SLVL::where('employee_id', $employeeId)
                    ->where('status', '!=', 'rejected')
                    ->where(function($query) use ($startDate, $endDate) {
                        $query->where(function($q) use ($startDate, $endDate) {
                            $q->whereBetween('start_date', [$startDate, $endDate])
                              ->orWhereBetween('end_date', [$startDate, $endDate]);
                        })->orWhere(function($q) use ($startDate, $endDate) {
                            $q->where('start_date', '<=', $startDate)
                              ->where('end_date', '>=', $endDate);
                        });
                    })
                    ->first();
                
                if ($overlappingLeave) {
                    $skippedCount++;
                    $errorMessages[] = "Employee {$employee->Fname} {$employee->Lname} has overlapping leave request";
                    continue;
                }
                
                // Check SLVL bank balance if with_pay is true
                if ($request->with_pay && in_array($request->type, ['sick', 'vacation'])) {
                    $bankBalance = $this->getSLVLBankBalance($employeeId, $request->type);
                    if ($bankBalance < $totalDays) {
                        $errorMessages[] = "Employee {$employee->Fname} {$employee->Lname} has insufficient {$request->type} leave balance ({$bankBalance} days available, {$totalDays} days requested)";
                        continue;
                    }
                }
                
                // Find department manager for this employee
                $deptManager = DepartmentManager::where('department', $employee->department->name)
                    ->first();
                
                $leave = new SLVL([
                    'employee_id' => $employeeId,
                    'type' => $request->type,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'half_day' => $request->has('half_day') && $request->half_day ? true : false,
                    'am_pm' => $request->has('am_pm') ? $request->am_pm : null,
                    'total_days' => $totalDays,
                    'with_pay' => $request->has('with_pay') && $request->with_pay ? true : false,
                    'reason' => $request->reason,
                    'documents_path' => $documentPath ? '/storage/' . $documentPath : null,
                    'created_by' => $user->id,
                ]);
                
                // Set initial status based on conditions
                if ($isDepartmentManager && 
                    ($employeeId == $user->employee_id || 
                     ($employee->department && DepartmentManager::where('manager_id', $user->id)
                                                        ->where('department', $employee->department->name)
                                                        ->exists()))) {
                    
                    // Auto-approve at department manager level
                    $leave->status = 'manager_approved';
                    $leave->dept_approved_by = $user->id;
                    $leave->dept_approved_at = now();
                    $leave->dept_remarks = 'Auto-approved (Department Manager)';
                } else {
                    // Normal pending status
                    $leave->status = 'pending';
                }
                
                // Assign department manager if found
                if ($deptManager) {
                    $leave->dept_manager_id = $deptManager->manager_id;
                }
                
                $leave->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "Successfully created {$successCount} leave request(s)";
            if ($skippedCount > 0) {
                $message .= ". Skipped {$skippedCount} requests due to conflicts.";
            }
            
            if (!empty($errorMessages)) {
                return redirect()->back()->with([
                    'message' => $message,
                    'errors' => $errorMessages
                ]);
            }
            
            return redirect()->back()->with('message', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create leave requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create leave requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Calculate the number of leave days excluding weekends
     */
    private function calculateLeaveDays($startDate, $endDate, $halfDay = false, $amPm = null)
    {
        $totalDays = 0;
        $current = $startDate->copy();
        
        while ($current <= $endDate) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($current->dayOfWeek !== 0 && $current->dayOfWeek !== 6) {
                $totalDays++;
            }
            $current->addDay();
        }
        
        // Adjust for half day
        if ($halfDay && $totalDays == 1) {
            $totalDays = 0.5;
        }
        
        return $totalDays;
    }

    /**
     * Get SLVL bank balance for an employee
     */
    private function getSLVLBankBalance($employeeId, $leaveType)
    {
        $bank = SLVLBank::where('employee_id', $employeeId)
            ->where('leave_type', $leaveType)
            ->first();
            
        if (!$bank) {
            // Create default bank if doesn't exist
            $bank = SLVLBank::create([
                'employee_id' => $employeeId,
                'leave_type' => $leaveType,
                'total_days' => $leaveType === 'sick' ? 15 : 15, // Default 15 days each
                'used_days' => 0,
                'year' => now()->year
            ]);
        }
        
        return $bank->total_days - $bank->used_days;
    }

    /**
     * Get SLVL bank information for an employee
     */
    public function getSLVLBank(Request $request, $employeeId)
    {
        $banks = SLVLBank::where('employee_id', $employeeId)
            ->where('year', now()->year)
            ->get()
            ->keyBy('leave_type');
            
        $bankInfo = [];
        $leaveTypes = ['sick', 'vacation'];
        
        foreach ($leaveTypes as $type) {
            if (isset($banks[$type])) {
                $bank = $banks[$type];
                $bankInfo[$type] = [
                    'total_days' => $bank->total_days,
                    'used_days' => $bank->used_days,
                    'remaining_days' => $bank->total_days - $bank->used_days
                ];
            } else {
                // Create default if doesn't exist
                $defaultDays = 15; // Default 15 days for both sick and vacation
                SLVLBank::create([
                    'employee_id' => $employeeId,
                    'leave_type' => $type,
                    'total_days' => $defaultDays,
                    'used_days' => 0,
                    'year' => now()->year
                ]);
                
                $bankInfo[$type] = [
                    'total_days' => $defaultDays,
                    'used_days' => 0,
                    'remaining_days' => $defaultDays
                ];
            }
        }
        
        return response()->json($bankInfo);
    }

    /**
     * Bulk update the status of multiple leave requests.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $user = Auth::user();
        
        // Validate request
        $validated = $request->validate([
            'leave_ids' => 'required|array',
            'leave_ids.*' => 'required|integer|exists:slvls,id',
            'status' => 'required|in:manager_approved,approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        Log::info('Bulk update of leave statuses initiated', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'count' => count($validated['leave_ids']),
            'target_status' => $validated['status']
        ]);
        
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['leave_ids'] as $leaveId) {
                $leave = SLVL::findOrFail($leaveId);
                $currentStatus = $leave->status;
                
                // Check permission for the specific leave
                $canUpdate = $this->canUpdateLeaveStatus($user, $leave, $currentStatus, $validated['status']);
                
                if (!$canUpdate) {
                    $failCount++;
                    $errors[] = "Not authorized to update leave #{$leaveId} from status '{$currentStatus}' to '{$validated['status']}'";
                    continue;
                }
                
                // Update based on status
                $this->updateLeaveStatus($leave, $validated['status'], $validated['remarks'], $user);
                
                $successCount++;
                
                Log::info("Successfully updated leave #{$leaveId}", [
                    'from_status' => $currentStatus,
                    'to_status' => $validated['status'],
                    'by_user' => $user->name
                ]);
            }
            
            DB::commit();
            
            $message = "{$successCount} leave requests updated successfully." . 
                    ($failCount > 0 ? " {$failCount} updates failed." : "");
            
            return redirect()->back()->with('message', $message);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Error during bulk leave update', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Error updating leave statuses: ' . $e->getMessage());
        }
    }

    private function canUpdateLeaveStatus($user, $leave, $currentStatus, $newStatus)
    {
        $userRoles = $this->getUserRoles($user);
        
        // Superadmin can do anything
        if ($userRoles['isSuperAdmin']) {
            return true;
        }
        
        // Department manager approval
        if ($currentStatus === 'pending' && $newStatus === 'manager_approved') {
            return $this->isDepartmentManagerFor($user, $leave);
        }
        
        // HRD manager final approval
        if ($currentStatus === 'manager_approved' && $newStatus === 'approved') {
            return $userRoles['isHrdManager'];
        }
        
        // Rejection
        if ($newStatus === 'rejected') {
            if ($currentStatus === 'pending') {
                return $this->isDepartmentManagerFor($user, $leave);
            } elseif ($currentStatus === 'manager_approved') {
                return $userRoles['isHrdManager'];
            }
        }
        
        // Force approval (superadmin only)
        if ($newStatus === 'force_approved') {
            return $userRoles['isSuperAdmin'];
        }
        
        return false;
    }

    private function isDepartmentManagerFor($user, $leave)
    {
        // Check if user is assigned as department manager for this leave
        if ($leave->dept_manager_id === $user->id) {
            return true;
        }
        
        // Check if user manages the employee's department
        $employeeDepartment = $leave->employee ? $leave->employee->Department : null;
        
        if ($employeeDepartment) {
            return DepartmentManager::where('manager_id', $user->id)
                ->where('department', $employeeDepartment)
                ->exists();
        }
        
        return false;
    }

    private function updateLeaveStatus($leave, $status, $remarks, $user)
    {
        if ($leave->status === 'pending') {
            // Department manager approval/rejection
            $leave->dept_approved_by = $user->id;
            $leave->dept_approved_at = now();
            $leave->dept_remarks = $remarks ?? 'Bulk action by department manager';
        } elseif ($leave->status === 'manager_approved') {
            // HRD manager approval/rejection
            $leave->hrd_approved_by = $user->id;
            $leave->hrd_approved_at = now();
            $leave->hrd_remarks = $remarks ?? 'Bulk action by HRD manager';
        }
        
        // Handle force approval
        if ($status === 'force_approved') {
            if (!$leave->dept_approved_by) {
                $leave->dept_approved_by = $user->id;
                $leave->dept_approved_at = now();
                $leave->dept_remarks = 'Administrative override: ' . ($remarks ?? 'Force approved by admin');
            }
            
            $leave->hrd_approved_by = $user->id;
            $leave->hrd_approved_at = now();
            $leave->hrd_remarks = 'Administrative override: ' . ($remarks ?? 'Force approved by admin');
            
            $status = 'approved'; // Convert to regular approved status
        }
        
        // Update SLVL bank if approved and with pay
        if (($status === 'approved' || $status === 'manager_approved') && 
            $leave->with_pay && 
            in_array($leave->type, ['sick', 'vacation']) && 
            $leave->status !== 'approved') {
            
            $this->updateSLVLBank($leave->employee_id, $leave->type, $leave->total_days);
        }
        
        $leave->status = $status;
        $leave->save();
    }

    private function updateSLVLBank($employeeId, $leaveType, $daysUsed)
    {
        $bank = SLVLBank::where('employee_id', $employeeId)
            ->where('leave_type', $leaveType)
            ->where('year', now()->year)
            ->first();
            
        if ($bank) {
            $bank->used_days += $daysUsed;
            $bank->save();
        }
    }

    /**
     * Update the status of a leave request.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'status' => 'required|in:manager_approved,approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);

        try {
            $leave = SLVL::findOrFail($id);
            $currentStatus = $leave->status;
            
            // Check permission
            $canUpdate = $this->canUpdateLeaveStatus($user, $leave, $currentStatus, $validated['status']);
            
            if (!$canUpdate) {
                return response()->json([
                    'message' => 'You are not authorized to update this leave request status.'
                ], 403);
            }
            
            // Update the status
            $this->updateLeaveStatus($leave, $validated['status'], $validated['remarks'], $user);
            
            // Get fresh leave data for the response
            $leave = SLVL::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
                ->find($leave->id);
            
            return response()->json([
                'message' => 'Leave status updated successfully.',
                'leave' => $leave
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to update leave status', [
                'leave_id' => $id,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'message' => 'Failed to update leave status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified leave request.
     */
    public function destroy($id)
    {
        try {
            $leave = SLVL::findOrFail($id);
            $user = Auth::user();
            
            // Check authorization
            if (!$this->isSuperAdmin($user) && 
                $leave->created_by !== $user->id && 
                !($this->isDepartmentManagerFor($user, $leave) && $leave->status === 'pending')) {
                
                return back()->with('error', 'You are not authorized to delete this leave request');
            }
            
            // Can only delete if status is pending
            if ($leave->status !== 'pending') {
                return back()->with('error', 'Only pending leave requests can be deleted');
            }
            
            // Delete the document file if it exists
            if ($leave->documents_path) {
                $path = str_replace('/storage/', '', $leave->documents_path);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                    Log::info('Document deleted', ['path' => $path]);
                }
            }
            
            $leave->delete();
            
            Log::info('Leave request deleted', [
                'leave_id' => $leave->id,
                'deleted_by' => $user->name,
                'user_id' => $user->id
            ]);
            
            return redirect()->back()->with('message', 'Leave request deleted successfully');
            
        } catch (\Exception $e) {
            Log::error('Failed to delete leave request', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete leave request: ' . $e->getMessage());
        }
    }

    /**
     * Export leave data to Excel.
     */
    public function export(Request $request)
    {
        try {
            $user = Auth::user();
            $userRoles = $this->getUserRoles($user);
            
            // Start with filtered query based on user role
            $query = SLVL::with('employee', 'approver');
            
            // Apply role-based filtering (same as index method)
            if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
                $employeeId = $user->employee ? $user->employee->id : null;
                if ($employeeId) {
                    $query->where('employee_id', $employeeId);
                } else {
                    $query->where('created_by', $user->id);
                }
            } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
                $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                    ->pluck('department')
                    ->toArray();
                    
                $query->where(function($q) use ($user, $managedDepartments) {
                    $q->where('created_by', $user->id)
                        ->orWhere('dept_manager_id', $user->id)
                        ->orWhereHas('employee', function($subQ) use ($managedDepartments) {
                            $subQ->whereIn('Department', $managedDepartments);
                        });
                });
            }
            
            // Apply additional filters from request
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }
            
            if ($request->has('type') && $request->type) {
                $query->where('type', $request->type);
            }
            
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->whereHas('employee', function($subQuery) use ($search) {
                        $subQuery->where('Fname', 'like', "%{$search}%")
                            ->orWhere('Lname', 'like', "%{$search}%")
                            ->orWhere('idno', 'like', "%{$search}%")
                            ->orWhere('Department', 'like', "%{$search}%");
                    })
                    ->orWhere('reason', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('start_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('start_date', '<=', $request->to_date);
            }
            
            // Get the filtered leaves
            $leaves = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Leave Type');
            $sheet->setCellValue('G1', 'Start Date');
            $sheet->setCellValue('H1', 'End Date');
            $sheet->setCellValue('I1', 'Total Days');
            $sheet->setCellValue('J1', 'Half Day');
            $sheet->setCellValue('K1', 'With Pay');
            $sheet->setCellValue('L1', 'Status');
            $sheet->setCellValue('M1', 'Reason');
            $sheet->setCellValue('N1', 'Dept. Remarks');
            $sheet->setCellValue('O1', 'HRD Remarks');
            $sheet->setCellValue('P1', 'Filed Date');
            $sheet->setCellValue('Q1', 'Action Date');
            $sheet->setCellValue('R1', 'Approved/Rejected By');
            
            // Style headers
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4472C4'],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                    ],
                ],
            ];
            
            $sheet->getStyle('A1:R1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'R') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($leaves as $leave) {
                $sheet->setCellValue('A' . $row, $leave->id);
                $sheet->setCellValue('B' . $row, $leave->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $leave->employee ? "{$leave->employee->Lname}, {$leave->employee->Fname} {$leave->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $leave->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $leave->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, ucfirst($leave->type) . ' Leave');
                $sheet->setCellValue('G' . $row, $leave->start_date ? Carbon::parse($leave->start_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, $leave->end_date ? Carbon::parse($leave->end_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('I' . $row, $leave->total_days ?? 'N/A');
                $sheet->setCellValue('J' . $row, $leave->half_day ? ($leave->am_pm ? strtoupper($leave->am_pm) . ' Half-Day' : 'Yes') : 'No');
                $sheet->setCellValue('K' . $row, $leave->with_pay ? 'Yes' : 'No');
                $sheet->setCellValue('L' . $row, ucfirst($leave->status));
                $sheet->setCellValue('M' . $row, $leave->reason ?? 'N/A');
                $sheet->setCellValue('N' . $row, $leave->dept_remarks ?? 'N/A');
                $sheet->setCellValue('O' . $row, $leave->hrd_remarks ?? 'N/A');
                $sheet->setCellValue('P' . $row, $leave->created_at ? Carbon::parse($leave->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('Q' . $row, $leave->dept_approved_at ? Carbon::parse($leave->dept_approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('R' . $row, $leave->departmentApprover ? $leave->departmentApprover->name : ($leave->hrdApprover ? $leave->hrdApprover->name : 'N/A'));
                
                // Apply status-based styling
                if ($leave->status === 'approved') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($leave->status === 'rejected') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($leave->status === 'pending') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:R' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'SLVL_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
            // Create the Excel file
            $writer = new Xlsx($spreadsheet);
            
            // Save to temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'slvl_export_');
            $writer->save($tempFile);
            
            // Return response
            return response()->download($tempFile, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);
            
        } catch (\Exception $e) {
            Log::error('Failed to export SLVL data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export SLVL data: ' . $e->getMessage());
        }
    }

    /**
     * Add days to SLVL bank (HRD and Superadmin only)
     */
    public function addDaysToBank(Request $request)
    {
        $user = Auth::user();
        
        // Only HRD and superadmin can add days to bank
        if (!$this->isHrdManager($user) && !$this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|in:sick,vacation',
            'days' => 'required|numeric|min:0.5|max:365',
            'reason' => 'required|string|max:500',
        ]);
        
        try {
            DB::beginTransaction();
            
            $bank = SLVLBank::updateOrCreate(
                [
                    'employee_id' => $validated['employee_id'],
                    'leave_type' => $validated['leave_type'],
                    'year' => now()->year
                ],
                [
                    'total_days' => DB::raw('total_days + ' . $validated['days'])
                ]
            );
            
            // Log the bank addition
            Log::info('SLVL bank days added', [
                'employee_id' => $validated['employee_id'],
                'leave_type' => $validated['leave_type'],
                'days_added' => $validated['days'],
                'reason' => $validated['reason'],
                'added_by' => $user->name,
                'added_by_id' => $user->id
            ]);
            
            DB::commit();
            
            return response()->json([
                'message' => "Successfully added {$validated['days']} {$validated['leave_type']} days to bank",
                'bank' => $bank
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to add days to SLVL bank', [
                'error' => $e->getMessage(),
                'request' => $validated
            ]);
            
            return response()->json([
                'message' => 'Failed to add days to bank: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Force approve leave requests (admin only).
     */
    public function forceApprove(Request $request)
    {
        if (!$this->isSuperAdmin(Auth::user())) {
            return back()->with('error', 'Only administrators can force approve leave requests.');
        }
        
        $validated = $request->validate([
            'leave_ids' => 'required|array',
            'leave_ids.*' => 'required|integer|exists:slvls,id',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $user = Auth::user();
        $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        Log::info('Force approval of leave requests initiated', [
            'admin_id' => $user->id,
            'admin_name' => $user->name,
            'count' => count($validated['leave_ids'])
        ]);
        
        foreach ($validated['leave_ids'] as $leaveId) {
            try {
                $leave = SLVL::findOrFail($leaveId);
                
                // Skip already approved leaves
                if ($leave->status === 'approved') {
                    $errors[] = "Leave #{$leaveId} is already approved";
                    $failCount++;
                    continue;
                }
                
                // Force approve
                $this->updateLeaveStatus($leave, 'force_approved', $remarks, $user);
                
                $successCount++;
                
                Log::info("Force approved leave #{$leaveId}", [
                    'admin_id' => $user->id,
                    'leave_id' => $leaveId,
                    'previous_status' => $leave->getOriginal('status')
                ]);
            } catch (\Exception $e) {
                Log::error("Error force approving leave #{$leaveId}: " . $e->getMessage());
                $failCount++;
                $errors[] = "Error force approving leave #{$leaveId}: " . $e->getMessage();
            }
        }
        
        $message = "{$successCount} leave requests force approved successfully.";
        if ($failCount > 0) {
            $message .= " {$failCount} force approvals failed.";
        }
        
        return back()->with([
            'message' => $message,
            'errors' => $errors
        ]);
    }
}