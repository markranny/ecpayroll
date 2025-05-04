<?php
// app/Http/Controllers/ChangeOffScheduleController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ChangeOffSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Inertia\Inertia;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ChangeOffScheduleController extends Controller
{
    /**
     * Display the change off schedule management page.
     */
    public function index()
    {
        $changeOffSchedules = ChangeOffSchedule::with('employee')->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        return Inertia::render('ChangeOffSchedule/ChangeOffSchedulePage', [
            'schedules' => $changeOffSchedules,
            'employees' => $employees,
            'departments' => $departments,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Store a new change off schedule request.
     */
    public function store(Request $request)
    {
        Log::info('Change Off Schedule store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'original_date' => 'required|date',
            'requested_date' => 'required|date|different:original_date',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            Log::warning('Change Off Schedule validation failed', [
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Check if current user is superadmin or hrd for auto-approval
            $user = Auth::user();
            $isAutoApproved = false;
            $userRole = 'unknown';
            
            // Simple role detection based on username and user ID
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
            
            // Provide a default for messaging if no specific role is found
            $roleForDisplay = $isAutoApproved ? ucfirst($userRole) : 'standard user';
            
            // Batch create change off schedule records for all selected employees
            $schedules = [];
            $employeeCount = count($request->employee_ids);
            
            foreach ($request->employee_ids as $employeeId) {
                $schedule = new ChangeOffSchedule([
                    'employee_id' => $employeeId,
                    'original_date' => $request->original_date,
                    'requested_date' => $request->requested_date,
                    'reason' => $request->reason,
                    'status' => $isAutoApproved ? 'approved' : 'pending'
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $schedule->approved_by = Auth::id();
                    $schedule->approved_at = now();
                    $schedule->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                }
                
                $schedule->save();
                $schedules[] = $schedule;
            }
            
            // Get updated list of all schedules to return to the frontend
            $allSchedules = ChangeOffSchedule::with('employee')->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Change Off Schedule requests created and auto-approved successfully' 
                : 'Change Off Schedule requests created successfully';
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'schedules' => $allSchedules
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create change off schedule requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create change off schedule requests: ' . $e->getMessage())
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
            $schedule = ChangeOffSchedule::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($schedule->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot update schedule change that has already been ' . $schedule->status);
            }
            
            $schedule->status = $request->status;
            $schedule->remarks = $request->remarks;
            $schedule->approved_by = Auth::id();
            $schedule->approved_at = now();
            $schedule->save();
            
            // Get updated list of all schedules to return to the frontend
            $allSchedules = ChangeOffSchedule::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Schedule change status updated successfully',
                'schedules' => $allSchedules
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
     * Remove the specified schedule change request.
     */
    public function destroy($id)
    {
        try {
            $schedule = ChangeOffSchedule::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($schedule->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete schedule change that has already been ' . $schedule->status);
            }
            
            $schedule->delete();
            
            // Get updated list of all schedules to return to the frontend
            $allSchedules = ChangeOffSchedule::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Schedule change deleted successfully',
                'schedules' => $allSchedules
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete schedule change', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete schedule change: ' . $e->getMessage());
        }
    }

    /**
     * Export schedule changes to Excel.
     */
    public function export(Request $request)
    {
        try {
            // Start with a base query
            $query = ChangeOffSchedule::with('employee', 'approver');
            
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
                    ->orWhere('reason', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('requested_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('requested_date', '<=', $request->to_date);
            }
            
            // Get the filtered schedule changes
            $schedules = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Original Date');
            $sheet->setCellValue('G1', 'Requested Date');
            $sheet->setCellValue('H1', 'Status');
            $sheet->setCellValue('I1', 'Reason');
            $sheet->setCellValue('J1', 'Remarks');
            $sheet->setCellValue('K1', 'Filed Date');
            $sheet->setCellValue('L1', 'Action Date');
            $sheet->setCellValue('M1', 'Approved/Rejected By');
            
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
            
            $sheet->getStyle('A1:M1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'M') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($schedules as $schedule) {
                $sheet->setCellValue('A' . $row, $schedule->id);
                $sheet->setCellValue('B' . $row, $schedule->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $schedule->employee ? "{$schedule->employee->Lname}, {$schedule->employee->Fname} {$schedule->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $schedule->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $schedule->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, $schedule->original_date ? Carbon::parse($schedule->original_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('G' . $row, $schedule->requested_date ? Carbon::parse($schedule->requested_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, ucfirst($schedule->status));
                $sheet->setCellValue('I' . $row, $schedule->reason ?? 'N/A');
                $sheet->setCellValue('J' . $row, $schedule->remarks ?? 'N/A');
                $sheet->setCellValue('K' . $row, $schedule->created_at ? Carbon::parse($schedule->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('L' . $row, $schedule->approved_at ? Carbon::parse($schedule->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('M' . $row, $schedule->approver ? $schedule->approver->name : 'N/A');
                
                // Apply status-based styling
                if ($schedule->status === 'approved') {
                    $sheet->getStyle('H' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($schedule->status === 'rejected') {
                    $sheet->getStyle('H' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($schedule->status === 'pending') {
                    $sheet->getStyle('H' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:M' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Change_Off_Schedule_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export change off schedule data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export change off schedule data: ' . $e->getMessage());
        }
    }
}