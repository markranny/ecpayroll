<?php
// app/Http/Controllers/OffsetController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Offset;
use App\Models\OffsetType;
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

class OffsetController extends Controller
{
    /**
     * Display the offset management page.
     */
    public function index()
    {
        $offsets = Offset::with(['employee', 'offset_type'])->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        // Offset types
        $offsetTypes = OffsetType::all();
        
        return Inertia::render('Offset/OffsetPage', [
            'offsets' => $offsets,
            'employees' => $employees,
            'departments' => $departments,
            'offsetTypes' => $offsetTypes,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Get filtered offsets for API requests.
     */
    public function getOffsets(Request $request)
    {
        $query = Offset::with(['employee', 'offset_type'])->latest();
        
        // Filter by employee if specified
        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        
        // Filter by status if specified
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        // Filter by date range if specified
        if ($request->has('from_date') && $request->has('to_date')) {
            $query->whereBetween('date', [$request->from_date, $request->to_date]);
        }
        
        $offsets = $query->paginate(15);
        
        return response()->json($offsets);
    }

    /**
     * Store multiple new offset records.
     */
    public function store(Request $request)
    {
        Log::info('Offset store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'date' => 'required|date',
            'workday' => 'required|date',
            'offset_type_id' => 'required|exists:offset_types,id',
            'hours' => 'required|numeric|min:0.5|max:24',
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            Log::warning('Offset validation failed', [
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            return back()->withErrors($validator)->withInput();
        }

        try {
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
            
            // Batch create offset records for all selected employees
            $offsets = [];
            $employeeCount = count($request->employee_ids);
            
            Log::info('Starting batch creation of offset records', [
                'employee_count' => $employeeCount
            ]);
            
            foreach ($request->employee_ids as $employeeId) {
                $offset = new Offset([
                    'employee_id' => $employeeId,
                    'date' => $request->date,
                    'workday' => $request->workday,
                    'offset_type_id' => $request->offset_type_id,
                    'hours' => $request->hours,
                    'reason' => $request->reason,
                    'status' => $isAutoApproved ? 'approved' : 'pending'
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $offset->approved_by = Auth::id();
                    $offset->approved_at = now();
                    $offset->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                    
                    Log::info('Offset auto-approved', [
                        'employee_id' => $employeeId,
                        'approved_by' => Auth::id(),
                        'status' => 'approved'
                    ]);
                }
                
                $offset->save();
                $offsets[] = $offset;
            }
            
            // Get updated list of all offsets to return to the frontend
            $allOffsets = Offset::with(['employee', 'offset_type'])->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Offset requests created and auto-approved successfully' 
                : 'Offset requests created successfully';
            
            Log::info('Offset store method completed successfully', [
                'user_id' => Auth::id(),
                'records_created' => count($offsets),
                'is_auto_approved' => $isAutoApproved,
                'message' => $successMessage
            ]);
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'offsets' => $allOffsets
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create offset requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create offset requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Update the specified offset.
     */
    public function update(Request $request, $id)
    {
        $offset = Offset::findOrFail($id);
        
        // Only allow updates if status is pending
        if ($offset->status !== 'pending') {
            return redirect()->back()
                ->with('error', 'Cannot update offset that has already been ' . $offset->status);
        }
        
        $validator = Validator::make($request->all(), [
            'date' => 'sometimes|required|date',
            'workday' => 'sometimes|required|date',
            'offset_type_id' => 'sometimes|required|exists:offset_types,id',
            'hours' => 'sometimes|required|numeric|min:0.5|max:24',
            'reason' => 'sometimes|required|string|max:500',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            // Update fields if they are provided
            if ($request->has('date')) {
                $offset->date = $request->date;
            }
            
            if ($request->has('workday')) {
                $offset->workday = $request->workday;
            }
            
            if ($request->has('offset_type_id')) {
                $offset->offset_type_id = $request->offset_type_id;
            }
            
            if ($request->has('hours')) {
                $offset->hours = $request->hours;
            }
            
            if ($request->has('reason')) {
                $offset->reason = $request->reason;
            }
            
            // Check if current user is superadmin or hrd
            $user = Auth::user();
            $isAutoApproved = false;
            $userRoles = [];
            
            // Get user roles
            if (method_exists($user, 'roles') && $user->roles) {
                $userRoles = $user->roles->pluck('name')->toArray();
            } else if (method_exists($user, 'getRoleSlug')) {
                $roleSlug = $user->getRoleSlug();
                if ($roleSlug) {
                    $userRoles[] = $roleSlug;
                }
            }
            
            // Check if user has superadmin or hrd role
            $isAutoApproved = in_array('superadmin', $userRoles) || in_array('hrd', $userRoles);
            
            // Auto-approve if user is superadmin or hrd
            if ($isAutoApproved) {
                $offset->status = 'approved';
                $offset->approved_by = Auth::id();
                $offset->approved_at = now();
                $offset->remarks = 'Auto-approved: Updated by ' . implode(' or ', array_map('ucfirst', $userRoles)) . ' user';
            }
            
            $offset->save();
            
            // Get updated list of all offsets to return to the frontend
            $allOffsets = Offset::with(['employee', 'offset_type'])->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Offset updated and auto-approved successfully' 
                : 'Offset updated successfully';
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'offsets' => $allOffsets
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update offset', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update offset: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Approve or reject an offset request.
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
            $offset = Offset::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($offset->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot update offset that has already been ' . $offset->status);
            }
            
            $offset->status = $request->status;
            $offset->remarks = $request->remarks;
            $offset->approved_by = Auth::id();
            $offset->approved_at = now();
            $offset->save();
            
            // Get updated list of all offsets to return to the frontend
            $allOffsets = Offset::with(['employee', 'offset_type'])->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Offset status updated successfully',
                'offsets' => $allOffsets
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update offset status', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update offset status: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified offset.
     */
    public function destroy($id)
    {
        try {
            $offset = Offset::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($offset->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete offset that has already been ' . $offset->status);
            }
            
            $offset->delete();
            
            // Get updated list of all offsets to return to the frontend
            $allOffsets = Offset::with(['employee', 'offset_type'])->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Offset deleted successfully',
                'offsets' => $allOffsets
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete offset', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete offset: ' . $e->getMessage());
        }
    }

    public function export(Request $request)
    {
        try {
            // Start with a base query
            $query = Offset::with(['employee', 'offset_type', 'approver']);
            
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
                $query->whereDate('date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('date', '<=', $request->to_date);
            }
            
            // Get the filtered offsets
            $offsets = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Work Date');
            $sheet->setCellValue('G1', 'Offset Date');
            $sheet->setCellValue('H1', 'Hours');
            $sheet->setCellValue('I1', 'Offset Type');
            $sheet->setCellValue('J1', 'Status');
            $sheet->setCellValue('K1', 'Reason');
            $sheet->setCellValue('L1', 'Remarks');
            $sheet->setCellValue('M1', 'Filed Date');
            $sheet->setCellValue('N1', 'Action Date');
            $sheet->setCellValue('O1', 'Approved/Rejected By');
            
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
            
            $sheet->getStyle('A1:O1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'O') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($offsets as $offset) {
                $sheet->setCellValue('A' . $row, $offset->id);
                $sheet->setCellValue('B' . $row, $offset->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $offset->employee ? "{$offset->employee->Lname}, {$offset->employee->Fname} {$offset->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $offset->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $offset->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, $offset->date ? Carbon::parse($offset->date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('G' . $row, $offset->workday ? Carbon::parse($offset->workday)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, $offset->hours ?? 'N/A');
                $sheet->setCellValue('I' . $row, $offset->offset_type ? $offset->offset_type->name : 'N/A');
                $sheet->setCellValue('J' . $row, ucfirst($offset->status));
                $sheet->setCellValue('K' . $row, $offset->reason ?? 'N/A');
                $sheet->setCellValue('L' . $row, $offset->remarks ?? 'N/A');
                $sheet->setCellValue('M' . $row, $offset->created_at ? Carbon::parse($offset->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('N' . $row, $offset->approved_at ? Carbon::parse($offset->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('O' . $row, $offset->approver ? $offset->approver->name : 'N/A');
                
                // Apply status-based styling
                if ($offset->status === 'approved') {
                    $sheet->getStyle('J' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($offset->status === 'rejected') {
                    $sheet->getStyle('J' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($offset->status === 'pending') {
                    $sheet->getStyle('J' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:O' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Offset_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export offset data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export offset data: ' . $e->getMessage());
        }
    }
}