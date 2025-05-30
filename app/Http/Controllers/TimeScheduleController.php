<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\TimeSchedule;
use App\Models\Employee;
use App\Models\Department;  // Add this import
use App\Models\DepartmentManager;
use App\Models\ScheduleType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;

class TimeScheduleController extends Controller
{
    /**
     * Display a listing of time schedule change requests.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        // Get departments from the departments table instead of employees table
        $departments = Department::where('is_active', true)
            ->orderBy('name')
            ->pluck('name')
            ->toArray();
            
        // Query time schedules based on user role
        $timeScheduleQuery = TimeSchedule::with(['employee', 'approver', 'scheduleType']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own requests
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $timeScheduleQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see requests from their department
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $timeScheduleQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        // HRD managers and superadmins can see all requests
        
        // Sort by latest first
        $timeScheduleQuery->orderBy('created_at', 'desc');
        
        // Get active employees for the form - Enhanced mapping
        $employees = Employee::where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get()
            ->map(function ($employee) {
                // Handle null values properly
                $firstName = $employee->Fname ?? '';
                $lastName = $employee->Lname ?? '';
                $middleName = $employee->MName ?? '';
                $department = $employee->Department ?? '';
                $position = $employee->Jobtitle ?? '';
                
                // Build name properly
                $name = trim($lastName);
                if (!empty($firstName)) {
                    $name .= !empty($name) ? ', ' . $firstName : $firstName;
                }
                if (!empty($middleName)) {
                    $name .= ' ' . $middleName;
                }
                
                // If name is still empty, use employee ID
                if (empty($name)) {
                    $name = 'Employee #' . $employee->id;
                }
                
                return [
                    'id' => $employee->id,
                    'idno' => $employee->idno ?? '',
                    'name' => $name,
                    'department' => $department,
                    'position' => $position,
                    // Keep original fields for backward compatibility
                    'Fname' => $firstName,
                    'Lname' => $lastName,
                    'MName' => $middleName,
                    'Department' => $department,
                    'Jobtitle' => $position,
                ];
            });
            
        // Get schedule types
        $scheduleTypes = ScheduleType::where('is_active', true)
            ->orderBy('name')
            ->get();
            
        // Check if a specific request is selected for viewing
        $selectedId = $request->input('selected');
        $selectedTimeSchedule = null;
        
        if ($selectedId) {
            $selectedTimeSchedule = TimeSchedule::with(['employee', 'approver', 'scheduleType'])
                ->find($selectedId);
        }
        
        // Get the list of time schedule requests
        $timeSchedules = $timeScheduleQuery->get();
        
        return inertia('TimeSchedule/TimeSchedulePage', [
            'auth' => [
                'user' => $user,
            ],
            'timeSchedules' => $timeSchedules,
            'employees' => $employees,
            'departments' => $departments,
            'scheduleTypes' => $scheduleTypes,
            'selectedTimeSchedule' => $selectedTimeSchedule,
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
     * Store a newly created time schedule change request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'required|integer|exists:employees,id',
            'schedule_type_id' => 'required|exists:schedule_types,id',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:effective_date',
            'current_schedule' => 'nullable|string',
            'new_schedule' => 'required|string',
            'new_start_time' => 'required',
            'new_end_time' => 'required',
            'reason' => 'required|string|max:1000',
        ]);
        
        $user = Auth::user();
        $successCount = 0;
        $errorMessages = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['employee_ids'] as $employeeId) {
                $employee = Employee::find($employeeId);
                
                if (!$employee) {
                    $errorMessages[] = "Employee ID $employeeId not found";
                    continue;
                }
                
                // Check for duplicate time schedule entries
                $existingRequest = TimeSchedule::where('employee_id', $employeeId)
                    ->where('effective_date', $validated['effective_date'])
                    ->where('schedule_type_id', $validated['schedule_type_id'])
                    ->first();
                
                if ($existingRequest) {
                    $employeeName = ($employee->Fname ?? '') . ' ' . ($employee->Lname ?? '');
                    $errorMessages[] = "Time schedule change request for {$employeeName} starting {$validated['effective_date']} already exists";
                    continue;
                }
                
                $timeSchedule = new TimeSchedule();
                $timeSchedule->employee_id = $employeeId;
                $timeSchedule->schedule_type_id = $validated['schedule_type_id'];
                $timeSchedule->effective_date = $validated['effective_date'];
                $timeSchedule->end_date = $validated['end_date'];
                $timeSchedule->current_schedule = $validated['current_schedule'];
                $timeSchedule->new_schedule = $validated['new_schedule'];
                $timeSchedule->new_start_time = $validated['new_start_time'];
                $timeSchedule->new_end_time = $validated['new_end_time'];
                $timeSchedule->reason = $validated['reason'];
                $timeSchedule->status = 'pending';
                $timeSchedule->created_by = $user->id;
                
                $timeSchedule->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "Successfully created {$successCount} time schedule change request(s)";
            
            if (!empty($errorMessages)) {
                return redirect()->back()->with([
                    'message' => $message,
                    'errors' => $errorMessages
                ]);
            }
            
            return redirect()->back()->with('message', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating time schedule change requests: ' . $e->getMessage());
        }
    }

    /**
     * Update the status of a time schedule change request.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        $timeSchedule = TimeSchedule::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);

        // Check permission
        $canUpdate = false;
        $isForceApproval = $validated['status'] === 'force_approved';
        
        $userRoles = $this->getUserRoles($user);
        
        // Only superadmin can force approve
        if ($isForceApproval && $userRoles['isSuperAdmin']) {
            $canUpdate = true;
            // Force approval becomes a regular approval but with admin override
            $validated['status'] = 'approved';
        }
        // Department manager can approve/reject for their department
        elseif ($userRoles['isDepartmentManager'] && 
            in_array($timeSchedule->employee->Department, $userRoles['managedDepartments']) &&
            !$isForceApproval) {
            $canUpdate = true;
        }
        // HRD manager or superadmin can approve/reject any request
        elseif (($userRoles['isHrdManager'] || $userRoles['isSuperAdmin']) && !$isForceApproval) {
            $canUpdate = true;
        }

        if (!$canUpdate) {
            return back()->with('error', 'You are not authorized to update this time schedule change request.');
        }

        try {
            // Special case for force approval by superadmin
            if ($isForceApproval) {
                $timeSchedule->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
            } else {
                $timeSchedule->remarks = $validated['remarks'];
            }
            
            $timeSchedule->status = $validated['status'];
            $timeSchedule->approved_by = $user->id;
            $timeSchedule->approved_at = now();
            $timeSchedule->save();

            return redirect()->back()->with('message', 'Time schedule change status updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to update time schedule change status: ' . $e->getMessage());
        }
    }

    /**
     * Bulk update the status of multiple time schedule change requests.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'time_schedule_ids' => 'required|array',
            'time_schedule_ids.*' => 'required|integer|exists:time_schedules,id',
            'status' => 'required|in:approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['time_schedule_ids'] as $timeScheduleId) {
                $timeSchedule = TimeSchedule::findOrFail($timeScheduleId);
                
                // Check permission
                $canUpdate = false;
                $userRoles = $this->getUserRoles($user);
                
                // Force approve option for superadmins
                if ($validated['status'] === 'force_approved' && $userRoles['isSuperAdmin']) {
                    $canUpdate = true;
                }
                // Department manager can approve/reject for their department
                elseif ($userRoles['isDepartmentManager'] && 
                    in_array($timeSchedule->employee->Department, $userRoles['managedDepartments']) &&
                    $validated['status'] !== 'force_approved') {
                    $canUpdate = true;
                }
                // HRD manager or superadmin can approve/reject any request
                elseif (($userRoles['isHrdManager'] || $userRoles['isSuperAdmin']) && 
                    $validated['status'] !== 'force_approved') {
                    $canUpdate = true;
                }
                
                if (!$canUpdate) {
                    $failCount++;
                    $errors[] = "Not authorized to update time schedule change request #{$timeScheduleId}";
                    continue;
                }
                
                // Update the status
                if ($validated['status'] === 'force_approved') {
                    $timeSchedule->status = 'approved';
                    $timeSchedule->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
                } else {
                    $timeSchedule->status = $validated['status'];
                    $timeSchedule->remarks = $validated['remarks'] ?? 'Bulk ' . $validated['status'];
                }
                $timeSchedule->approved_by = $user->id;
                $timeSchedule->approved_at = now();
                $timeSchedule->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "{$successCount} time schedule change requests updated successfully.";
            if ($failCount > 0) {
                $message .= " {$failCount} updates failed.";
            }
            
            return redirect()->back()->with('message', $message);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating time schedule change statuses: ' . $e->getMessage());
        }
    }

    private function getFilteredTimeSchedules($user)
    {
        $userRoles = $this->getUserRoles($user);
        
        $timeScheduleQuery = TimeSchedule::with(['employee', 'approver', 'scheduleType']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $timeScheduleQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $timeScheduleQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        return $timeScheduleQuery->orderBy('created_at', 'desc')->get();
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $timeSchedule = TimeSchedule::findOrFail($id);
        
        // Only allow deletion if status is pending and user has permission
        if ($timeSchedule->status !== 'pending') {
            return back()->with('error', 'Only pending time schedule change requests can be deleted');
        }
        
        $userRoles = $this->getUserRoles($user);
        $canDelete = false;
        
        // Check permissions
        if ($userRoles['isSuperAdmin']) {
            $canDelete = true;
        } elseif ($timeSchedule->employee_id === $userRoles['employeeId']) {
            // Users can delete their own pending requests
            $canDelete = true;
        } elseif ($userRoles['isDepartmentManager'] && 
                in_array($timeSchedule->employee->Department, $userRoles['managedDepartments'])) {
            $canDelete = true;
        } elseif ($userRoles['isHrdManager']) {
            $canDelete = true;
        }
        
        if (!$canDelete) {
            return back()->with('error', 'You are not authorized to delete this time schedule change request');
        }
        
        try {
            $timeSchedule->delete();
            return back()->with('message', 'Time schedule change request deleted successfully');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to delete time schedule change request: ' . $e->getMessage());
        }
    }

    /**
     * Export time schedule change requests to Excel.
     */
    public function export(Request $request)
    {
        $filterStatus = $request->input('status');
        $searchTerm = $request->input('search');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        $timeScheduleQuery = TimeSchedule::with(['employee', 'approver', 'scheduleType']);
        
        // Apply role-based filtering
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $timeScheduleQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $timeScheduleQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        // Apply filters
        if ($filterStatus) {
            $timeScheduleQuery->where('status', $filterStatus);
        }
        
        if ($searchTerm) {
            $timeScheduleQuery->where(function($query) use ($searchTerm) {
                $query->whereHas('employee', function($q) use ($searchTerm) {
                    $q->where('Fname', 'like', "%{$searchTerm}%")
                      ->orWhere('Lname', 'like', "%{$searchTerm}%")
                      ->orWhere('idno', 'like', "%{$searchTerm}%")
                      ->orWhere('Department', 'like', "%{$searchTerm}%");
                })
                ->orWhere('reason', 'like', "%{$searchTerm}%")
                ->orWhere('new_schedule', 'like', "%{$searchTerm}%");
            });
        }
        
        if ($fromDate) {
            $timeScheduleQuery->whereDate('effective_date', '>=', $fromDate);
        }
        
        if ($toDate) {
            $timeScheduleQuery->whereDate('effective_date', '<=', $toDate);
        }
        
        $timeSchedules = $timeScheduleQuery->orderBy('created_at', 'desc')->get();
        
        // Create Excel file
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Employee ID');
        $sheet->setCellValue('C1', 'Employee Name');
        $sheet->setCellValue('D1', 'Department');
        $sheet->setCellValue('E1', 'Schedule Type');
        $sheet->setCellValue('F1', 'Effective Date');
        $sheet->setCellValue('G1', 'End Date');
        $sheet->setCellValue('H1', 'Current Schedule');
        $sheet->setCellValue('I1', 'New Schedule');
        $sheet->setCellValue('J1', 'New Start Time');
        $sheet->setCellValue('K1', 'New End Time');
        $sheet->setCellValue('L1', 'Reason');
        $sheet->setCellValue('M1', 'Status');
        $sheet->setCellValue('N1', 'Approved By');
        $sheet->setCellValue('O1', 'Approved Date');
        $sheet->setCellValue('P1', 'Remarks');
        $sheet->setCellValue('Q1', 'Created Date');
        
        // Add data
        $row = 2;
        foreach ($timeSchedules as $timeSchedule) {
            $sheet->setCellValue('A' . $row, $timeSchedule->id);
            $sheet->setCellValue('B' . $row, $timeSchedule->employee ? $timeSchedule->employee->idno : '');
            $sheet->setCellValue('C' . $row, $timeSchedule->employee ? $timeSchedule->employee->Lname . ', ' . $timeSchedule->employee->Fname : '');
            $sheet->setCellValue('D' . $row, $timeSchedule->employee ? $timeSchedule->employee->Department : '');
            $sheet->setCellValue('E' . $row, $timeSchedule->scheduleType ? $timeSchedule->scheduleType->name : '');
            $sheet->setCellValue('F' . $row, $timeSchedule->effective_date ? Carbon::parse($timeSchedule->effective_date)->format('Y-m-d') : '');
            $sheet->setCellValue('G' . $row, $timeSchedule->end_date ? Carbon::parse($timeSchedule->end_date)->format('Y-m-d') : '');
            $sheet->setCellValue('H' . $row, $timeSchedule->current_schedule);
            $sheet->setCellValue('I' . $row, $timeSchedule->new_schedule);
            $sheet->setCellValue('J' . $row, $timeSchedule->new_start_time ? Carbon::parse($timeSchedule->new_start_time)->format('h:i A') : '');
            $sheet->setCellValue('K' . $row, $timeSchedule->new_end_time ? Carbon::parse($timeSchedule->new_end_time)->format('h:i A') : '');
            $sheet->setCellValue('L' . $row, $timeSchedule->reason);
            $sheet->setCellValue('M' . $row, ucfirst($timeSchedule->status));
            $sheet->setCellValue('N' . $row, $timeSchedule->approver ? $timeSchedule->approver->name : '');
            $sheet->setCellValue('O' . $row, $timeSchedule->approved_at ? Carbon::parse($timeSchedule->approved_at)->format('Y-m-d H:i:s') : '');
            $sheet->setCellValue('P' . $row, $timeSchedule->remarks);
            $sheet->setCellValue('Q' . $row, $timeSchedule->created_at ? Carbon::parse($timeSchedule->created_at)->format('Y-m-d H:i:s') : '');
            $row++;
        }
        
        // Auto-size columns
        foreach (range('A', 'Q') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        
        // Create writer and save
        $writer = new Xlsx($spreadsheet);
        $filename = 'Time_Schedule_Change_' . date('Y-m-d_H-i-s') . '.xlsx';
        
        $tempFile = tempnam(sys_get_temp_dir(), 'timeschedule_export_');
        $writer->save($tempFile);
        
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Force approve time schedule change requests (admin only).
     */
    public function forceApprove(Request $request)
    {
        // Ensure only superadmins can force approve
        if (!$this->isSuperAdmin(Auth::user())) {
            return back()->with('error', 'Only administrators can force approve time schedule change requests.');
        }
        
        $validated = $request->validate([
            'time_schedule_ids' => 'required|array',
            'time_schedule_ids.*' => 'required|integer|exists:time_schedules,id',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $user = Auth::user();
        $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        // Log the force approval action
        \Log::info('Force approval of time schedule change initiated', [
            'admin_id' => $user->id,
            'admin_name' => $user->name,
            'count' => count($validated['time_schedule_ids'])
        ]);
        
        foreach ($validated['time_schedule_ids'] as $timeScheduleId) {
            try {
                $timeSchedule = TimeSchedule::findOrFail($timeScheduleId);
                
                // Skip already approved changes
                if ($timeSchedule->status === 'approved') {
                    $errors[] = "Time schedule change #{$timeScheduleId} is already approved";
                    $failCount++;
                    continue;
                }
                
                // Force approve
                $timeSchedule->status = 'approved';
                $timeSchedule->approved_by = $user->id;
                $timeSchedule->approved_at = now();
                $timeSchedule->remarks = 'Administrative override: ' . $remarks;
                $timeSchedule->save();
                
                $successCount++;
                
                // Log individual approvals
                \Log::info("Force approved time schedule change #{$timeScheduleId}", [
                    'admin_id' => $user->id,
                    'time_schedule_id' => $timeScheduleId,
                    'previous_status' => $timeSchedule->getOriginal('status')
                ]);
            } catch (\Exception $e) {
                \Log::error("Error force approving time schedule change #{$timeScheduleId}: " . $e->getMessage());
                $failCount++;
                $errors[] = "Error force approving time schedule change #{$timeScheduleId}: " . $e->getMessage();
            }
        }
        
        // Create appropriate flash message
        $message = "{$successCount} time schedule change requests force approved successfully.";
        if ($failCount > 0) {
            $message .= " {$failCount} force approvals failed.";
        }
        
        // Return with message
        return back()->with('message', $message);
    }

    private function isSuperAdmin($user)
    {
        if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
            if ($user->roles->contains('name', 'superadmin') || $user->roles->contains('slug', 'superadmin')) {
                return true;
            }
        }
        
        if (method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            return true;
        }
        
        return false;
    }

    private function isHrdManager($user)
    {
        if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
            if ($user->roles->contains('name', 'hrd_manager') || $user->roles->contains('slug', 'hrd')) {
                return true;
            }
        }
        
        if (method_exists($user, 'hasRole') && $user->hasRole('hrd_manager')) {
            return true;
        }
        
        return false;
    }
}