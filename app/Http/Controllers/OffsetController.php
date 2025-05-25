<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Offset;
use App\Models\OffsetBank;
use App\Models\OffsetType;
use App\Models\Employee;
use App\Models\DepartmentManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;

class OffsetController extends Controller
{
    /**
     * Display a listing of offsets.
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
            
        // Query offsets based on user role
        $offsetQuery = Offset::with(['employee', 'offset_type', 'approver']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own offsets
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $offsetQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see offsets from their department
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $offsetQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        // HRD managers and superadmins can see all offsets
        
        // Sort by latest first
        $offsetQuery->orderBy('created_at', 'desc');
        
        // Get active employees for the form
        $employees = Employee::where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get()
            ->map(function ($employee) {
                // Get offset bank info
                $bank = $employee->offsetBank;
                $remainingHours = $bank ? $bank->remaining_hours : 0;
                
                return [
                    'id' => $employee->id,
                    'idno' => $employee->idno,
                    'name' => "{$employee->Lname}, {$employee->Fname} {$employee->MName}",
                    'department' => $employee->Department,
                    'position' => $employee->Jobtitle,
                    'remaining_hours' => $remainingHours,
                ];
            });
            
        // Get offset types
        $offsetTypes = OffsetType::where('is_active', true)->get();
            
        // Check if a specific request is selected for viewing
        $selectedId = $request->input('selected');
        $selectedOffset = null;
        
        if ($selectedId) {
            $selectedOffset = Offset::with(['employee', 'offset_type', 'approver'])
                ->find($selectedId);
        }
        
        // Get the list of offset requests
        $offsets = $offsetQuery->get()->map(function ($offset) {
            // Get the employee's remaining offset hours
            $employee = $offset->employee;
            $remainingHours = $employee ? $employee->getRemainingOffsetHours() : 0;
            
            return array_merge($offset->toArray(), [
                'employee_remaining_hours' => $remainingHours
            ]);
        });
        
        return inertia('Offset/OffsetPage', [
            'auth' => [
                'user' => $user,
            ],
            'offsets' => $offsets,
            'employees' => $employees,
            'offsetTypes' => $offsetTypes,
            'departments' => $departments,
            'selectedOffset' => $selectedOffset,
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
     * Store a newly created offset request.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'offset_type_id' => 'required|integer|exists:offset_types,id',
            'date' => 'required|date',
            'workday' => 'required|date|different:date',
            'hours' => 'required|numeric|min:0.5|max:24',
            'reason' => 'required|string|max:1000',
            'transaction_type' => 'required|in:credit,debit',
        ]);
        
        $user = Auth::user();
        
        // Additional validation for 'debit' transaction type
        if ($validated['transaction_type'] === 'debit') {
            $employee = Employee::find($validated['employee_id']);
            $remainingHours = $employee->getRemainingOffsetHours();
            
            if ($validated['hours'] > $remainingHours) {
                return redirect()->back()->with('error', "Insufficient offset hours. Employee only has {$remainingHours} hours available.");
            }
        }
        
        DB::beginTransaction();
        
        try {
            $offset = new Offset();
            $offset->employee_id = $validated['employee_id'];
            $offset->offset_type_id = $validated['offset_type_id'];
            $offset->date = $validated['date'];
            $offset->workday = $validated['workday'];
            $offset->hours = $validated['hours'];
            $offset->reason = $validated['reason'];
            $offset->transaction_type = $validated['transaction_type'];
            $offset->status = 'pending';
            
            $offset->save();
            
            DB::commit();
            
            return redirect()->back()->with('message', 'Offset request created successfully');
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating offset request: ' . $e->getMessage());
        }
    }

    /**
     * Update the status of an offset request.
     */
    public function updateStatus(Request $request, $id)
    {
        $user = Auth::user();
        $offset = Offset::findOrFail($id);
        
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
            in_array($offset->employee->Department, $userRoles['managedDepartments']) &&
            !$isForceApproval) {
            $canUpdate = true;
        }
        // HRD manager or superadmin can approve/reject any request
        elseif (($userRoles['isHrdManager'] || $userRoles['isSuperAdmin']) && !$isForceApproval) {
            $canUpdate = true;
        }

        if (!$canUpdate) {
            return response()->json([
                'message' => 'You are not authorized to update this offset request.'
            ], 403);
        }

        DB::beginTransaction();
        
        try {
            // Special case for force approval by superadmin
            if ($isForceApproval) {
                $offset->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
            } else {
                $offset->remarks = $validated['remarks'];
            }
            
            $oldStatus = $offset->status;
            $offset->status = $validated['status'];
            $offset->approved_by = $user->id;
            $offset->approved_at = now();
            $offset->save();
            
            // Update offset bank if approved
            if ($offset->status === 'approved' && $oldStatus !== 'approved') {
                $employee = $offset->employee;
                
                // Create or get offset bank
                $offsetBank = $employee->offsetBank;
                if (!$offsetBank) {
                    $offsetBank = new OffsetBank([
                        'employee_id' => $employee->id,
                        'total_hours' => 0,
                        'used_hours' => 0,
                        'remaining_hours' => 0,
                        'last_updated' => now()
                    ]);
                    $offsetBank->save();
                }
                
                // Update bank based on transaction type
                if ($offset->transaction_type === 'credit') {
                    $offsetBank->addHours($offset->hours, "Credit from offset ID {$offset->id}");
                } else {
                    // Check if there are enough hours in the bank
                    if ($offsetBank->remaining_hours < $offset->hours) {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'Insufficient hours in offset bank. Employee only has ' . $offsetBank->remaining_hours . ' hours available.'
                        ], 400);
                    }
                    
                    $offsetBank->useHours($offset->hours, "Debit from offset ID {$offset->id}");
                }
                
                $offset->is_bank_updated = true;
                $offset->save();
            }
            
            // Undo bank update if status changed from approved to something else
            if ($oldStatus === 'approved' && $offset->status !== 'approved' && $offset->is_bank_updated) {
                $offsetBank = $offset->employee->offsetBank;
                
                if ($offsetBank) {
                    // Reverse the transaction
                    if ($offset->transaction_type === 'credit') {
                        // Subtract hours from bank
                        $offsetBank->useHours($offset->hours, "Reversal of credit from offset ID {$offset->id}");
                    } else {
                        // Add hours back to bank
                        $offsetBank->addHours($offset->hours, "Reversal of debit from offset ID {$offset->id}");
                    }
                    
                    $offset->is_bank_updated = false;
                    $offset->save();
                }
            }

            DB::commit();
            
            // Get fresh data
            $offset = Offset::with(['employee', 'offset_type', 'approver'])->find($offset->id);
            
            // Get full updated list
            $offsets = $this->getFilteredOffsets($user);

            return response()->json([
                'message' => 'Offset status updated successfully.',
                'offset' => $offset,
                'offsets' => $offsets
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update offset status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update the status of multiple offset requests.
     */
    public function bulkUpdateStatus(Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'offset_ids' => 'required|array',
            'offset_ids.*' => 'required|integer|exists:offsets,id',
            'status' => 'required|in:approved,rejected,force_approved',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['offset_ids'] as $offsetId) {
                $offset = Offset::findOrFail($offsetId);
                
                // Check permission
                $canUpdate = false;
                $userRoles = $this->getUserRoles($user);
                
                // Force approve option for superadmins
                if ($validated['status'] === 'force_approved' && $userRoles['isSuperAdmin']) {
                    $canUpdate = true;
                }
                // Department manager can approve/reject for their department
                elseif ($userRoles['isDepartmentManager'] && 
                    in_array($offset->employee->Department, $userRoles['managedDepartments']) &&
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
                    $errors[] = "Not authorized to update offset request #{$offsetId}";
                    continue;
                }
                
                $oldStatus = $offset->status;
                
                // Update the status
                if ($validated['status'] === 'force_approved') {
                    $offset->status = 'approved';
                    $offset->remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
                } else {
                    $offset->status = $validated['status'];
                    $offset->remarks = $validated['remarks'] ?? 'Bulk ' . $validated['status'];
                }
                $offset->approved_by = $user->id;
                $offset->approved_at = now();
                $offset->save();
                
                // Update offset bank if approved
                if ($offset->status === 'approved' && $oldStatus !== 'approved') {
                    $employee = $offset->employee;
                    
                    // Create or get offset bank
                    $offsetBank = $employee->offsetBank;
                    if (!$offsetBank) {
                        $offsetBank = new OffsetBank([
                            'employee_id' => $employee->id,
                            'total_hours' => 0,
                            'used_hours' => 0,
                            'remaining_hours' => 0,
                            'last_updated' => now()
                        ]);
                        $offsetBank->save();
                    }
                    
                    // For debit type, check if there are enough hours in the bank
                    if ($offset->transaction_type === 'debit' && $offsetBank->remaining_hours < $offset->hours) {
                        $errors[] = "Offset #{$offsetId}: Insufficient hours in offset bank. Employee only has " . $offsetBank->remaining_hours . " hours available.";
                        $failCount++;
                        continue;
                    }
                    
                    // Update bank based on transaction type
                    if ($offset->transaction_type === 'credit') {
                        $offsetBank->addHours($offset->hours, "Credit from offset ID {$offset->id}");
                    } else {
                        $offsetBank->useHours($offset->hours, "Debit from offset ID {$offset->id}");
                    }
                    
                    $offset->is_bank_updated = true;
                    $offset->save();
                }
                
                $successCount++;
            }
            
            DB::commit();
            
            $message = "{$successCount} offset requests updated successfully.";
            if ($failCount > 0) {
                $message .= " {$failCount} updates failed.";
            }
            
            return redirect()->back()->with([
                'message' => $message,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error updating offset statuses: ' . $e->getMessage());
        }
    }

    private function getFilteredOffsets($user)
    {
        $userRoles = $this->getUserRoles($user);
        
        $offsetQuery = Offset::with(['employee', 'offset_type', 'approver']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $offsetQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $offsetQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        $offsets = $offsetQuery->orderBy('created_at', 'desc')->get();
        
        // Add remaining hours to each offset
        return $offsets->map(function ($offset) {
            $employee = $offset->employee;
            $remainingHours = $employee ? $employee->getRemainingOffsetHours() : 0;
            
            return array_merge($offset->toArray(), [
                'employee_remaining_hours' => $remainingHours
            ]);
        });
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $offset = Offset::findOrFail($id);
        
        // Only allow deletion if status is pending and user has permission
        if ($offset->status !== 'pending') {
            return back()->with('error', 'Only pending offset requests can be deleted');
        }
        
        $userRoles = $this->getUserRoles($user);
        $canDelete = false;
        
        // Check permissions
        if ($userRoles['isSuperAdmin']) {
            $canDelete = true;
        } elseif ($offset->employee_id === $userRoles['employeeId']) {
            // Users can delete their own pending requests
            $canDelete = true;
        } elseif ($userRoles['isDepartmentManager'] && 
                in_array($offset->employee->Department, $userRoles['managedDepartments'])) {
            $canDelete = true;
        } elseif ($userRoles['isHrdManager']) {
            $canDelete = true;
        }
        
        if (!$canDelete) {
            return back()->with('error', 'You are not authorized to delete this offset request');
        }
        
        try {
            $offset->delete();
            return back()->with('message', 'Offset request deleted successfully');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to delete offset request: ' . $e->getMessage());
        }
    }

    /**
     * Export offset requests to Excel.
     */
    public function export(Request $request)
    {
        $filterStatus = $request->input('status');
        $searchTerm = $request->input('search');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        $offsetQuery = Offset::with(['employee', 'offset_type', 'approver']);
        
        // Apply role-based filtering
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $offsetQuery->where('employee_id', $employeeId);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $offsetQuery->whereHas('employee', function($q) use ($managedDepartments) {
                $q->whereIn('Department', $managedDepartments);
            });
        }
        
        // Apply filters
        if ($filterStatus) {
            $offsetQuery->where('status', $filterStatus);
        }
        
        if ($searchTerm) {
            $offsetQuery->where(function($query) use ($searchTerm) {
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
            $offsetQuery->whereDate('date', '>=', $fromDate);
        }
        
        if ($toDate) {
            $offsetQuery->whereDate('date', '<=', $toDate);
        }
        
        $offsets = $offsetQuery->orderBy('created_at', 'desc')->get();
        
        // Create Excel file
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Employee ID');
        $sheet->setCellValue('C1', 'Employee Name');
        $sheet->setCellValue('D1', 'Department');
        $sheet->setCellValue('E1', 'Type');
        $sheet->setCellValue('F1', 'Transaction');
        $sheet->setCellValue('G1', 'Date');
        $sheet->setCellValue('H1', 'Workday');
        $sheet->setCellValue('I1', 'Hours');
        $sheet->setCellValue('J1', 'Reason');
        $sheet->setCellValue('K1', 'Status');
        $sheet->setCellValue('L1', 'Approved By');
        $sheet->setCellValue('M1', 'Approved Date');
        $sheet->setCellValue('N1', 'Remarks');
        $sheet->setCellValue('O1', 'Created Date');
        $sheet->setCellValue('P1', 'Remaining Hours');
        
        // Add data
        $row = 2;
        foreach ($offsets as $offset) {
            $employee = $offset->employee;
            $bank = $employee ? $employee->offsetBank : null;
            $remainingHours = $bank ? $bank->remaining_hours : 0;
            
            $sheet->setCellValue('A' . $row, $offset->id);
            $sheet->setCellValue('B' . $row, $offset->employee ? $offset->employee->idno : '');
            $sheet->setCellValue('C' . $row, $offset->employee ? $offset->employee->Lname . ', ' . $offset->employee->Fname : '');
            $sheet->setCellValue('D' . $row, $offset->employee ? $offset->employee->Department : '');
            $sheet->setCellValue('E' . $row, $offset->offset_type ? $offset->offset_type->name : '');
            $sheet->setCellValue('F' . $row, ucfirst($offset->transaction_type));
            $sheet->setCellValue('G' . $row, $offset->date ? Carbon::parse($offset->date)->format('Y-m-d') : '');
            $sheet->setCellValue('H' . $row, $offset->workday ? Carbon::parse($offset->workday)->format('Y-m-d') : '');
            $sheet->setCellValue('I' . $row, $offset->hours);
            $sheet->setCellValue('J' . $row, $offset->reason);
            $sheet->setCellValue('K' . $row, ucfirst($offset->status));
            $sheet->setCellValue('L' . $row, $offset->approver ? $offset->approver->name : '');
            $sheet->setCellValue('M' . $row, $offset->approved_at ? Carbon::parse($offset->approved_at)->format('Y-m-d H:i:s') : '');
            $sheet->setCellValue('N' . $row, $offset->remarks);
            $sheet->setCellValue('O' . $row, $offset->created_at ? Carbon::parse($offset->created_at)->format('Y-m-d H:i:s') : '');
            $sheet->setCellValue('P' . $row, $remainingHours);
            $row++;
        }
        
        // Auto-size columns
        foreach (range('A', 'P') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        
        // Create writer and save
        $writer = new Xlsx($spreadsheet);
        $filename = 'Offset_Requests_' . date('Y-m-d_H-i-s') . '.xlsx';
        
        $tempFile = tempnam(sys_get_temp_dir(), 'offset_export_');
        $writer->save($tempFile);
        
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Force approve offset requests (admin only).
     */
    public function forceApprove(Request $request)
    {
        // Ensure only superadmins can force approve
        if (!$this->isSuperAdmin(Auth::user())) {
            return back()->with('error', 'Only administrators can force approve offset requests.');
        }
        
        $validated = $request->validate([
            'offset_ids' => 'required|array',
            'offset_ids.*' => 'required|integer|exists:offsets,id',
            'remarks' => 'nullable|string|max:500',
        ]);
        
        $user = Auth::user();
        $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
        $successCount = 0;
        $failCount = 0;
        $errors = [];
        
        // Log the force approval action
        \Log::info('Force approval of offset initiated', [
            'admin_id' => $user->id,
            'admin_name' => $user->name,
            'count' => count($validated['offset_ids'])
        ]);
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['offset_ids'] as $offsetId) {
                $offset = Offset::findOrFail($offsetId);
                
                // Skip already approved offsets
                if ($offset->status === 'approved') {
                    $errors[] = "Offset #{$offsetId} is already approved";
                    $failCount++;
                    continue;
                }
                
                $oldStatus = $offset->status;
                
                // Force approve
                $offset->status = 'approved';
                $offset->approved_by = $user->id;
                $offset->approved_at = now();
                $offset->remarks = 'Administrative override: ' . $remarks;
                $offset->save();
                
                // Update offset bank
                if ($oldStatus !== 'approved') {
                    $employee = $offset->employee;
                    
                    // Create or get offset bank
                    $offsetBank = $employee->offsetBank;
                    if (!$offsetBank) {
                        $offsetBank = new OffsetBank([
                            'employee_id' => $employee->id,
                            'total_hours' => 0,
                            'used_hours' => 0,
                            'remaining_hours' => 0,
                            'last_updated' => now()
                        ]);
                        $offsetBank->save();
                    }
                    
                    // For debit type, check if there are enough hours in the bank
                    if ($offset->transaction_type === 'debit' && $offsetBank->remaining_hours < $offset->hours) {
                        $errors[] = "Offset #{$offsetId}: Insufficient hours in offset bank. Employee only has " . $offsetBank->remaining_hours . " hours available.";
                        
                        // Skip this offset but continue processing others
                        $offset->status = $oldStatus; // Revert status change
                        $offset->approved_by = null;
                        $offset->approved_at = null;
                        $offset->remarks = null;
                        $offset->save();
                        
                        $failCount++;
                        continue;
                    }
                    
                    // Update bank based on transaction type
                    if ($offset->transaction_type === 'credit') {
                        $offsetBank->addHours($offset->hours, "Credit from offset ID {$offset->id} (force approved)");
                    } else {
                        $offsetBank->useHours($offset->hours, "Debit from offset ID {$offset->id} (force approved)");
                    }
                    
                    $offset->is_bank_updated = true;
                    $offset->save();
                }
                
                $successCount++;
                
                // Log individual approvals
                \Log::info("Force approved offset #{$offsetId}", [
                    'admin_id' => $user->id,
                    'offset_id' => $offsetId,
                    'previous_status' => $oldStatus
                ]);
            }
            
            DB::commit();
            
            // Create appropriate flash message
            $message = "{$successCount} offset requests force approved successfully.";
            if ($failCount > 0) {
                $message .= " {$failCount} force approvals failed.";
            }
            
            // Return with message
            return back()->with([
                'message' => $message,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Error during force approval: " . $e->getMessage());
            return back()->with('error', 'Error during force approval: ' . $e->getMessage());
        }
    }
    
    /**
     * Add hours directly to an employee's offset bank.
     */
    public function addHoursToBank(Request $request)
    {
        // Only HRD manager and superadmin can add hours directly
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        if (!$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            return response()->json([
                'message' => 'You are not authorized to perform this action.'
            ], 403);
        }
        
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'hours' => 'required|numeric|min:0.5|max:100',
            'notes' => 'nullable|string|max:500',
        ]);
        
        DB::beginTransaction();
        
        try {
            $employee = Employee::find($validated['employee_id']);
            
            // Create or get offset bank
            $offsetBank = $employee->offsetBank;
            if (!$offsetBank) {
                $offsetBank = new OffsetBank([
                    'employee_id' => $employee->id,
                    'total_hours' => 0,
                    'used_hours' => 0,
                    'remaining_hours' => 0,
                    'last_updated' => now()
                ]);
                $offsetBank->save();
            }
            
            // Add hours to bank
            $notes = $validated['notes'] ?? "Manual addition by {$user->name}";
            $offsetBank->addHours($validated['hours'], $notes);
            
            DB::commit();
            
            return response()->json([
                'message' => 'Hours added to offset bank successfully.',
                'offset_bank' => $offsetBank
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to add hours to offset bank: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get the offset bank details for an employee.
     */
    public function getOffsetBank($employeeId)
    {
        $employee = Employee::findOrFail($employeeId);
        $offsetBank = $employee->offsetBank;
        
        if (!$offsetBank) {
            return response()->json([
                'employee' => [
                    'id' => $employee->id,
                    'name' => "{$employee->Lname}, {$employee->Fname}",
                    'department' => $employee->Department,
                ],
                'offset_bank' => [
                    'total_hours' => 0,
                    'used_hours' => 0,
                    'remaining_hours' => 0,
                    'last_updated' => null,
                ]
            ]);
        }
        
        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'name' => "{$employee->Lname}, {$employee->Fname}",
                'department' => $employee->Department,
            ],
            'offset_bank' => [
                'total_hours' => $offsetBank->total_hours,
                'used_hours' => $offsetBank->used_hours,
                'remaining_hours' => $offsetBank->remaining_hours,
                'last_updated' => $offsetBank->last_updated ? Carbon::parse($offsetBank->last_updated)->format('Y-m-d H:i:s') : null,
                'notes' => $offsetBank->notes,
            ]
        ]);
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