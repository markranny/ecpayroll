<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\ChangeOffSchedule;
use App\Models\Employee;
use App\Models\DepartmentManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;

class ChangeOffScheduleController extends Controller
{
    /**
     * Display a listing of change rest day requests.
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
            
        // Query change off schedules based on user role
        $changeOffQuery = ChangeOffSchedule::with(['employee', 'approver']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own requests
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $changeOffQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see requests from their department
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $changeOffQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        // HRD managers and superadmins can see all requests
        
        // Sort by latest first
        $changeOffQuery->orderBy('created_at', 'desc');
        
        // Get active employees for the form
        $employees = Employee::where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get();
            
        // Check if a specific request is selected for viewing
        $selectedId = $request->input('selected');
        $selectedChangeOff = null;
        
        if ($selectedId) {
            $selectedChangeOff = ChangeOffSchedule::with(['employee', 'approver'])
                ->find($selectedId);
        }
        
        // Get the list of change off requests
        $changeOffs = $changeOffQuery->get();
        
        return inertia('ChangeOffSchedule/ChangeRestdayPage', [
            'auth' => [
                'user' => $user,
            ],
            'changeOffs' => $changeOffs,
            'employees' => $employees,
            'departments' => $departments,
            'selectedChangeOff' => $selectedChangeOff,
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
     * Store a newly created change rest day request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'required|integer|exists:employees,id',
            'original_date' => 'required|date',
            'requested_date' => 'required|date|different:original_date',
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
                
                // Check for duplicate change off entries
                $existingRequest = ChangeOffSchedule::where('employee_id', $employeeId)
                    ->where('original_date', $validated['original_date'])
                    ->where('requested_date', $validated['requested_date'])
                    ->first();
                
                if ($existingRequest) {
                    $errorMessages[] = "Change rest day request for {$employee->Fname} {$employee->Lname} from {$validated['original_date']} to {$validated['requested_date']} already exists";
                    continue;
                }
                
                $changeOff = new ChangeOffSchedule();
                $changeOff->employee_id = $employeeId;
                $changeOff->original_date = $validated['original_date'];
                $changeOff->requested_date = $validated['requested_date'];
                $changeOff->reason = $validated['reason'];
                $changeOff->status = 'pending';
                
                $changeOff->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "Successfully created {$successCount} change rest day request(s)";
            
            if (!empty($errorMessages)) {
                return redirect()->back()->with([
                    'message' => $message,
                    'errors' => $errorMessages
                ]);
            }
            
            return redirect()->back()->with('message', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating change rest day requests: ' . $e->getMessage());
        }
    }

    /**
     * Update the status of a change rest day request.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        $changeOff = ChangeOffSchedule::findOrFail($id);
        
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
            in_array($changeOff->employee->Department, $userRoles['managedDepartments']) &&
            !$isForceApproval) {
            $canUpdate = true;
        }
        // HRD manager or superadmin can approve/reject any request
        elseif (($userRoles['isHrdManager'] || $userRoles['isSuperAdmin']) && !$isForceApproval) {
            $canUpdate = true;
        }

        if (!$canUpdate) {
            return response()->json([
                'message' => 'You are not authorized to update this change rest day request.'
            ], 403);
        }

        try {
            // Special case for force approval by superadmin
            if ($isForceApproval) {
                $changeOff->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
            } else {
                $changeOff->remarks = $validated['remarks'];
            }
            
            $changeOff->status = $validated['status'];
            $changeOff->approved_by = $user->id;
            $changeOff->approved_at = now();
            $changeOff->save();

            // Get fresh data
            $changeOff = ChangeOffSchedule::with(['employee', 'approver'])->find($changeOff->id);
            
            // Get full updated list
            $changeOffs = $this->getFilteredChangeOffs($user);

            return response()->json([
                'message' => 'Change rest day status updated successfully.',
                'changeOff' => $changeOff,
                'changeOffs' => $changeOffs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update change rest day status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update the status of multiple change rest day requests.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'change_off_ids' => 'required|array',
            'change_off_ids.*' => 'required|integer|exists:change_off_schedules,id',
            'status' => 'required|in:approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['change_off_ids'] as $changeOffId) {
                $changeOff = ChangeOffSchedule::findOrFail($changeOffId);
                
                // Check permission
                $canUpdate = false;
                $userRoles = $this->getUserRoles($user);
                
                // Force approve option for superadmins
                if ($validated['status'] === 'force_approved' && $userRoles['isSuperAdmin']) {
                    $canUpdate = true;
                }
                // Department manager can approve/reject for their department
                elseif ($userRoles['isDepartmentManager'] && 
                    in_array($changeOff->employee->Department, $userRoles['managedDepartments']) &&
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
                    $errors[] = "Not authorized to update change rest day request #{$changeOffId}";
                    continue;
                }
                
                // Update the status
                if ($validated['status'] === 'force_approved') {
                    $changeOff->status = 'approved';
                    $changeOff->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
                } else {
                    $changeOff->status = $validated['status'];
                    $changeOff->remarks = $validated['remarks'] ?? 'Bulk ' . $validated['status'];
                }
                $changeOff->approved_by = $user->id;
                $changeOff->approved_at = now();
                $changeOff->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "{$successCount} change rest day requests updated successfully.";
            if ($failCount > 0) {
                $message .= " {$failCount} updates failed.";
            }
            
            // Return Inertia response instead of JSON response
            return redirect()->back()->with('message', $message);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating change rest day statuses: ' . $e->getMessage());
        }
    }

    private function getFilteredChangeOffs($user)
    {
        $userRoles = $this->getUserRoles($user);
        
        $changeOffQuery = ChangeOffSchedule::with(['employee', 'approver']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $changeOffQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $changeOffQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        return $changeOffQuery->orderBy('created_at', 'desc')->get();
    }

    public function destroy($id)
{
    $user = Auth::user();
    $changeOff = ChangeOffSchedule::findOrFail($id);
    
    // Only allow deletion if status is pending and user has permission
    if ($changeOff->status !== 'pending') {
        return back()->with('error', 'Only pending change rest day requests can be deleted');
    }
    
    $userRoles = $this->getUserRoles($user);
    $canDelete = false;
    
    // Check permissions
    if ($userRoles['isSuperAdmin']) {
        $canDelete = true;
    } elseif ($changeOff->employee_id === $userRoles['employeeId']) {
        // Users can delete their own pending requests
        $canDelete = true;
    } elseif ($userRoles['isDepartmentManager'] && 
            in_array($changeOff->employee->Department, $userRoles['managedDepartments'])) {
        $canDelete = true;
    } elseif ($userRoles['isHrdManager']) {
        $canDelete = true;
    }
    
    if (!$canDelete) {
        return back()->with('error', 'You are not authorized to delete this change rest day request');
    }
    
    try {
        $changeOff->delete();
        return back()->with('message', 'Change rest day request deleted successfully');
    } catch (\Exception $e) {
        return back()->with('error', 'Failed to delete change rest day request: ' . $e->getMessage());
    }
}

    /**
     * Export change rest day requests to Excel.
     */
    public function export(Request $request)
    {
        $filterStatus = $request->input('status');
        $searchTerm = $request->input('search');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        $changeOffQuery = ChangeOffSchedule::with(['employee', 'approver']);
        
        // Apply role-based filtering
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $changeOffQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $changeOffQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        // Apply filters
        if ($filterStatus) {
            $changeOffQuery->where('status', $filterStatus);
        }
        
        if ($searchTerm) {
            $changeOffQuery->where(function($query) use ($searchTerm) {
                $query->whereHas('employee', function($q) use ($searchTerm) {
                    $q->where('Fname', 'like', "%{$searchTerm}%")
                      ->orWhere('Lname', 'like', "%{$searchTerm}%")
                      ->orWhere('idno', 'like', "%{$searchTerm}%")
                      ->orWhere('Department', 'like', "%{$searchTerm}%");
                })
                ->orWhere('reason', 'like', "%{$searchTerm}%");
            });
        }
        
        if ($fromDate) {
            $changeOffQuery->whereDate('original_date', '>=', $fromDate);
        }
        
        if ($toDate) {
            $changeOffQuery->whereDate('original_date', '<=', $toDate);
        }
        
        $changeOffs = $changeOffQuery->orderBy('created_at', 'desc')->get();
        
        // Create Excel file
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Employee ID');
        $sheet->setCellValue('C1', 'Employee Name');
        $sheet->setCellValue('D1', 'Department');
        $sheet->setCellValue('E1', 'Original Rest Day');
        $sheet->setCellValue('F1', 'Requested Rest Day');
        $sheet->setCellValue('G1', 'Reason');
        $sheet->setCellValue('H1', 'Status');
        $sheet->setCellValue('I1', 'Approved By');
        $sheet->setCellValue('J1', 'Approved Date');
        $sheet->setCellValue('K1', 'Remarks');
        $sheet->setCellValue('L1', 'Created Date');
        
        // Add data
        $row = 2;
        foreach ($changeOffs as $changeOff) {
            $sheet->setCellValue('A' . $row, $changeOff->id);
            $sheet->setCellValue('B' . $row, $changeOff->employee ? $changeOff->employee->idno : '');
            $sheet->setCellValue('C' . $row, $changeOff->employee ? $changeOff->employee->Lname . ', ' . $changeOff->employee->Fname : '');
            $sheet->setCellValue('D' . $row, $changeOff->employee ? $changeOff->employee->Department : '');
            $sheet->setCellValue('E' . $row, $changeOff->original_date ? Carbon::parse($changeOff->original_date)->format('Y-m-d') : '');
            $sheet->setCellValue('F' . $row, $changeOff->requested_date ? Carbon::parse($changeOff->requested_date)->format('Y-m-d') : '');
            $sheet->setCellValue('G' . $row, $changeOff->reason);
            $sheet->setCellValue('H' . $row, ucfirst($changeOff->status));
            $sheet->setCellValue('I' . $row, $changeOff->approver ? $changeOff->approver->name : '');
            $sheet->setCellValue('J' . $row, $changeOff->approved_at ? Carbon::parse($changeOff->approved_at)->format('Y-m-d H:i:s') : '');
            $sheet->setCellValue('K' . $row, $changeOff->remarks);
            $sheet->setCellValue('L' . $row, $changeOff->created_at ? Carbon::parse($changeOff->created_at)->format('Y-m-d H:i:s') : '');
            $row++;
        }
        
        // Auto-size columns
        foreach (range('A', 'L') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        
        // Create writer and save
        $writer = new Xlsx($spreadsheet);
        $filename = 'Change_Rest_Day_' . date('Y-m-d_H-i-s') . '.xlsx';
        
        $tempFile = tempnam(sys_get_temp_dir(), 'changeoff_export_');
        $writer->save($tempFile);
        
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Force approve change rest day requests (admin only).
     */
    public function forceApprove(Request $request)
    {
        // Ensure only superadmins can force approve
        if (!$this->isSuperAdmin(Auth::user())) {
            return back()->with('error', 'Only administrators can force approve change rest day requests.');
        }
        
        $validated = $request->validate([
            'change_off_ids' => 'required|array',
            'change_off_ids.*' => 'required|integer|exists:change_off_schedules,id',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $user = Auth::user();
        $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        // Log the force approval action
        \Log::info('Force approval of change rest day initiated', [
            'admin_id' => $user->id,
            'admin_name' => $user->name,
            'count' => count($validated['change_off_ids'])
        ]);
        
        foreach ($validated['change_off_ids'] as $changeOffId) {
            try {
                $changeOff = ChangeOffSchedule::findOrFail($changeOffId);
                
                // Skip already approved changes
                if ($changeOff->status === 'approved') {
                    $errors[] = "Change rest day #{$changeOffId} is already approved";
                    $failCount++;
                    continue;
                }
                
                // Force approve
                $changeOff->status = 'approved';
                $changeOff->approved_by = $user->id;
                $changeOff->approved_at = now();
                $changeOff->remarks = 'Administrative override: ' . $remarks;
                $changeOff->save();
                
                $successCount++;
                
                // Log individual approvals
                \Log::info("Force approved change rest day #{$changeOffId}", [
                    'admin_id' => $user->id,
                    'change_off_id' => $changeOffId,
                    'previous_status' => $changeOff->getOriginal('status')
                ]);
            } catch (\Exception $e) {
                \Log::error("Error force approving change rest day #{$changeOffId}: " . $e->getMessage());
                $failCount++;
                $errors[] = "Error force approving change rest day #{$changeOffId}: " . $e->getMessage();
            }
        }
        
        // Create appropriate flash message
        $message = "{$successCount} change rest day requests force approved successfully.";
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