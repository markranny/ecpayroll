<?php
// app/Http/Controllers/TimeScheduleController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\TimeSchedule;
use App\Models\ScheduleType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Inertia\Inertia;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class TimeScheduleController extends Controller
{
    /**
     * Display the schedule change management page.
     */
    public function index()
    {
        $scheduleChanges = TimeSchedule::with(['employee', 'scheduleType'])->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        $scheduleTypes = ScheduleType::all();
        
        return Inertia::render('TimeSchedule/TimeSchedulePage', [
            'scheduleChanges' => $scheduleChanges,
            'employees' => $employees,
            'departments' => $departments,
            'scheduleTypes' => $scheduleTypes,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Store a new schedule change request.
     */
    public function store(Request $request)
    {
        Log::info('Schedule change store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:effective_date',
            'current_schedule' => 'nullable|string|max:100',
            'new_schedule' => 'nullable|string|max:100',
            'new_start_time' => 'required|date_format:H:i',
            'new_end_time' => 'required|date_format:H:i',
            'reason' => 'required|string|max:500',
            'schedule_type' => 'required|exists:schedule_types,id',
        ]);

        if ($validator->fails()) {
            Log::warning('Schedule change validation failed', [
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Format times
            $newStartTime = Carbon::parse($request->new_start_time)->format('H:i:s');
            $newEndTime = Carbon::parse($request->new_end_time)->format('H:i:s');
            
            // Check if current user is superadmin or hrd
            $user = Auth::user();
            $isAutoApproved = false;
            $userRole = 'unknown';
            
            Log::info('Checking user for auto-approval', [
                'user_id' => $user->id,
                'user_name' => $user->name
            ]);
            
            // Simple role detection
            if (stripos($user->name, 'admin') !== false || $user->id === 1) {
                $userRole = 'superadmin';
                $isAutoApproved = true;
            } elseif (stripos($user->name, 'hrd') !== false || stripos($user->email, 'hrd') !== false) {
                $userRole = 'hrd';
                $isAutoApproved = true;
            } else {
                // If we can't determine the role with certainty, try to use the route
                $routeName = request()->route() ? request()->route()->getName() : null;
                
                if ($routeName) {
                    if (strpos($routeName, 'superadmin.') === 0) {
                        $userRole = 'superadmin';
                        $isAutoApproved = true;
                    } elseif (strpos($routeName, 'hrd.') === 0) {
                        $userRole = 'hrd';
                        $isAutoApproved = true;
                    }
                }
            }
            
            // Provide a default for messaging
            $roleForDisplay = $isAutoApproved ? ucfirst($userRole) : 'standard user';
            
            // Batch create schedule change records for all selected employees
            $scheduleChanges = [];
            $employeeCount = count($request->employee_ids);
            
            Log::info('Starting batch creation of schedule change records', [
                'employee_count' => $employeeCount
            ]);
            
            foreach ($request->employee_ids as $employeeId) {
                $scheduleChange = new TimeSchedule([
                    'employee_id' => $employeeId,
                    'schedule_type_id' => $request->schedule_type,
                    'effective_date' => $request->effective_date,
                    'end_date' => $request->end_date,
                    'current_schedule' => $request->current_schedule,
                    'new_schedule' => $request->new_schedule,
                    'new_start_time' => $newStartTime,
                    'new_end_time' => $newEndTime,
                    'reason' => $request->reason,
                    'status' => $isAutoApproved ? 'approved' : 'pending',
                    'created_by' => Auth::id()
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $scheduleChange->approved_by = Auth::id();
                    $scheduleChange->approved_at = now();
                    $scheduleChange->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                }
                
                $scheduleChange->save();
                $scheduleChanges[] = $scheduleChange;
            }
            
            // Get updated list of all schedule changes to return to the frontend
            $allScheduleChanges = TimeSchedule::with(['employee', 'scheduleType'])->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Schedule change requests created and auto-approved successfully' 
                : 'Schedule change requests created successfully';
            
            Log::info('Schedule change store method completed successfully', [
                'user_id' => Auth::id(),
                'records_created' => count($scheduleChanges),
                'is_auto_approved' => $isAutoApproved,
                'message' => $successMessage
            ]);
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'scheduleChanges' => $allScheduleChanges
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create schedule change requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create schedule change requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Approve or reject a schedule change request.
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected',
            'remarks' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $scheduleChange = TimeSchedule::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($scheduleChange->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot update schedule change that has already been ' . $scheduleChange->status);
            }
            
            $scheduleChange->status = $request->status;
            $scheduleChange->remarks = $request->remarks;
            $scheduleChange->approved_by = Auth::id();
            $scheduleChange->approved_at = now();
            $scheduleChange->save();
            
            // Get updated list of all schedule changes to return to the frontend
            $allScheduleChanges = TimeSchedule::with(['employee', 'scheduleType'])->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Schedule change status updated successfully',
                'scheduleChanges' => $allScheduleChanges
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update schedule change status', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update schedule change status: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified schedule change.
     */
    public function destroy($id)
    {
        try {
            $scheduleChange = TimeSchedule::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($scheduleChange->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete schedule change that has already been ' . $scheduleChange->status);
            }
            
            $scheduleChange->delete();
            
            // Get updated list of all schedule changes to return to the frontend
            $allScheduleChanges = TimeSchedule::with(['employee', 'scheduleType'])->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Schedule change deleted successfully',
                'scheduleChanges' => $allScheduleChanges
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete schedule change', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete schedule change: ' . $e->getMessage());
        }
    }

    public function export(Request $request)
    {
        try {
            // Start with a base query
            $query = TimeSchedule::with(['employee', 'scheduleType', 'approver']);
            
            // Apply filters if provided
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
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
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('scheduleType', function($subQuery) use ($search) {
                        $subQuery->where('name', 'like', "%{$search}%");
                    });
                });
            }
            
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('effective_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('effective_date', '<=', $request->to_date);
            }
            
            // Get the filtered schedule changes
            $scheduleChanges = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Schedule Type');
            $sheet->setCellValue('G1', 'Effective Date');
            $sheet->setCellValue('H1', 'End Date');
            $sheet->setCellValue('I1', 'Current Schedule');
            $sheet->setCellValue('J1', 'New Schedule');
            $sheet->setCellValue('K1', 'New Hours');
            $sheet->setCellValue('L1', 'Status');
            $sheet->setCellValue('M1', 'Reason');
            $sheet->setCellValue('N1', 'Remarks');
            $sheet->setCellValue('O1', 'Filed Date');
            $sheet->setCellValue('P1', 'Action Date');
            $sheet->setCellValue('Q1', 'Approved/Rejected By');
            
            // Style headers
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4472C4'],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    ],
                ],
            ];
            
            $sheet->getStyle('A1:Q1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'Q') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($scheduleChanges as $scheduleChange) {
                $sheet->setCellValue('A' . $row, $scheduleChange->id);
                $sheet->setCellValue('B' . $row, $scheduleChange->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $scheduleChange->employee ? "{$scheduleChange->employee->Lname}, {$scheduleChange->employee->Fname} {$scheduleChange->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $scheduleChange->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $scheduleChange->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, $scheduleChange->scheduleType->name ?? 'N/A');
                $sheet->setCellValue('G' . $row, $scheduleChange->effective_date ? Carbon::parse($scheduleChange->effective_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, $scheduleChange->end_date ? Carbon::parse($scheduleChange->end_date)->format('Y-m-d') : 'Permanent');
                $sheet->setCellValue('I' . $row, $scheduleChange->current_schedule ?? 'N/A');
                $sheet->setCellValue('J' . $row, $scheduleChange->new_schedule ?? 'N/A');
                $sheet->setCellValue('K' . $row, ($scheduleChange->new_start_time && $scheduleChange->new_end_time) ? 
                    Carbon::parse($scheduleChange->new_start_time)->format('h:i A') . ' - ' . Carbon::parse($scheduleChange->new_end_time)->format('h:i A') : 'N/A');
                $sheet->setCellValue('L' . $row, ucfirst($scheduleChange->status));
                $sheet->setCellValue('M' . $row, $scheduleChange->reason ?? 'N/A');
                $sheet->setCellValue('N' . $row, $scheduleChange->remarks ?? 'N/A');
                $sheet->setCellValue('O' . $row, $scheduleChange->created_at ? Carbon::parse($scheduleChange->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('P' . $row, $scheduleChange->approved_at ? Carbon::parse($scheduleChange->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('Q' . $row, $scheduleChange->approver ? $scheduleChange->approver->name : 'N/A');
                
                // Apply status-based styling
                if ($scheduleChange->status === 'approved') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($scheduleChange->status === 'rejected') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($scheduleChange->status === 'pending') {
                    $sheet->getStyle('L' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:Q' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Schedule_Change_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
            // Create the Excel file
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            
            // Set header information for download
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            
            // Save file to php://output
            $writer->save('php://output');
            exit;
            
        } catch (\Exception $e) {
            Log::error('Failed to export schedule change data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export schedule change data: ' . $e->getMessage());
        }
    }
}