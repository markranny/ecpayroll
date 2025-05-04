<?php
// app/Http/Controllers/OfficialBusinessController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\OfficialBusiness;
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

class OfficialBusinessController extends Controller
{
    /**
     * Display the official business management page.
     */
    public function index()
    {
        $officialBusinesses = OfficialBusiness::with('employee')->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        return Inertia::render('OfficialBusiness/OfficialBusinessPage', [
            'officialBusinesses' => $officialBusinesses,
            'employees' => $employees,
            'departments' => $departments,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Store multiple new official business records.
     */
    public function store(Request $request)
    {
        Log::info('Official Business store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'date' => 'required|date',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location' => 'required|string|max:255',
            'purpose' => 'required|string|max:500',
            'with_accommodation' => 'boolean',
        ]);

        if ($validator->fails()) {
            Log::warning('Official Business validation failed', [
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            return back()->withErrors($validator)->withInput();
        }

        try {
            // Calculate days between start and end date
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $totalDays = $endDate->diffInDays($startDate) + 1; // Include both start and end dates
            
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
                    'detection_method' => stripos($user->name, 'admin') !== false ? 'name contains admin' : 'user has ID 1'
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
            
            // Batch create official business records for all selected employees
            $officialBusinesses = [];
            $employeeCount = count($request->employee_ids);
            
            Log::info('Starting batch creation of official business records', [
                'employee_count' => $employeeCount
            ]);
            
            foreach ($request->employee_ids as $employeeId) {
                $officialBusiness = new OfficialBusiness([
                    'employee_id' => $employeeId,
                    'date' => $request->date,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'location' => $request->location,
                    'purpose' => $request->purpose,
                    'with_accommodation' => $request->with_accommodation ?? false,
                    'total_days' => $totalDays,
                    'status' => $isAutoApproved ? 'approved' : 'pending'
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $officialBusiness->approved_by = Auth::id();
                    $officialBusiness->approved_at = now();
                    $officialBusiness->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                    
                    Log::info('Official Business auto-approved', [
                        'employee_id' => $employeeId,
                        'approved_by' => Auth::id(),
                        'status' => 'approved'
                    ]);
                }
                
                $officialBusiness->save();
                $officialBusinesses[] = $officialBusiness;
            }
            
            // Get updated list of all official businesses to return to the frontend
            $allOfficialBusinesses = OfficialBusiness::with('employee')->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Official Business requests created and auto-approved successfully' 
                : 'Official Business requests created successfully';
            
            Log::info('Official Business store method completed successfully', [
                'user_id' => Auth::id(),
                'records_created' => count($officialBusinesses),
                'is_auto_approved' => $isAutoApproved,
                'message' => $successMessage
            ]);
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'officialBusinesses' => $allOfficialBusinesses
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create official business requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create official business requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Update the status of an official business.
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
            $officialBusiness = OfficialBusiness::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($officialBusiness->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot update official business that has already been ' . $officialBusiness->status);
            }
            
            $officialBusiness->status = $request->status;
            $officialBusiness->remarks = $request->remarks;
            $officialBusiness->approved_by = Auth::id();
            $officialBusiness->approved_at = now();
            $officialBusiness->save();
            
            // Get updated list of all official businesses to return to the frontend
            $allOfficialBusinesses = OfficialBusiness::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Official Business status updated successfully',
                'officialBusinesses' => $allOfficialBusinesses
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update official business status', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update official business status: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified official business.
     */
    public function destroy($id)
    {
        try {
            $officialBusiness = OfficialBusiness::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($officialBusiness->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete official business that has already been ' . $officialBusiness->status);
            }
            
            $officialBusiness->delete();
            
            // Get updated list of all official businesses to return to the frontend
            $allOfficialBusinesses = OfficialBusiness::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Official Business deleted successfully',
                'officialBusinesses' => $allOfficialBusinesses
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete official business', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete official business: ' . $e->getMessage());
        }
    }

    /**
     * Export official businesses to Excel.
     */
    public function export(Request $request)
    {
        try {
            // Start with a base query
            $query = OfficialBusiness::with('employee', 'approver');
            
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
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('start_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('start_date', '<=', $request->to_date);
            }
            
            // Get the filtered official businesses
            $officialBusinesses = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Start Date');
            $sheet->setCellValue('G1', 'End Date');
            $sheet->setCellValue('H1', 'Duration (Days)');
            $sheet->setCellValue('I1', 'Location');
            $sheet->setCellValue('J1', 'With Accommodation');
            $sheet->setCellValue('K1', 'Status');
            $sheet->setCellValue('L1', 'Purpose');
            $sheet->setCellValue('M1', 'Remarks');
            $sheet->setCellValue('N1', 'Filed Date');
            $sheet->setCellValue('O1', 'Action Date');
            $sheet->setCellValue('P1', 'Approved/Rejected By');
            
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
            
            $sheet->getStyle('A1:P1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'P') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($officialBusinesses as $ob) {
                $sheet->setCellValue('A' . $row, $ob->id);
                $sheet->setCellValue('B' . $row, $ob->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $ob->employee ? "{$ob->employee->Lname}, {$ob->employee->Fname} {$ob->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $ob->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $ob->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, $ob->start_date ? Carbon::parse($ob->start_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('G' . $row, $ob->end_date ? Carbon::parse($ob->end_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, $ob->total_days ?? 'N/A');
                $sheet->setCellValue('I' . $row, $ob->location ?? 'N/A');
                $sheet->setCellValue('J' . $row, $ob->with_accommodation ? 'Yes' : 'No');
                $sheet->setCellValue('K' . $row, ucfirst($ob->status));
                $sheet->setCellValue('L' . $row, $ob->purpose ?? 'N/A');
                $sheet->setCellValue('M' . $row, $ob->remarks ?? 'N/A');
                $sheet->setCellValue('N' . $row, $ob->created_at ? Carbon::parse($ob->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('O' . $row, $ob->approved_at ? Carbon::parse($ob->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('P' . $row, $ob->approver ? $ob->approver->name : 'N/A');
                
                // Apply status-based styling
                if ($ob->status === 'approved') {
                    $sheet->getStyle('K' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($ob->status === 'rejected') {
                    $sheet->getStyle('K' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($ob->status === 'pending') {
                    $sheet->getStyle('K' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:P' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Official_Business_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export official business data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export official business data: ' . $e->getMessage());
        }
    }
}