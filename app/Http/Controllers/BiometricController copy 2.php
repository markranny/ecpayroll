<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\AttendanceLog;
use App\Models\ProcessedAttendance;
use App\Models\BiometricDevice;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use App\Services\ZKTecoService;
use App\Libraries\ZKTeco\ZKLib;

class BiometricController extends Controller
{
    /**
     * Display the biometric management page.
     */
    public function index()
    {
        $devices = BiometricDevice::all();
        
        return Inertia::render('Timesheet/BiometricManagement', [
            'devices' => $devices,
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }
    
    /**
     * Display the timesheet import page.
     */
    public function importForm()
    {
        $devices = BiometricDevice::all();
        
        return Inertia::render('Timesheet/ImportAttendance', [
            'devices' => $devices,
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }
    
    /**
     * Store a new biometric device.
     */
    public function storeDevice(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'location' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            $device = BiometricDevice::create([
                'name' => $request->name,
                'ip_address' => $request->ip_address,
                'port' => $request->port,
                'location' => $request->location,
                'model' => $request->model,
                'serial_number' => $request->serial_number,
                'last_sync' => null,
                'status' => 'active',
            ]);
            
            return redirect()->back()->with('success', 'Biometric device added successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to add biometric device: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to add device: ' . $e->getMessage());
        }
    }
    
    /**
     * Update a biometric device.
     */
    public function updateDevice(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
            'location' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            $device = BiometricDevice::findOrFail($id);
            
            $device->update([
                'name' => $request->name,
                'ip_address' => $request->ip_address,
                'port' => $request->port,
                'location' => $request->location,
                'model' => $request->model,
                'serial_number' => $request->serial_number,
                'status' => $request->status,
            ]);
            
            return redirect()->back()->with('success', 'Biometric device updated successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to update biometric device: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update device: ' . $e->getMessage());
        }
    }
    
    /**
     * Delete a biometric device.
     */
    public function deleteDevice($id)
    {
        try {
            $device = BiometricDevice::findOrFail($id);
            $device->delete();
            
            return redirect()->back()->with('success', 'Biometric device deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to delete biometric device: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to delete device: ' . $e->getMessage());
        }
    }
    
    /**
     * Test connection to a biometric device.
     */
    public function testConnection(Request $request)
    {
        try {
            // Create the service
            $service = new ZKTecoService($request->ip_address, $request->port);
            
            // First try a basic socket test
            $socketTest = $service->testSocket();
            
            if (!$socketTest['success']) {
                return response()->json([
                    'success' => false, 
                    'message' => 'Connection failed at socket level: ' . $socketTest['message'],
                    'diagnostic_details' => [
                        'ip' => $request->ip_address,
                        'port' => $request->port,
                        'test_type' => 'socket'
                    ]
                ], 400);
            }
            
            // Now try the actual ZKTeco connection
            try {
                $connected = $service->connect();
                
                if (!$connected) {
                    return response()->json([
                        'success' => false, 
                        'message' => 'ZKTeco connection failed after socket test succeeded. Device may be incompatible or in an error state.',
                        'diagnostic_details' => [
                            'ip' => $request->ip_address,
                            'port' => $request->port,
                            'socket_test' => 'passed',
                            'zklib_test' => 'failed'
                        ]
                    ], 400);
                }
                
                // Try to get device info
                $deviceInfo = $service->getDeviceInfo();
                
                $service->disconnect();
                
                return response()->json([
                    'success' => true, 
                    'message' => 'Successfully connected to the device.',
                    'device_info' => $deviceInfo
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false, 
                    'message' => 'ZKTeco communication error: ' . $e->getMessage(),
                    'diagnostic_details' => [
                        'ip' => $request->ip_address,
                        'port' => $request->port,
                        'socket_test' => 'passed',
                        'error_details' => $e->getMessage()
                    ]
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('ZKTeco Connection Diagnostic', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'ip' => $request->ip_address,
                'port' => $request->port
            ]);
            
            return response()->json([
                'success' => false, 
                'message' => 'Error: ' . $e->getMessage(),
                'diagnostic_details' => [
                    'ip' => $request->ip_address,
                    'port' => $request->port,
                    'error_type' => get_class($e)
                ]
            ], 500);
        }
    }
    
    /**
     * Fetch attendance logs from a biometric device.
     */
    public function fetchLogs(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'device_id' => 'sometimes|exists:biometric_devices,id',
            'ip_address' => 'required_without:device_id|ip',
            'port' => 'required_without:device_id|integer|min:1|max:65535',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'clear_device_logs' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 400);
        }

        try {
            // Get device details
            if ($request->has('device_id')) {
                $device = BiometricDevice::findOrFail($request->device_id);
                $ipAddress = $device->ip_address;
                $port = $device->port;
            } else {
                $ipAddress = $request->ip_address;
                $port = $request->port;
            }
            
            // Create the service
            $service = new ZKTecoService($ipAddress, $port);
            
            // Try to connect
            try {
                $connected = $service->connect();
                
                if (!$connected) {
                    return response()->json([
                        'success' => false, 
                        'message' => 'Failed to connect to the device. Check if the device is powered on and connected to the network.',
                    ], 400);
                }
                
                // Fetch attendance logs
                $attendanceLogs = $service->getAttendance();
                
                // Process logs
                $savedCount = 0;
                $errors = [];
                
                if (empty($attendanceLogs)) {
                    $service->disconnect();
                    return response()->json([
                        'success' => true, 
                        'message' => 'No attendance logs found on the device.',
                        'saved_count' => 0,
                        'logs_count' => 0
                    ]);
                }
                
                // Process each log
                foreach ($attendanceLogs as $log) {
                    try {
                        // Convert timestamp
                        $timestamp = Carbon::createFromFormat('Y-m-d H:i:s', $log['timestamp']);
                        
                        // Check date range if specified
                        if ($request->has('start_date') && $timestamp->lt(Carbon::parse($request->start_date)->startOfDay())) {
                            continue;
                        }
                        
                        if ($request->has('end_date') && $timestamp->gt(Carbon::parse($request->end_date)->endOfDay())) {
                            continue;
                        }
                        
                        // Find employee
                        $employee = Employee::where('biometric_id', $log['id'])->first();
                        
                        if (!$employee) {
                            $errors[] = "Employee with biometric ID {$log['id']} not found for timestamp {$log['timestamp']}.";
                            continue;
                        }
                        
                        // Check if log exists
                        $existingLog = AttendanceLog::where('employee_id', $employee->id)
                            ->where('timestamp', $timestamp)
                            ->where('biometric_id', $log['id'])
                            ->first();
                        
                        if (!$existingLog) {
                            // Create log
                            AttendanceLog::create([
                                'employee_id' => $employee->id,
                                'biometric_id' => $log['id'],
                                'timestamp' => $timestamp,
                                'device_id' => $request->has('device_id') ? $request->device_id : null,
                                'status' => $log['status'] ?? 0,
                                'type' => $log['type'] ?? 0,
                            ]);
                            
                            $savedCount++;
                        }
                    } catch (\Exception $e) {
                        $errors[] = "Error processing log ID {$log['id']}: " . $e->getMessage();
                        Log::error('Error processing attendance log', [
                            'log' => $log,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
                
                // Process logs into daily records if any were saved
                if ($savedCount > 0) {
                    $this->processAttendanceLogs($request->start_date, $request->end_date);
                }
                
                // Clear device logs if requested
                if ($request->has('clear_device_logs') && $request->clear_device_logs) {
                    try {
                        $service->clearAttendance();
                    } catch (\Exception $e) {
                        $errors[] = "Failed to clear device logs: " . $e->getMessage();
                    }
                }
                
                // Update device last sync time
                if ($request->has('device_id')) {
                    $device->update(['last_sync' => now()]);
                }
                
                // Disconnect
                $service->disconnect();
                
                return response()->json([
                    'success' => true, 
                    'message' => "Successfully fetched attendance logs. Saved $savedCount new records.",
                    'saved_count' => $savedCount,
                    'errors' => $errors,
                    'logs_count' => count($attendanceLogs)
                ]);
            } catch (\Exception $e) {
                Log::error('ZKTeco attendance fetch error', [
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'ip' => $ipAddress,
                    'port' => $port
                ]);
                
                return response()->json([
                    'success' => false, 
                    'message' => 'Error fetching attendance logs: ' . $e->getMessage(),
                    'error_details' => [
                        'message' => $e->getMessage(),
                        'type' => get_class($e)
                    ]
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Failed to fetch attendance logs: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Process raw attendance logs into processed attendances.
     */
    private function processAttendanceLogs($startDate = null, $endDate = null)
    {
        try {
            // Set default date range if not provided
            if (!$startDate) {
                $startDate = Carbon::now()->subDays(7)->startOfDay();
            } else {
                $startDate = Carbon::parse($startDate)->startOfDay();
            }
            
            if (!$endDate) {
                $endDate = Carbon::now()->endOfDay();
            } else {
                $endDate = Carbon::parse($endDate)->endOfDay();
            }
            
            // Get all attendance logs within the date range
            $logs = AttendanceLog::whereBetween('timestamp', [$startDate, $endDate])
                ->orderBy('employee_id')
                ->orderBy('timestamp')
                ->get();
            
            // Group logs by employee and date
            $groupedLogs = [];
            
            foreach ($logs as $log) {
                $employeeId = $log->employee_id;
                $date = $log->timestamp->format('Y-m-d');
                
                if (!isset($groupedLogs[$employeeId])) {
                    $groupedLogs[$employeeId] = [];
                }
                
                if (!isset($groupedLogs[$employeeId][$date])) {
                    $groupedLogs[$employeeId][$date] = [];
                }
                
                $groupedLogs[$employeeId][$date][] = $log;
            }
            
            // Process each employee's logs
            foreach ($groupedLogs as $employeeId => $dates) {
                foreach ($dates as $date => $dayLogs) {
                    // Sort logs by timestamp
                    usort($dayLogs, function($a, $b) {
                        return $a->timestamp <=> $b->timestamp;
                    });
                    
                    // Get first log as time in and last log as time out
                    $timeIn = $dayLogs[0]->timestamp;
                    $timeOut = end($dayLogs)->timestamp;
                    
                    // Calculate hours worked
                    $hoursWorked = $timeIn->diffInHours($timeOut);
                    
                    // Create or update processed attendance record
                    ProcessedAttendance::updateOrCreate(
                        [
                            'employee_id' => $employeeId,
                            'attendance_date' => $date,
                        ],
                        [
                            'time_in' => $timeIn,
                            'time_out' => $timeOut,
                            'hours_worked' => $hoursWorked,
                            'status' => 'present',
                            'source' => 'biometric',
                            'remarks' => null,
                        ]
                    );
                }
            }
            
            return true;
        } catch (\Exception $e) {
            Log::error('Failed to process attendance logs: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Import attendance data from CSV file.
     */
    public function importAttendance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            $file = $request->file('file');
            $filePath = $file->getRealPath();
            
            // Parse CSV file
            $fileHandle = fopen($filePath, 'r');
            // Skip the header row
            $header = fgetcsv($fileHandle);
            
            $savedCount = 0;
            $errors = [];
            $line = 2; // Start from line 2 (after header)
            
            // Process each row
            while (($row = fgetcsv($fileHandle)) !== false) {
                try {
                    // Skip empty rows
                    if (count($row) < 3 || empty($row[0])) {
                        continue;
                    }
                    
                    // Expected format: [BiometricID, Name, DateTime, Status, ...]
                    $biometricId = trim($row[0]);
                    $timestamp = null;
                    
                    // Try different date formats
                    $dateTimeFormats = [
                        'Y-m-d H:i:s',
                        'm/d/Y H:i:s',
                        'd/m/Y H:i:s',
                        'Y/m/d H:i:s',
                        'd-m-Y H:i:s',
                    ];
                    
                    foreach ($dateTimeFormats as $format) {
                        try {
                            $timestamp = Carbon::createFromFormat($format, trim($row[2]));
                            break;
                        } catch (\Exception $e) {
                            continue;
                        }
                    }
                    
                    if (!$timestamp) {
                        $errors[] = "Line $line: Unable to parse date/time format: {$row[2]}";
                        $line++;
                        continue;
                    }
                    
                    // Find the employee by biometric ID
                    $employee = Employee::where('biometric_id', $biometricId)->first();
                    
                    // Skip if employee not found, but log it
                    if (!$employee) {
                        $errors[] = "Line $line: Employee with biometric ID $biometricId not found.";
                        $line++;
                        continue;
                    }
                    
                    // Check if this log already exists
                    $existingLog = AttendanceLog::where('employee_id', $employee->id)
                        ->where('timestamp', $timestamp)
                        ->where('biometric_id', $biometricId)
                        ->first();
                    
                    if (!$existingLog) {
                        // Create new attendance log
                        AttendanceLog::create([
                            'employee_id' => $employee->id,
                            'biometric_id' => $biometricId,
                            'timestamp' => $timestamp,
                            'device_id' => null, // No device ID for CSV imports
                            'status' => isset($row[3]) ? intval($row[3]) : 0,
                            'type' => isset($row[4]) ? intval($row[4]) : 0,
                        ]);
                        
                        $savedCount++;
                    }
                } catch (\Exception $e) {
                    $errors[] = "Line $line: " . $e->getMessage();
                    Log::error('Error processing CSV line: ' . $e->getMessage(), [
                        'line' => $line,
                        'row' => $row ?? 'empty',
                        'trace' => $e->getTraceAsString()
                    ]);
                }
                
                $line++;
            }
            
            fclose($fileHandle);
            
            // Process the logs into processed_attendances
            if ($savedCount > 0) {
                $this->processAttendanceLogs();
            }
            
            return redirect()->back()->with([
                'success' => "Successfully imported attendance logs. Saved $savedCount new records.",
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to import attendance file: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Download CSV template for attendance import.
     */
    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="attendance_import_template.csv"',
        ];
        
        $content = "BiometricID,Name,DateTime,Status,Type\n";
        $content .= "101,John Doe,2023-05-01 08:30:00,0,0\n";
        $content .= "101,John Doe,2023-05-01 17:30:00,1,0\n";
        $content .= "102,Jane Smith,2023-05-01 08:45:00,0,0\n";
        $content .= "102,Jane Smith,2023-05-01 17:15:00,1,0\n";
        
        return response($content, 200, $headers);
    }
    
    /**
     * Get attendance report data.
     */
    public function getAttendanceReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department' => 'nullable|string',
            'employee_id' => 'nullable|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 400);
        }

        try {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            
            // Build query for processed attendance
            $query = ProcessedAttendance::with('employee')
                ->whereBetween('attendance_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
            
            // Filter by department if specified
            if ($request->has('department') && $request->department) {
                $query->whereHas('employee', function($q) use($request) {
                    $q->where('Department', $request->department);
                });
            }
            
            // Filter by employee if specified
            if ($request->has('employee_id') && $request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }
            
            // Search by employee name or ID
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('employee', function($q) use($search) {
                    $q->where('Fname', 'like', "%{$search}%")
                      ->orWhere('Lname', 'like', "%{$search}%")
                      ->orWhere('idno', 'like', "%{$search}%");
                });
            }
            
            // Get the records and format for the response
            $records = $query->orderBy('attendance_date', 'desc')->get();
            
            $formattedRecords = $records->map(function($record) {
                return [
                    'id' => $record->id,
                    'employee_id' => $record->employee_id,
                    'employee_name' => $record->employee ? $record->employee->Fname . ' ' . $record->employee->Lname : 'Unknown',
                    'employee_idno' => $record->employee ? $record->employee->idno : 'N/A',
                    'department' => $record->employee ? $record->employee->Department : 'N/A',
                    'attendance_date' => $record->attendance_date->format('Y-m-d'),
                    'time_in' => $record->time_in ? $record->time_in->format('H:i:s') : null,
                    'time_out' => $record->time_out ? $record->time_out->format('H:i:s') : null,
                    'hours_worked' => $record->hours_worked,
                    'status' => $record->status,
                    'source' => $record->source,
                    'remarks' => $record->remarks,
                ];
            });
            
            return response()->json([
                'success' => true,
                'data' => $formattedRecords,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get attendance report: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Export attendance report to CSV.
     */
    public function exportAttendanceReport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'department' => 'nullable|string',
            'employee_id' => 'nullable|exists:employees,id',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator);
        }

        try {
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->endOfDay();
            
            // Build query for processed attendance
            $query = ProcessedAttendance::with('employee')
                ->whereBetween('attendance_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);
            
            // Filter by department if specified
            if ($request->has('department') && $request->department) {
                $query->whereHas('employee', function($q) use($request) {
                    $q->where('Department', $request->department);
                });
            }
            
            // Filter by employee if specified
            if ($request->has('employee_id') && $request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }
            
            // Search by employee name or ID
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->whereHas('employee', function($q) use($search) {
                    $q->where('Fname', 'like', "%{$search}%")
                      ->orWhere('Lname', 'like', "%{$search}%")
                      ->orWhere('idno', 'like', "%{$search}%");
                });
            }
            
            // Get the records
            $records = $query->orderBy('attendance_date', 'desc')->get();
            
            // Create CSV file
            $filename = 'attendance_report_' . $startDate->format('Y-m-d') . '_to_' . $endDate->format('Y-m-d') . '.csv';
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];
            
            $callback = function() use($records) {
                $file = fopen('php://output', 'w');
                
                // Add CSV header
                fputcsv($file, [
                    'Date', 'Employee ID', 'Employee Name', 'Department', 
                    'Time In', 'Time Out', 'Hours Worked', 'Status', 'Source', 'Remarks'
                ]);
                
                // Add data rows
                foreach ($records as $record) {
                    fputcsv($file, [
                        $record->attendance_date->format('Y-m-d'),
                        $record->employee ? $record->employee->idno : 'N/A',
                        $record->employee ? $record->employee->Fname . ' ' . $record->employee->Lname : 'Unknown',
                        $record->employee ? $record->employee->Department : 'N/A',
                        $record->time_in ? $record->time_in->format('H:i:s') : 'N/A',
                        $record->time_out ? $record->time_out->format('H:i:s') : 'N/A',
                        $record->hours_worked ?? 'N/A',
                        $record->status,
                        $record->source,
                        $record->remarks ?? '',
                    ]);
                }
                
                fclose($file);
            };
            
            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            Log::error('Failed to export attendance report: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Show form for manual attendance entry.
     */
    public function manualEntryForm()
    {
        $employees = Employee::select('id', 'Fname', 'Lname', 'idno', 'Department')->orderBy('Fname')->get();
        
        return Inertia::render('Timesheet/ManualAttendance', [
            'employees' => $employees,
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }
    
    /**
 * Store manual attendance entry.
 */
public function storeManualEntry(Request $request)
{
    $validator = Validator::make($request->all(), [
        'employee_id' => 'required|exists:employees,id',
        'attendance_date' => 'required|date|before_or_equal:today',
        'time_in' => 'required|date_format:H:i',
        'time_out' => 'required|date_format:H:i|after:time_in',
        'remarks' => 'nullable|string',
    ]);

    if ($validator->fails()) {
        // Return JSON response for Inertia/React form
        return response()->json(['errors' => $validator->errors()], 422);
    }

    try {
        $date = Carbon::parse($request->attendance_date)->format('Y-m-d');
        $timeIn = Carbon::parse($date . ' ' . $request->time_in);
        $timeOut = Carbon::parse($date . ' ' . $request->time_out);
        
        // Calculate hours worked
        $hoursWorked = $timeIn->floatDiffInHours($timeOut);
        
        // Get day of week for the day column
        $day = $timeIn->format('l'); // Returns day name (Monday, Tuesday, etc.)
        
        // Create or update processed attendance record
        // Note: Using field names that match your actual database schema
        $attendance = ProcessedAttendance::updateOrCreate(
            [
                'employee_id' => $request->employee_id,
                'attendance_date' => $date,
            ],
            [
                'day' => $day,
                'time_in' => $timeIn,
                'time_out' => $timeOut,
                'hours_worked' => $hoursWorked,
                'source' => 'manual',
                'notes' => $request->remarks, // Using 'notes' instead of 'remarks'
                'is_nightshift' => false, // Default value
            ]
        );
        
        // Log successful operation with details
        Log::info('Manual attendance saved', [
            'employee_id' => $request->employee_id,
            'date' => $date,
            'time_in' => $timeIn->format('H:i:s'),
            'time_out' => $timeOut->format('H:i:s'),
            'attendance_id' => $attendance->id
        ]);
        
        return response()->json([
            'success' => true, 
            'message' => 'Manual attendance entry saved successfully.',
            'attendance' => $attendance
        ]);
    } catch (\Exception $e) {
        Log::error('Failed to save manual attendance entry: ' . $e->getMessage(), [
            'request_data' => $request->all(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false, 
            'message' => 'Error: ' . $e->getMessage()
        ], 500);
    }
}
    
    /**
     * Edit an attendance record.
     */
    public function editAttendance($id)
    {
        try {
            $attendance = ProcessedAttendance::with('employee')->findOrFail($id);
            $employees = Employee::select('id', 'Fname', 'Lname', 'idno', 'Department')->orderBy('Fname')->get();
            
            return Inertia::render('Timesheet/EditAttendance', [
                'attendance' => [
                    'id' => $attendance->id,
                    'employee_id' => $attendance->employee_id,
                    'employee_name' => $attendance->employee ? $attendance->employee->Fname . ' ' . $attendance->employee->Lname : 'Unknown',
                    'attendance_date' => $attendance->attendance_date->format('Y-m-d'),
                    'time_in' => $attendance->time_in ? $attendance->time_in->format('H:i') : null,
                    'time_out' => $attendance->time_out ? $attendance->time_out->format('H:i') : null,
                    'status' => $attendance->status,
                    'remarks' => $attendance->remarks,
                ],
                'employees' => $employees,
                'auth' => [
                    'user' => auth()->user(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to edit attendance record: ' . $e->getMessage());
            return redirect()->route('attendance.report')->with('error', 'Error: ' . $e->getMessage());
        }
    }
    
    /**
     * Update an attendance record.
     */
    public function updateAttendance(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'employee_id' => 'required|exists:employees,id',
            'attendance_date' => 'required|date',
            'time_in' => 'nullable|date_format:H:i',
            'time_out' => 'nullable|date_format:H:i',
            'status' => 'required|in:present,absent,late,half_day,leave',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 400);
        }

        try {
            $attendance = ProcessedAttendance::findOrFail($id);
            
            $date = Carbon::parse($request->attendance_date)->format('Y-m-d');
            $timeIn = $request->time_in ? Carbon::parse($date . ' ' . $request->time_in) : null;
            $timeOut = $request->time_out ? Carbon::parse($date . ' ' . $request->time_out) : null;
            
            // Calculate hours worked if both time_in and time_out are provided
            $hoursWorked = null;
            if ($timeIn && $timeOut) {
                $hoursWorked = $timeIn->floatDiffInHours($timeOut);
            }
            
            // Update attendance record
            $attendance->update([
                'employee_id' => $request->employee_id,
                'attendance_date' => $date,
                'time_in' => $timeIn,
                'time_out' => $timeOut,
                'hours_worked' => $hoursWorked,
                'status' => $request->status,
                'remarks' => $request->remarks,
            ]);
            
            return response()->json(['success' => true, 'message' => 'Attendance record updated successfully.']);
        } catch (\Exception $e) {
            Log::error('Failed to update attendance record: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Delete an attendance record.
     */
    public function deleteAttendance($id)
    {
        try {
            $attendance = ProcessedAttendance::findOrFail($id);
            $attendance->delete();
            
            return response()->json(['success' => true, 'message' => 'Attendance record deleted successfully.']);
        } catch (\Exception $e) {
            Log::error('Failed to delete attendance record: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Error: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Run diagnostic tests on a biometric device.
     */
    public function diagnosticTest(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ip_address' => 'required|ip',
            'port' => 'required|integer|min:1|max:65535',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => $validator->errors()->first()], 400);
        }

        try {
            $results = [];
            
            // Step 1: Basic network test
            $pingResult = -1;
            if (PHP_OS === 'WINNT') {
                // Windows
                exec("ping -n 1 -w 1000 " . escapeshellarg($request->ip_address), $pingOutput, $pingResult);
            } else {
                // Linux/Unix/Mac
                exec("ping -c 1 -W 1 " . escapeshellarg($request->ip_address), $pingOutput, $pingResult);
            }
            
            $results['ping_test'] = [
                'success' => ($pingResult === 0),
                'details' => ($pingResult === 0) ? 'Device is reachable' : 'Device cannot be pinged'
            ];
            
            // Step 2: Socket test
            $socket = @fsockopen($request->ip_address, $request->port, $errno, $errstr, 5);
            $results['socket_test'] = [
                'success' => ($socket !== false),
                'details' => ($socket !== false) ? 'Port is open' : "Port connection failed: $errstr ($errno)"
            ];
            
            if ($socket !== false) {
                fclose($socket);
            }
            
            // Step 3: ZKLib test
            if ($results['socket_test']['success']) {
                try {
                    $service = new ZKTecoService($request->ip_address, $request->port);
                    $connected = $service->connect();
                    
                    $results['zklib_test'] = [
                        'success' => $connected,
                        'details' => $connected ? 'ZKLib successfully connected' : 'ZKLib connect() returned false'
                    ];
                    
                    if ($connected) {
                        // Try to get device info
                        try {
                            $deviceInfo = $service->getDeviceInfo();
                            $results['device_info'] = [
                                'success' => true,
                                'details' => $deviceInfo
                            ];
                        } catch (\Exception $e) {
                            $results['device_info'] = [
                                'success' => false,
                                'details' => 'Failed to get device info: ' . $e->getMessage()
                            ];
                        }
                        
                        // Try to get attendance logs count
                        try {
                            $logs = $service->getAttendance();
                            $results['attendance_logs'] = [
                                'success' => is_array($logs),
                                'details' => is_array($logs) ? 'Found ' . count($logs) . ' logs' : 'Failed to retrieve logs'
                            ];
                        } catch (\Exception $e) {
                            $results['attendance_logs'] = [
                                'success' => false,
                                'details' => 'Error retrieving logs: ' . $e->getMessage()
                            ];
                        }
                        
                        $service->disconnect();
                    }
                } catch (\Exception $e) {
                    $results['zklib_test'] = [
                        'success' => false,
                        'details' => 'ZKLib error: ' . $e->getMessage()
                    ];
                }
            }
            
            // Overall status
            $success = $results['ping_test']['success'] && $results['socket_test']['success'];
            if (isset($results['zklib_test'])) {
                $success = $success && $results['zklib_test']['success'];
            }
            
            return response()->json([
                'success' => $success,
                'message' => $success ? 'All tests passed' : 'Some tests failed',
                'results' => $results,
                'recommendations' => $this->getDiagnosticRecommendations($results)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Diagnostic error: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Generate recommendations based on diagnostic results.
     */
    private function getDiagnosticRecommendations($results)
    {
        $recommendations = [];
        
        if (!$results['ping_test']['success']) {
            $recommendations[] = 'Device is not reachable on the network. Check if the device is powered on, connected to the network, and has the correct IP address.';
            $recommendations[] = 'Verify network settings and check if there are any firewalls blocking ICMP (ping) packets.';
        }
        
        if ($results['ping_test']['success'] && !$results['socket_test']['success']) {
            $recommendations[] = 'Device is reachable but port is closed. Check if the device is configured to listen on the specified port.';
            $recommendations[] = 'Check if there are any firewalls blocking access to this port.';
        }
        
        if (isset($results['zklib_test']) && !$results['zklib_test']['success']) {
            $recommendations[] = 'ZKLib cannot connect to the device. This could be due to:';
            $recommendations[] = '- Incompatible device model or firmware';
            $recommendations[] = '- Device is in a locked or error state';
            $recommendations[] = '- Device requires authentication';
            $recommendations[] = 'Try power cycling the device and updating to the latest firmware.';
        }
        
        if (empty($recommendations)) {
            $recommendations[] = 'All tests passed. If you are still experiencing issues, try:';
            $recommendations[] = '- Restarting the device';
            $recommendations[] = '- Checking for firmware updates';
            $recommendations[] = '- Verifying that your ZKLib version is compatible with this device model';
        }
        
        return $recommendations;
    }
}