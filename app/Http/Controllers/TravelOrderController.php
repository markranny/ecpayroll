<?php
// app/Http/Controllers/TravelOrderController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\TravelOrder;
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

class TravelOrderController extends Controller
{
    /**
     * Display the travel order management page.
     */
    public function index()
    {
        $travelOrders = TravelOrder::with('employee')->latest()->get();
        $employees = Employee::select(['id', 'idno', 'Lname', 'Fname', 'MName', 'Department', 'Jobtitle'])->get();
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        return Inertia::render('TravelOrder/TravelOrderPage', [
            'travelOrders' => $travelOrders,
            'employees' => $employees,
            'departments' => $departments,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Store multiple new travel order records.
     */
    public function store(Request $request)
    {
        Log::info('Travel Order store method called', [
            'user_id' => Auth::id(),
            'request_data' => $request->except(['_token'])
        ]);
        
        $validator = Validator::make($request->all(), [
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
            'date' => 'required|date',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'destination' => 'required|string|max:255',
            'transportation_type' => 'required|string|max:50',
            'purpose' => 'required|string|max:500',
            'accommodation_required' => 'boolean',
            'meal_allowance' => 'boolean',
            'other_expenses' => 'nullable|string|max:500',
            'estimated_cost' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            Log::warning('Travel Order validation failed', [
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
            
            // Batch create travel order records for all selected employees
            $travelOrders = [];
            $employeeCount = count($request->employee_ids);
            
            Log::info('Starting batch creation of travel order records', [
                'employee_count' => $employeeCount
            ]);
            
            foreach ($request->employee_ids as $employeeId) {
                $travelOrder = new TravelOrder([
                    'employee_id' => $employeeId,
                    'date' => $request->date,
                    'start_date' => $request->start_date,
                    'end_date' => $request->end_date,
                    'destination' => $request->destination,
                    'transportation_type' => $request->transportation_type,
                    'purpose' => $request->purpose,
                    'accommodation_required' => $request->accommodation_required ?? false,
                    'meal_allowance' => $request->meal_allowance ?? false,
                    'other_expenses' => $request->other_expenses,
                    'estimated_cost' => $request->estimated_cost,
                    'total_days' => $totalDays,
                    'status' => $isAutoApproved ? 'approved' : 'pending'
                ]);
                
                // If auto-approved, set approver info
                if ($isAutoApproved) {
                    $travelOrder->approved_by = Auth::id();
                    $travelOrder->approved_at = now();
                    $travelOrder->remarks = "Auto-approved: Filed by {$roleForDisplay}";
                    
                    Log::info('Travel Order auto-approved', [
                        'employee_id' => $employeeId,
                        'approved_by' => Auth::id(),
                        'status' => 'approved'
                    ]);
                }
                
                $travelOrder->save();
                $travelOrders[] = $travelOrder;
            }
            
            // Get updated list of all travel orders to return to the frontend
            $allTravelOrders = TravelOrder::with('employee')->latest()->get();
            
            $successMessage = $isAutoApproved 
                ? 'Travel Order requests created and auto-approved successfully' 
                : 'Travel Order requests created successfully';
            
            Log::info('Travel Order store method completed successfully', [
                'user_id' => Auth::id(),
                'records_created' => count($travelOrders),
                'is_auto_approved' => $isAutoApproved,
                'message' => $successMessage
            ]);
            
            return redirect()->back()->with([
                'message' => $successMessage,
                'travelOrders' => $allTravelOrders
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create travel order requests', [
                'user_id' => Auth::id(),
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create travel order requests: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Update the status of a travel order.
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:approved,rejected,completed,cancelled',
            'remarks' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $travelOrder = TravelOrder::findOrFail($id);
            
            // Only allow status updates if current status is pending
            if ($travelOrder->status !== 'pending' && $request->status !== 'completed' && $request->status !== 'cancelled') {
                return redirect()->back()
                    ->with('error', 'Cannot update travel order that has already been ' . $travelOrder->status);
            }
            
            // Only allow completed/cancelled if previously approved
            if (($request->status === 'completed' || $request->status === 'cancelled') && $travelOrder->status !== 'approved') {
                return redirect()->back()
                    ->with('error', 'Travel order must be approved before it can be marked as completed or cancelled');
            }
            
            $travelOrder->status = $request->status;
            $travelOrder->remarks = $request->remarks;
            
            // Only set approved_by and approved_at if transitioning to approved/rejected
            if (in_array($request->status, ['approved', 'rejected'])) {
                $travelOrder->approved_by = Auth::id();
                $travelOrder->approved_at = now();
            }
            
            $travelOrder->save();
            
            // Get updated list of all travel orders to return to the frontend
            $allTravelOrders = TravelOrder::with('employee')->latest()->get();
            
            $statusMessage = '';
            switch($request->status) {
                case 'approved':
                    $statusMessage = 'approved';
                    break;
                case 'rejected':
                    $statusMessage = 'rejected';
                    break;
                case 'completed':
                    $statusMessage = 'marked as completed';
                    break;
                case 'cancelled':
                    $statusMessage = 'cancelled';
                    break;
                default:
                    $statusMessage = 'updated';
            }
            
            return redirect()->back()->with([
                'message' => "Travel Order {$statusMessage} successfully",
                'travelOrders' => $allTravelOrders
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update travel order status', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update travel order status: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified travel order.
     */
    public function destroy($id)
    {
        try {
            $travelOrder = TravelOrder::findOrFail($id);
            
            // Only allow deletion if status is pending
            if ($travelOrder->status !== 'pending') {
                return redirect()->back()
                    ->with('error', 'Cannot delete travel order that has already been ' . $travelOrder->status);
            }
            
            $travelOrder->delete();
            
            // Get updated list of all travel orders to return to the frontend
            $allTravelOrders = TravelOrder::with('employee')->latest()->get();
            
            return redirect()->back()->with([
                'message' => 'Travel Order deleted successfully',
                'travelOrders' => $allTravelOrders
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete travel order', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete travel order: ' . $e->getMessage());
        }
    }

    /**
     * Export travel orders to Excel.
     */
    public function export(Request $request)
    {
        try {
            // Start with a base query
            $query = TravelOrder::with('employee', 'approver');
            
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
                    ->orWhere('destination', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('start_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('start_date', '<=', $request->to_date);
            }
            
            // Get the filtered travel orders
            $travelOrders = $query->latest()->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'ID');
            $sheet->setCellValue('B1', 'Employee ID');
            $sheet->setCellValue('C1', 'Employee Name');
            $sheet->setCellValue('D1', 'Department');
            $sheet->setCellValue('E1', 'Position');
            $sheet->setCellValue('F1', 'Destination');
            $sheet->setCellValue('G1', 'Start Date');
            $sheet->setCellValue('H1', 'End Date');
            $sheet->setCellValue('I1', 'Duration (Days)');
            $sheet->setCellValue('J1', 'Transportation');
            $sheet->setCellValue('K1', 'Accommodation');
            $sheet->setCellValue('L1', 'Meal Allowance');
            $sheet->setCellValue('M1', 'Estimated Cost');
            $sheet->setCellValue('N1', 'Status');
            $sheet->setCellValue('O1', 'Purpose');
            $sheet->setCellValue('P1', 'Other Expenses');
            $sheet->setCellValue('Q1', 'Remarks');
            $sheet->setCellValue('R1', 'Filed Date');
            $sheet->setCellValue('S1', 'Action Date');
            $sheet->setCellValue('T1', 'Approved/Rejected By');
            
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
            
            $sheet->getStyle('A1:T1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'T') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Get transportation type display text
            $getTransportationTypeText = function($type) {
                switch($type) {
                    case 'company_vehicle':
                        return 'Company Vehicle';
                    case 'personal_vehicle':
                        return 'Personal Vehicle';
                    case 'public_transport':
                        return 'Public Transport';
                    case 'plane':
                        return 'Plane';
                    case 'other':
                        return 'Other';
                    default:
                        return $type ?? 'N/A';
                }
            };
            
            // Format currency
            $formatCurrency = function($amount) {
                if (!$amount) return '₱0.00';
                return '₱' . number_format($amount, 2);
            };
            
            // Fill data
            $row = 2;
            foreach ($travelOrders as $to) {
                $sheet->setCellValue('A' . $row, $to->id);
                $sheet->setCellValue('B' . $row, $to->employee->idno ?? 'N/A');
                $sheet->setCellValue('C' . $row, $to->employee ? "{$to->employee->Lname}, {$to->employee->Fname} {$to->employee->MName}" : 'Unknown');
                $sheet->setCellValue('D' . $row, $to->employee->Department ?? 'N/A');
                $sheet->setCellValue('E' . $row, $to->employee->Jobtitle ?? 'N/A');
                $sheet->setCellValue('F' . $row, $to->destination ?? 'N/A');
                $sheet->setCellValue('G' . $row, $to->start_date ? Carbon::parse($to->start_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('H' . $row, $to->end_date ? Carbon::parse($to->end_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('I' . $row, $to->total_days ?? 'N/A');
                $sheet->setCellValue('J' . $row, $getTransportationTypeText($to->transportation_type));
                $sheet->setCellValue('K' . $row, $to->accommodation_required ? 'Yes' : 'No');
                $sheet->setCellValue('L' . $row, $to->meal_allowance ? 'Yes' : 'No');
                $sheet->setCellValue('M' . $row, $to->estimated_cost ? $formatCurrency($to->estimated_cost) : 'N/A');
                $sheet->setCellValue('N' . $row, ucfirst($to->status));
                $sheet->setCellValue('O' . $row, $to->purpose ?? 'N/A');
                $sheet->setCellValue('P' . $row, $to->other_expenses ?? 'N/A');
                $sheet->setCellValue('Q' . $row, $to->remarks ?? 'N/A');
                $sheet->setCellValue('R' . $row, $to->created_at ? Carbon::parse($to->created_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('S' . $row, $to->approved_at ? Carbon::parse($to->approved_at)->format('Y-m-d h:i A') : 'N/A');
                $sheet->setCellValue('T' . $row, $to->approver ? $to->approver->name : 'N/A');
                
                // Apply status-based styling
                if ($to->status === 'approved') {
                    $sheet->getStyle('N' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '008000']], // Green for approved
                    ]);
                } elseif ($to->status === 'rejected') {
                    $sheet->getStyle('N' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FF0000']], // Red for rejected
                    ]);
                } elseif ($to->status === 'pending') {
                    $sheet->getStyle('N' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => 'FFA500']], // Orange for pending
                    ]);
                } elseif ($to->status === 'completed') {
                    $sheet->getStyle('N' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '0000FF']], // Blue for completed
                    ]);
                } elseif ($to->status === 'cancelled') {
                    $sheet->getStyle('N' . $row)->applyFromArray([
                        'font' => ['color' => ['rgb' => '808080']], // Gray for cancelled
                    ]);
                }
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:T' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Travel_Order_Report_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export travel order data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export travel order data: ' . $e->getMessage());
        }
    }
}