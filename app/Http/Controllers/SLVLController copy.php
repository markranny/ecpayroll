<?php
// app/Http/Controllers/SLVLController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\SLVL;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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
     * Display the leave management page.
     */
    public function index()
    {
        $leaves = SLVL::with('employee')->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        return Inertia::render('SLVL/SLVLPage', [
            'leaves' => $leaves,
            'employees' => $employees,
            'departments' => $departments,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
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
            'type' => 'required|string|in:sick,vacation,emergency,bereavement,maternity,paternity',
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
            $totalDays = $endDate->diffInDays($startDate) + 1; // +1 to include both start and end days
            
            // Adjust for half day
            if ($request->has('half_day') && $request->half_day) {
                $totalDays -= 0.5;
            }
            
            // Process document upload if provided
            $documentPath = null;
            if ($request->hasFile('documents')) {
                $file = $request->file('documents');
                $filename = time() . '_' . $file->getClientOriginalName();
                
                // Store in the public disk under a 'documents' directory
                $documentPath = $file->storeAs('documents', $filename, 'public');
                
                Log::info('Document uploaded', [
                    'original_name' => $file->getClientOriginalName(),
                    'stored_as' => $documentPath
                ]);
            }
            
            // Check if current user is superadmin or hrd
            $user = Auth::user();
            $isAutoApproved = false;
            $userRole = 'unknown';
            
            Log::info('Checking user for auto-approval', [
                'user_id' => $user->id,
                'user_name' => $user->name
            ]);
            
            // Simple role detection based on username and user ID
            if (stripos($user->name, 'admin') !== false || $user->id === 1) {
                $userRole = 'superadmin';
                $isAutoApproved = true;
                
                Log::info('User identified as superadmin', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                ]);
            } elseif (stripos($user->name, 'hrd') !== false || stripos($user->email, 'hrd') !== false) {
                $userRole = 'hrd';
                $isAutoApproved = true;
                
                Log::info('User identified as HRD', [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email
                ]);
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
                    
                    if ($isAutoApproved) {
                        Log::info('User role determined from route', [
                            'user_id' => $user->id,
                            'route_name' => $routeName,
                            'determined_role' => $userRole
                        ]);
                    }
                }
            }
            
            // Provide a default for messaging if no specific role is found
            $roleForDisplay = $isAutoApproved ? ucfirst($userRole) : 'standard user';
            
            Log::info('Auto-approval determination', [
                'user_id' => $user->id,
                'is_auto_approved' => $isAutoApproved,
                'role_for_display' => $roleForDisplay
            ]);
            
            // Batch create leave records for all selected employees
            $leaves = [];
            $employeeCount = count($request->employee_ids);
            
            Log::info('Starting batch creation of leave records', [
                'employee_count' => $employeeCount
            ]);
            
            foreach ($request->employee_ids as $employeeId) {
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
                    'status' => $isAutoApproved ? 'approved' : 'pending'
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $leave->approved_by = Auth::id();
                    $leave->approved_at = now();
                    $leave->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                    
                    Log::info('Leave request auto-approved', [
                        'employee_id' => $employeeId,
                        'approved_by' => Auth::id(),
                        'status' => 'approved'
                    ]);
                }
                
                $leave->save();
                $leaves[] = $leave;
            }
            
            // Get updated list of all leaves to return to the frontend
            $allLeaves = SLVL::with('employee')->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Leave requests created and auto-approved successfully' 
                : 'Leave requests created successfully';
            
            Log::info('SLVL store method completed successfully', [
                'user_id' => Auth::id(),
                'records_created' => count($leaves),
                'is_auto_approved' => $isAutoApproved,
                'message' => $successMessage
            ]);
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'leaves' => $allLeaves
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create leave requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->except(['documents'])
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create leave requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Approve or reject a leave request.
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
            $leave = SLVL::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($leave->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot update leave request that has already been ' . $leave->status);
            }
            
            $leave->status = $request->status;
            $leave->remarks = $request->remarks;
            $leave->approved_by = Auth::id();
            $leave->approved_at = now();
            $leave->save();
            
            // Get updated list of all leaves to return to the frontend
            $allLeaves = SLVL::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Leave request status updated successfully',
                'leaves' => $allLeaves
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update leave status', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update leave status: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified leave request.
     */
    public function destroy($id)
    {
        try {
            $leave = SLVL::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($leave->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete leave request that has already been ' . $leave->status);
            }
            
            // Delete the document file if it exists
            if ($leave->documents_path) {
                // Remove '/storage/' from the beginning to get the relative path
                $path = str_replace('/storage/', '', $leave->documents_path);
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                    Log::info('Document deleted', ['path' => $path]);
                }
            }
            
            $leave->delete();
            
            // Get updated list of all leaves to return to the frontend
            $allLeaves = SLVL::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Leave request deleted successfully',
                'leaves' => $allLeaves
            ]);
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
            // Start with a base query
            $query = SLVL::with('employee', 'approver');
            
            // Apply filters if provided
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
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
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
                $sheet->setCellValue('N' . $row, $leave->remarks ?? 'N/A');
                $sheet->setCellValue('O' . $row, $leave->created_at ? Carbon::parse($leave->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('P' . $row, $leave->approved_at ? Carbon::parse($leave->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('Q' . $row, $leave->approver ? $leave->approver->name : 'N/A');
                
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
                $sheet->getStyle('A2:Q' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Leave_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export leave data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export leave data: ' . $e->getMessage());
        }
    }
}