<?php
// app/Http/Controllers/RetroController.php
namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Overtime;
use App\Models\TimeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Inertia\Inertia;

class RetroController extends Controller
{
    /**
     * Display the RETRO dashboard
     */
    public function index()
    {
        // Get current user
        $user = Auth::user();
        
        // Get employee associated with current user
        // In a real system, you'd have a relation between User and Employee
        // This is a simplified approach
        $employee = Employee::where('Email', $user->email)->first();
        
        if (!$employee) {
            return redirect()->back()->with('error', 'No employee record found for your account');
        }
        
        // Get time logs for this employee
        $timelogs = TimeLog::where('employee_id', $employee->id)
            ->orderBy('log_date', 'desc')
            ->get();
        
        // Get pending overtime requests
        $pendingOvertimes = Overtime::where('employee_id', $employee->id)
            ->where('status', 'pending')
            ->orderBy('date', 'desc')
            ->get();
        
        return Inertia::render('Retro/RetroPage', [
            'employee' => $employee,
            'timelogs' => $timelogs,
            'pendingOvertimes' => $pendingOvertimes,
            'auth' => [
                'user' => $user,
            ],
        ]);
    }
    
    /**
     * Store a new time log
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'log_date' => 'required|date',
            'hours_worked' => 'required|numeric|min:0.1|max:24',
            'task_description' => 'required|string|max:255',
            'task_details' => 'nullable|string',
            'task_category' => 'required|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            // Create the time log
            $timelog = new TimeLog([
                'employee_id' => $request->employee_id,
                'log_date' => $request->log_date,
                'hours_worked' => $request->hours_worked,
                'task_description' => $request->task_description,
                'task_details' => $request->task_details,
                'task_category' => $request->task_category,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'created_by' => Auth::id()
            ]);
            
            $timelog->save();
            
            // Get updated time logs
            $timelogs = TimeLog::where('employee_id', $request->employee_id)
                ->orderBy('log_date', 'desc')
                ->get();
            
            return redirect()->back()->with([
                'message' => 'Time log created successfully',
                'timelogs' => $timelogs
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create time log', [
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to create time log: ' . $e->getMessage())
                ->withInput();
        }
    }
    
    /**
     * Update an existing time log
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'log_date' => 'required|date',
            'hours_worked' => 'required|numeric|min:0.1|max:24',
            'task_description' => 'required|string|max:255',
            'task_details' => 'nullable|string',
            'task_category' => 'required|string',
            'start_time' => 'nullable|string',
            'end_time' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $timelog = TimeLog::findOrFail($id);
            
            // Verify current user is owner or admin
            if ($timelog->employee_id != $request->employee_id && !Auth::user()->hasRole(['superadmin', 'hrd'])) {
                return redirect()->back()->with('error', 'You are not authorized to edit this time log');
            }
            
            // Update the time log
            $timelog->log_date = $request->log_date;
            $timelog->hours_worked = $request->hours_worked;
            $timelog->task_description = $request->task_description;
            $timelog->task_details = $request->task_details;
            $timelog->task_category = $request->task_category;
            $timelog->start_time = $request->start_time;
            $timelog->end_time = $request->end_time;
            $timelog->updated_by = Auth::id();
            
            $timelog->save();
            
            // Get updated time logs
            $timelogs = TimeLog::where('employee_id', $timelog->employee_id)
                ->orderBy('log_date', 'desc')
                ->get();
            
            return redirect()->back()->with([
                'message' => 'Time log updated successfully',
                'timelogs' => $timelogs
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update time log', [
                'id' => $id,
                'error' => $e->getMessage(),
                'request' => $request->all()
            ]);
            
            return redirect()->back()
                ->with('error', 'Failed to update time log: ' . $e->getMessage())
                ->withInput();
        }
    }
    
    /**
     * Delete a time log
     */
    public function destroy($id)
    {
        try {
            $timelog = TimeLog::findOrFail($id);
            
            // Verify current user is owner or admin
            $user = Auth::user();
            $employee = Employee::where('Email', $user->email)->first();
            
            if ($timelog->employee_id != $employee->id && !$user->hasRole(['superadmin', 'hrd'])) {
                return redirect()->back()->with('error', 'You are not authorized to delete this time log');
            }
            
            $employeeId = $timelog->employee_id;
            $timelog->delete();
            
            // Get updated time logs
            $timelogs = TimeLog::where('employee_id', $employeeId)
                ->orderBy('log_date', 'desc')
                ->get();
            
            return redirect()->back()->with([
                'message' => 'Time log deleted successfully',
                'timelogs' => $timelogs
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete time log', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return redirect()->back()->with('error', 'Failed to delete time log: ' . $e->getMessage());
        }
    }
    
    /**
     * Export time logs to Excel
     */
    public function export(Request $request)
    {
        try {
            // Get employee associated with current user
            $user = Auth::user();
            $employee = Employee::where('Email', $user->email)->first();
            
            if (!$employee) {
                return redirect()->back()->with('error', 'No employee record found for your account');
            }
            
            // Start with a base query
            $query = TimeLog::where('employee_id', $employee->id);
            
            // Apply date filters if provided
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('log_date', '>=', $request->from_date);
            }
            
            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('log_date', '<=', $request->to_date);
            }
            
            // Get the filtered time logs
            $timelogs = $query->orderBy('log_date', 'desc')->get();
            
            // Create a spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Set headers
            $sheet->setCellValue('A1', 'Date');
            $sheet->setCellValue('B1', 'Hours');
            $sheet->setCellValue('C1', 'Start Time');
            $sheet->setCellValue('D1', 'End Time');
            $sheet->setCellValue('E1', 'Category');
            $sheet->setCellValue('F1', 'Description');
            $sheet->setCellValue('G1', 'Details');
            
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
            
            $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);
            
            // Auto-adjust column width
            foreach(range('A', 'G') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }
            
            // Fill data
            $row = 2;
            foreach ($timelogs as $log) {
                $sheet->setCellValue('A' . $row, $log->log_date ? Carbon::parse($log->log_date)->format('Y-m-d') : 'N/A');
                $sheet->setCellValue('B' . $row, $log->hours_worked ?? 'N/A');
                $sheet->setCellValue('C' . $row, $log->start_time ?? 'N/A');
                $sheet->setCellValue('D' . $row, $log->end_time ?? 'N/A');
                $sheet->setCellValue('E' . $row, ucfirst($log->task_category) ?? 'N/A');
                $sheet->setCellValue('F' . $row, $log->task_description ?? 'N/A');
                $sheet->setCellValue('G' . $row, $log->task_details ?? 'N/A');
                
                $row++;
            }
            
            // Add borders to all data cells
            $lastRow = $row - 1;
            if ($lastRow >= 2) {
                $sheet->getStyle('A2:G' . $lastRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        ],
                    ],
                ]);
            }
            
            // Set the filename
            $filename = 'Time_Logs_' . $employee->Lname . '_' . Carbon::now()->format('Y-m-d_His') . '.xlsx';
            
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
            Log::error('Failed to export time logs', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return redirect()->back()->with('error', 'Failed to export time logs: ' . $e->getMessage());
        }
    }
}