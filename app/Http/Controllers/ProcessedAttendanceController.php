<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ProcessedAttendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class ProcessedAttendanceController extends Controller
{
    /**
     * Display the processed attendance records page
     */
    public function index(Request $request)
    {
        // Get query parameters for filtering
        $searchTerm = $request->input('search');
        $dateFilter = $request->input('date');
        $departmentFilter = $request->input('department');
        $editsOnlyFilter = $request->boolean('edits_only');
        $perPage = $request->input('per_page', 25);
        
        // Build query
        $query = $this->buildAttendanceQuery($request);
        
        // Order by date descending and paginate
        $attendances = $query->orderBy('processed_attendances.attendance_date', 'asc')
                             ->paginate($perPage);
        
        // Return Inertia view with data
        return Inertia::render('Timesheet/ProcessedAttendanceList', [
            'attendances' => $attendances->items(),
            'pagination' => [
                'total' => $attendances->total(),
                'per_page' => $attendances->perPage(),
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage()
            ],
            'filters' => [
                'search' => $searchTerm,
                'date' => $dateFilter,
                'department' => $departmentFilter,
                'edits_only' => $editsOnlyFilter
            ],
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    }
    
    public function list(Request $request)
{
    try {
        // Build query
        $query = $this->buildAttendanceQuery($request);
        $perPage = $request->input('per_page', 25);
        
        // Order by date descending and paginate
        $attendances = $query->orderBy('processed_attendances.attendance_date', 'desc')
                            ->paginate($perPage);
        
        // Process attendance data with accessors
        $processedData = $attendances->items();
        
        // Format the datetime fields for each record - WITH IMPROVED FORMATTING
        foreach ($processedData as &$attendance) {
            // Safely format time values to 12-hour format with better null handling
            $attendance->time_in = $this->safeFormatTime($attendance->time_in);
            $attendance->time_out = $this->safeFormatTime($attendance->time_out);
            $attendance->break_in = $this->safeFormatTime($attendance->break_in);
            $attendance->break_out = $this->safeFormatTime($attendance->break_out);
            $attendance->next_day_timeout = $this->safeFormatTime($attendance->next_day_timeout);
            
            // Format date and get day of week
            if ($attendance->attendance_date) {
                $attendance->attendance_date_formatted = $attendance->attendance_date->format('Y-m-d');
                $attendance->day = $attendance->attendance_date->format('l'); // This gets the day name (Monday, Tuesday, etc.)
            } else {
                $attendance->attendance_date_formatted = null;
                $attendance->day = null;
            }
            
            // Add employee name for display
            if ($attendance->employee) {
                $attendance->employee_name = trim($attendance->employee->Fname . ' ' . $attendance->employee->Lname);
                $attendance->idno = $attendance->employee->idno;
                $attendance->department = $attendance->employee->Department;
                $attendance->line = $attendance->employee->Line;
            } else {
                $attendance->employee_name = 'Unknown Employee';
                $attendance->idno = 'N/A';
                $attendance->department = 'N/A';
                $attendance->line = 'N/A';
            }
        }
        
        return response()->json([
            'success' => true,
            'data' => $processedData,
            'pagination' => [
                'total' => $attendances->total(),
                'per_page' => $attendances->perPage(),
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage()
            ]
        ]);
    } catch (\Exception $e) {
        Log::error('Error fetching attendance data: ' . $e->getMessage());
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch attendance data: ' . $e->getMessage()
        ], 500);
    }
}

private function safeFormatTime($timeValue)
{
    // Return dash for null/empty values
    if ($timeValue === null) {
        return null;
    }
    
    try {
        // Check if it's already a Carbon instance
        if ($timeValue instanceof \Carbon\Carbon) {
            return $timeValue->format('h:i A');
        }
        
        // Try to parse the value using Carbon
        return \Carbon\Carbon::parse($timeValue)->format('h:i A');
    } catch (\Exception $e) {
        Log::warning('Time formatting error: ' . $e->getMessage(), [
            'time_value' => $timeValue
        ]);
        return null;
    }
}
    /**
     * Build attendance query with filters
     */
    private function buildAttendanceQuery(Request $request)
    {
        // Get query parameters for filtering
        $searchTerm = $request->input('search');
        $dateFilter = $request->input('date');
        $departmentFilter = $request->input('department');
        $editsOnlyFilter = $request->boolean('edits_only');
        
        // Start building the query
        $query = ProcessedAttendance::with('employee');
        
        // Apply filters if present
        if ($searchTerm) {
            $query->whereHas('employee', function ($q) use ($searchTerm) {
                $q->where('idno', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('Fname', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('Lname', 'LIKE', "%{$searchTerm}%");
            });
        }
        
        if ($dateFilter) {
            $query->whereDate('attendance_date', $dateFilter);
        }
        
        if ($departmentFilter) {
            $query->whereHas('employee', function ($q) use ($departmentFilter) {
                $q->where('Department', $departmentFilter);
            });
        }
        
        if ($editsOnlyFilter) {
            $query->where('source', 'manual_edit');
        }
        
        return $query;
    }
    
    /**
 * Update processed attendance record
 */
public function update(Request $request, $id)
{
    try {
        // Log incoming request data
        Log::info('Attendance update request for ID: ' . $id, [
            'request_data' => $request->all()
        ]);

        $validator = Validator::make($request->all(), [
            'time_in' => 'nullable|date',
            'time_out' => 'nullable|date',
            'break_in' => 'nullable|date',
            'break_out' => 'nullable|date',
            'next_day_timeout' => 'nullable|date',
            'is_nightshift' => 'boolean', 
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed for attendance update ID: ' . $id, [
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find the attendance record
        $attendance = ProcessedAttendance::findOrFail($id);
        
        // Log the existing record before update
        Log::info('Existing attendance record before update', [
            'id' => $attendance->id,
            'employee_id' => $attendance->employee_id,
            'current_is_nightshift' => $attendance->is_nightshift
        ]);
        
        // Parse booleans correctly - cast explicitly to boolean
        $isNightshift = (bool)$request->is_nightshift;
        
        // Log the sanitized value
        Log::info('Sanitized is_nightshift value', [
            'original' => $request->is_nightshift,
            'sanitized' => $isNightshift
        ]);
        
        // Prepare update data
        $updateData = [
            'time_in' => $request->time_in ?: null,
            'time_out' => $request->time_out ?: null,
            'break_in' => $request->break_in ?: null,
            'break_out' => $request->break_out ?: null,
            'next_day_timeout' => $isNightshift ? ($request->next_day_timeout ?: null) : null,
            'is_nightshift' => $isNightshift,
            'source' => 'manual_edit', // Mark as manually edited
        ];
        
        // Log the update data
        Log::info('Updating attendance record with data', [
            'id' => $id,
            'update_data' => $updateData
        ]);
        
        // Update the record
        $attendance->update($updateData);
        
        // Log after successful update
        Log::info('Attendance record updated successfully', [
            'id' => $attendance->id,
            'new_is_nightshift' => $attendance->is_nightshift
        ]);
        
        // Calculate hours worked
        Log::info('Calculating hours worked for attendance record', ['id' => $attendance->id]);
        $this->calculateHoursWorked($attendance);
        Log::info('Hours calculation complete', [
            'id' => $attendance->id, 
            'hours_worked' => $attendance->hours_worked
        ]);
        
        // Get employee data to include in response
        $employee = $attendance->employee;
        
        // Format response data with proper time formats
        $responseData = [
            'id' => $attendance->id,
            'employee_id' => $attendance->employee_id,
            'attendance_date' => $attendance->attendance_date->format('Y-m-d'),
            'attendance_date_formatted' => $attendance->attendance_date->format('Y-m-d'),
            'time_in' => $attendance->time_in ? $attendance->time_in->format('h:i A') : null,
            'time_out' => $attendance->time_out ? $attendance->time_out->format('h:i A') : null,
            'break_in' => $attendance->break_in ? $attendance->break_in->format('h:i A') : null,
            'break_out' => $attendance->break_out ? $attendance->break_out->format('h:i A') : null,
            'next_day_timeout' => $attendance->next_day_timeout ? $attendance->next_day_timeout->format('h:i A') : null,
            'hours_worked' => $attendance->hours_worked,
            'source' => $attendance->source,
            'is_nightshift' => (bool)$attendance->is_nightshift,  // Ensure boolean type
            'day' => $attendance->attendance_date->format('l')
        ];
        
        // Add employee information if available
        if ($employee) {
            $responseData['idno'] = $employee->idno;
            $responseData['employee_name'] = trim($employee->Fname . ' ' . $employee->Lname);
            $responseData['department'] = $employee->Department;
            $responseData['line'] = $employee->Line;
        } else {
            $responseData['idno'] = 'N/A';
            $responseData['employee_name'] = 'Unknown';
            $responseData['department'] = 'N/A';
            $responseData['line'] = 'N/A';
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Attendance record updated successfully',
            'data' => $responseData
        ]);
    } catch (\Exception $e) {
        Log::error('Error updating attendance: ' . $e->getMessage(), [
            'id' => $id,
            'exception' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to update attendance: ' . $e->getMessage()
        ], 500);
    }
}
    
    /**
     * Calculate hours worked for an attendance record
     */
    private function calculateHoursWorked(ProcessedAttendance $attendance)
    {
        if ($attendance->time_in) {
            $start = $attendance->time_in;
            $end = null;
            
            // Use next_day_timeout for night shifts, otherwise use time_out
            if ($attendance->is_nightshift && $attendance->next_day_timeout) {
                $end = $attendance->next_day_timeout;
            } else if ($attendance->time_out) {
                $end = $attendance->time_out;
            }
            
            if ($end) {
                // Calculate total minutes
                $totalMinutes = $end->diffInMinutes($start);
                
                // Subtract break time if both break_in and break_out are set
                if ($attendance->break_in && $attendance->break_out) {
                    $breakMinutes = $attendance->break_out->diffInMinutes($attendance->break_in);
                    $totalMinutes -= $breakMinutes;
                }
                
                // Convert minutes to hours with proper rounding
                $attendance->hours_worked = round($totalMinutes / 60, 2);
                $attendance->save();
            }
        }
    }

    /**
     * Get available departments for filtering
     */
    public function getDepartments()
    {
        try {
            $departments = Employee::select('Department')
                ->whereNotNull('Department')
                ->distinct()
                ->orderBy('Department')
                ->pluck('Department');
                
            return response()->json([
                'success' => true,
                'data' => $departments
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching departments: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch departments: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export attendance data to CSV
     */
    public function export(Request $request)
    {
        try {
            // Build query with filters
            $query = $this->buildAttendanceQuery($request);
            
            // Order by date and employee
            $attendances = $query->orderBy('attendance_date', 'desc')
                               ->with('employee')
                               ->get();
            
            // Prepare file name
            $fileName = 'attendance_export_' . date('Y-m-d_H-i-s') . '.csv';
            
            // Define headers
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0'
            ];
            
            // Create callback for streamed response
            $callback = function() use ($attendances) {
                $file = fopen('php://output', 'w');
                
                // Add CSV header row
                fputcsv($file, [
                    'Employee ID',
                    'Employee Name',
                    'Department',
                    'Line',
                    'Date',
                    'Time In',
                    'Time Out',
                    'Break Out',
                    'Break In',
                    'Next Day Timeout',
                    'Hours Worked',
                    'Night Shift',
                    'Source',
                    'Edited'
                ]);
                
                // Add data rows
                foreach ($attendances as $attendance) {
                    $employee = $attendance->employee;
                    
                    $row = [
                        $employee ? $employee->idno : 'N/A',
                        $employee ? trim($employee->Fname . ' ' . $employee->Lname) : 'Unknown',
                        $employee ? $employee->Department : 'N/A',
                        $employee ? $employee->Line : 'N/A',
                        $attendance->attendance_date ? $attendance->attendance_date->format('Y-m-d') : 'N/A',
                        $attendance->time_in ? $attendance->time_in->format('h:i A') : 'N/A',
                        $attendance->time_out ? $attendance->time_out->format('h:i A') : 'N/A',
                        $attendance->break_in ? $attendance->break_in->format('h:i A') : 'N/A',
                        $attendance->break_out ? $attendance->break_out->format('h:i A') : 'N/A',
                        $attendance->next_day_timeout ? $attendance->next_day_timeout->format('h:i A') : 'N/A',
                        $attendance->hours_worked ?? 'N/A',
                        $attendance->is_nightshift ? 'Yes' : 'No',
                        ucfirst($attendance->source ?? 'Unknown'),
                        $attendance->source === 'manual_edit' ? 'Yes' : 'No'
                    ];
                    
                    fputcsv($file, $row);
                }
                
                fclose($file);
            };
            
            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Error exporting attendance data: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to export attendance data: ' . $e->getMessage()
            ], 500);
        }
    }
}