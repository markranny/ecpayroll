<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;  // Add this line
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
use Rats\Zkteco\Lib\ZKTeco; 
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache; // Add this import
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
   /**
 * Test connection to biometric device
 * 
 * @param \Illuminate\Http\Request $request
 * @return \Illuminate\Http\JsonResponse
 */
/**
 * Test connection to biometric device
 * 
 * @param \Illuminate\Http\Request $request
 * @return \Illuminate\Http\JsonResponse
 */
public function testConnection(Request $request)
{
    // Validate request
    $validated = $request->validate([
        'ip_address' => 'required|string',
        'port' => 'required|integer|min:1|max:65535',
    ]);

    $ip = $validated['ip_address'];
    $port = $validated['port'];
    $debugInfo = [];
    
    try {
        // Step 1: Basic network connectivity check (ping)
        $pingStart = microtime(true);
        $pingCommand = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN')
            ? "ping -n 1 -w 1000 $ip" // Windows
            : "ping -c 1 -W 1 $ip";   // Linux/MacOS

        exec($pingCommand, $pingOutput, $pingReturnCode);
        $pingEnd = microtime(true);
        $pingTime = round(($pingEnd - $pingStart) * 1000, 2);
        
        $pingResult = [
            'success' => ($pingReturnCode === 0),
            'time_ms' => $pingTime,
            'output' => implode("\n", $pingOutput)
        ];
        
        $debugInfo['ping_test'] = $pingResult;
        
        if ($pingReturnCode !== 0) {
            return response()->json([
                'success' => false,
                'message' => "Device is not reachable (ping failed)",
                'device_info' => null,
                'debug_info' => $debugInfo
            ]);
        }
        
        // Step 2: TCP port check
        $socketStart = microtime(true);
        $socket = @fsockopen($ip, $port, $errno, $errstr, 2);
        $socketEnd = microtime(true);
        $socketTime = round(($socketEnd - $socketStart) * 1000, 2);
        
        $socketResult = [
            'success' => ($socket !== false),
            'time_ms' => $socketTime,
            'error' => $socket === false ? "$errno: $errstr" : null
        ];
        
        $debugInfo['socket_test'] = $socketResult;
        
        if ($socket === false) {
            return response()->json([
                'success' => false,
                'message' => "Device is reachable but port $port is closed or filtered",
                'device_info' => null,
                'debug_info' => $debugInfo
            ]);
        }
        
        fclose($socket);
        
        // Step 3: ZKTeco protocol check - simplified
        try {
            $zkStart = microtime(true);
            $zk = new ZKTeco($ip, $port);
            $connected = $zk->connect();
            $zkEnd = microtime(true);
            $zkTime = round(($zkEnd - $zkStart) * 1000, 2);
            
            $zkResult = [
                'success' => $connected,
                'time_ms' => $zkTime
            ];
            
            $debugInfo['zk_protocol_test'] = $zkResult;
            
            if (!$connected) {
                return response()->json([
                    'success' => false,
                    'message' => "Network connection successful, but device did not respond to ZKTeco protocol",
                    'device_info' => null,
                    'debug_info' => $debugInfo
                ]);
            }
            
            // Just return success without trying to get device info
            // We can add that back once we know what methods are available
            
            // Disconnect from device
            $zk->disconnect();
            
            // Return success response
            return response()->json([
                'success' => true,
                'message' => "Successfully connected to device",
                'device_info' => null,
                'debug_info' => $debugInfo
            ]);
            
        } catch (\Exception $e) {
            $debugInfo['zk_protocol_error'] = $e->getMessage();
            
            return response()->json([
                'success' => false,
                'message' => "Network connection successful, but ZKTeco protocol error: " . $e->getMessage(),
                'device_info' => null,
                'debug_info' => $debugInfo
            ]);
        }
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => "Connection test error: " . $e->getMessage(),
            'device_info' => null,
            'debug_info' => ['exception' => $e->getMessage()]
        ]);
    }
}


// Optimize fetchLogs method to retrieve data faster
public function fetchLogs(Request $request)
{
    $validated = $request->validate([
        'device_id' => 'required|exists:biometric_devices,id',
        'start_date' => 'nullable|date',
        'end_date' => 'nullable|date|after_or_equal:start_date',
    ]);
    
    try {
        // Get the device with minimal query
        $device = BiometricDevice::select(['id', 'name', 'ip_address', 'port'])->findOrFail($validated['device_id']);
        
        // Increase memory only as needed
        ini_set('memory_limit', '512M');
        
        // Create ZKTeco instance with optimized settings
        $zk = new ZKTeco($device->ip_address, $device->port);
        
        // Try to connect with reduced timeout
        $connectTimeout = 5; // reduced from 10 seconds
        $connected = false;
        $connectStart = microtime(true);
        
        while (!$connected && (microtime(true) - $connectStart) < $connectTimeout) {
            $connected = $zk->connect();
            if (!$connected) {
                usleep(200000); // Shorter wait 200ms instead of 500ms
            }
        }
        
        if (!$connected) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect to device'
            ], 400);
        }
        
        // Retrieve logs with optimized approach
        $logs = $this->getAttendanceLogsOptimized($zk, $validated);
        
        // Ensure device disconnection
        $zk->disconnect();
        
        // Use a more efficient saving method
        $saveResult = $this->saveBiometricLogsBatch($logs, $device->id);
        
        // Update device timestamp
        $device->last_sync = now();
        $device->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Successfully fetched and saved logs',
            'log_summary' => $saveResult
        ]);
    } catch (\Exception $e) {
        Log::error('Error fetching logs: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ], 500);
    }
}

private function getAttendanceLogsOptimized($zk, $validated)
{
    // Single attempt to get logs
    $logs = $zk->getAttendance();
    
    // Skip invalid records
    $logs = array_filter($logs, function($log) {
        return isset($log['id']) && isset($log['timestamp']);
    });
    
    // Filter by date range in a single pass
    if (!empty($validated['start_date']) || !empty($validated['end_date'])) {
        $startTimestamp = !empty($validated['start_date']) ? strtotime($validated['start_date']) : 0;
        $endTimestamp = !empty($validated['end_date']) ? strtotime($validated['end_date'] . ' 23:59:59') : PHP_INT_MAX;
        
        $logs = array_filter($logs, function($log) use ($startTimestamp, $endTimestamp) {
            $logTimestamp = strtotime($log['timestamp']);
            return $logTimestamp >= $startTimestamp && $logTimestamp <= $endTimestamp;
        });
    }
    
    return $logs;
}


private function saveBiometricLogsBatch($logs, $deviceId)
{
    // Process in batches of 100 records
    $batchSize = 100;
    $totalLogs = count($logs);
    $processedLogs = 0;
    $skippedLogs = 0;
    $savedRecords = 0;
    
    // Get device info
    $deviceIp = BiometricDevice::where('id', $deviceId)->value('ip_address');
    
    // Process logs with optimized pattern recognition
    $processedLogsWithStatus = $this->processLogsWithOptimizedPatternRecognition($logs);
    
    // Group logs by employee and date
    $groupedLogs = [];
    foreach ($processedLogsWithStatus as $log) {
        try {
            $extractedLog = $this->extractLogDetails($log);
            $biometricId = $extractedLog['user_id'];
            
            // Use a cache lookup for employee IDs to reduce DB queries
            $cacheKey = "employee_idno_{$biometricId}";
            $employee = Cache::remember($cacheKey, 3600, function() use ($biometricId) {
                return Employee::where('idno', $biometricId)->first();
            });
            
            if (!$employee) {
                $skippedLogs++;
                continue;
            }
            
            $timestamp = Carbon::parse($extractedLog['timestamp']);
            $date = $timestamp->format('Y-m-d');
            
            if (!isset($groupedLogs[$employee->id][$date])) {
                $groupedLogs[$employee->id][$date] = [
                    'timestamps' => [],
                    'states' => [],
                    'actual_statuses' => []
                ];
            }
            
            $groupedLogs[$employee->id][$date]['timestamps'][] = $timestamp;
            $groupedLogs[$employee->id][$date]['states'][] = $extractedLog['state'] ?? null;
            $groupedLogs[$employee->id][$date]['actual_statuses'][] = $log['actual_status'] ?? null;
            $processedLogs++;
        } catch (\Exception $e) {
            $skippedLogs++;
        }
    }
    
    // Process in batches using database transactions
    $insertBatch = [];
    
    DB::beginTransaction();
    try {
        foreach ($groupedLogs as $employeeId => $dates) {
            foreach ($dates as $date => $logData) {
                // This processing remains similar, but we'll batch the inserts
                $timestamps = $logData['timestamps'];
                $states = $logData['states'];
                $actualStatuses = $logData['actual_statuses'];
                
                // Sort all arrays based on timestamp
                array_multisort($timestamps, SORT_ASC, $states, $actualStatuses);
                
                // Initialize variables for time tracking
                $totalWorkedMinutes = 0;
                $punchIn = null;
                $timeIn = null;
                $timeOut = null;
                $breakIn = null;
                $breakOut = null;
                
                // Process timestamps based on actual status
                for ($i = 0; $i < count($timestamps); $i++) {
                    $currentTime = $timestamps[$i];
                    $currentActualStatus = $actualStatuses[$i];
                    
                    // Process based on actual status (not device state)
                    switch ($currentActualStatus) {
                        case 'Clock In':
                            if ($timeIn === null) {
                                $timeIn = $currentTime;
                            }
                            $punchIn = $currentTime;
                            break;
                            
                        case 'Clock Out':
                            $timeOut = $currentTime;
                            if ($punchIn !== null) {
                                $workedMinutes = $punchIn->diffInMinutes($currentTime);
                                $totalWorkedMinutes += $workedMinutes;
                                $punchIn = null;
                            }
                            break;
                            
                        case 'Break In':
                            $breakIn = $currentTime;
                            if ($punchIn !== null) {
                                $workedMinutes = $punchIn->diffInMinutes($currentTime);
                                $totalWorkedMinutes += $workedMinutes;
                                $punchIn = null;
                            }
                            break;
                            
                        case 'Break Out':
                            $breakOut = $currentTime;
                            $punchIn = $currentTime;
                            break;
                    }
                }
                
                if ($timeIn === null && count($timestamps) > 0) {
                    $timeIn = $timestamps[0];
                }
                
                $notesText = 'Processed with optimized pattern recognition';
                $lastStatus = end($actualStatuses);
                
                if ($timeOut === null && count($timestamps) > 0) {
                    if ($lastStatus === 'Clock In' || $lastStatus === 'Break Out') {
                        $timeOut = null;
                        $notesText .= ' ATTENTION - Employee is still clocked in. No checkout recorded.';
                    } else {
                        $timeOut = end($timestamps);
                    }
                }
                
                $hoursWorked = null;
                $isNightShift = false;
                
                if ($timeIn && $timeOut) {
                    $hoursWorked = round($totalWorkedMinutes / 60, 2);
                    $isNightShift = $timeIn->format('Y-m-d') !== $timeOut->format('Y-m-d');
                }
                
                $logEntry = [
                    'employee_id' => $employeeId,
                    'attendance_date' => $date,
                    'time_in' => $timeIn ? $timeIn->format('Y-m-d H:i:s') : null,
                    'time_out' => $timeOut ? $timeOut->format('Y-m-d H:i:s') : null,
                    'break_in' => $breakIn ? $breakIn->format('Y-m-d H:i:s') : null,
                    'break_out' => $breakOut ? $breakOut->format('Y-m-d H:i:s') : null,
                    'hours_worked' => $hoursWorked,
                    'is_nightshift' => $isNightShift,
                    'source' => 'biometric',
                    'notes' => $notesText,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Check if the record exists
                $existingRecord = DB::table('processed_attendances')
                    ->where('employee_id', $employeeId)
                    ->where('attendance_date', $date)
                    ->first();
                
                if ($existingRecord) {
                    DB::table('processed_attendances')
                        ->where('id', $existingRecord->id)
                        ->update($logEntry);
                } else {
                    $insertBatch[] = $logEntry;
                }
                
                $savedRecords++;
                
                // Insert in batches to reduce DB roundtrips
                if (count($insertBatch) >= $batchSize) {
                    DB::table('processed_attendances')->insert($insertBatch);
                    $insertBatch = [];
                }
            }
        }
        
        // Insert any remaining records
        if (count($insertBatch) > 0) {
            DB::table('processed_attendances')->insert($insertBatch);
        }
        
        DB::commit();
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Transaction failed: ' . $e->getMessage());
        throw $e;
    }
    
    return [
        'processed_count' => $processedLogs,
        'skipped_count' => $skippedLogs,
        'saved_count' => $savedRecords
    ];
}

// Optimized pattern recognition algorithm
private function processLogsWithOptimizedPatternRecognition($logs)
{
    // First group by employee
    $employeeLogs = [];
    foreach ($logs as $log) {
        $employeeId = $log['id'];
        if (!isset($employeeLogs[$employeeId])) {
            $employeeLogs[$employeeId] = [];
        }
        $employeeLogs[$employeeId][] = $log;
    }
    
    // Process each employee's logs
    $processedLogs = [];
    foreach ($employeeLogs as $employeeId => $empLogs) {
        // Sort by timestamp
        usort($empLogs, function($a, $b) {
            return strtotime($a['timestamp']) - strtotime($b['timestamp']);
        });
        
        // Group by day
        $dailyLogs = [];
        foreach ($empLogs as $log) {
            $date = date('Y-m-d', strtotime($log['timestamp']));
            if (!isset($dailyLogs[$date])) {
                $dailyLogs[$date] = [];
            }
            $dailyLogs[$date][] = $log;
        }
        
        // Process each day
        foreach ($dailyLogs as $date => $dayLogs) {
            $count = count($dayLogs);
            
            // Simple rules based on number of punches
            if ($count === 1) {
                // Single punch - determine type by time
                $time = date('H', strtotime($dayLogs[0]['timestamp']));
                $dayLogs[0]['actual_status'] = ($time < 12) ? 'Clock In' : 'Clock Out';
                $dayLogs[0]['missing_punch'] = true;
            } 
            else if ($count === 2) {
                // Two punches - first is in, second is out
                $dayLogs[0]['actual_status'] = 'Clock In';
                $dayLogs[1]['actual_status'] = 'Clock Out';
            }
            else if ($count === 4) {
                // Four punches - typical workday with break
                $dayLogs[0]['actual_status'] = 'Clock In';
                $dayLogs[1]['actual_status'] = 'Break In';
                $dayLogs[2]['actual_status'] = 'Break Out';
                $dayLogs[3]['actual_status'] = 'Clock Out';
            }
            else {
                // For odd or larger numbers, use alternating pattern
                foreach ($dayLogs as $i => $log) {
                    if ($i === 0) {
                        $dayLogs[$i]['actual_status'] = 'Clock In';
                    } else if ($i === $count - 1) {
                        $dayLogs[$i]['actual_status'] = 'Clock Out';
                    } else if ($i % 2 === 1) {
                        $dayLogs[$i]['actual_status'] = 'Break In';
                    } else {
                        $dayLogs[$i]['actual_status'] = 'Break Out';
                    }
                }
            }
            
            // Add processed logs
            foreach ($dayLogs as $log) {
                $processedLogs[] = $log;
            }
        }
    }
    
    return $processedLogs;
}

  /**
 * Save attendance logs to a JSON file with time-based status determination
 * 
 * @param array $logs The attendance logs from the device
 * @param BiometricDevice $device The device information
 * @return bool
 */

 private function getAttendanceLogsWithMemoryManagement($zk, $validated)
{
    // Attempt to get logs with multiple strategies
    $maxAttempts = 3;
    $attempts = 0;
    
    while ($attempts < $maxAttempts) {
        try {
            // First attempt: standard method
            $logs = $zk->getAttendance();
            
            // Quick validation
            if (!is_array($logs)) {
                throw new \Exception('Retrieved logs is not an array');
            }
            
            // Optional: Filter out invalid logs
            $logs = array_filter($logs, function($log) {
                return isset($log['id']) && isset($log['timestamp']);
            });
            
            // Date range filtering
            if (!empty($validated['start_date']) || !empty($validated['end_date'])) {
                $logs = array_filter($logs, function($log) use ($validated) {
                    $logTimestamp = strtotime($log['timestamp']);
                    
                    // If only start_date is provided
                    if (!empty($validated['start_date']) && empty($validated['end_date'])) {
                        $startTimestamp = strtotime($validated['start_date']);
                        return $logTimestamp >= $startTimestamp;
                    }
                    
                    // If only end_date is provided
                    if (empty($validated['start_date']) && !empty($validated['end_date'])) {
                        $endTimestamp = strtotime($validated['end_date'] . ' 23:59:59');
                        return $logTimestamp <= $endTimestamp;
                    }
                    
                    // If both start_date and end_date are provided
                    if (!empty($validated['start_date']) && !empty($validated['end_date'])) {
                        $startTimestamp = strtotime($validated['start_date']);
                        $endTimestamp = strtotime($validated['end_date'] . ' 23:59:59');
                        
                        return $logTimestamp >= $startTimestamp && $logTimestamp <= $endTimestamp;
                    }
                    
                    // If no dates are provided, return all logs
                    return true;
                });
            }
            
            // Log number of logs retrieved
            Log::info('Logs retrieved successfully', [
                'total_logs' => count($logs),
                'start_date' => $validated['start_date'] ?? 'Not specified',
                'end_date' => $validated['end_date'] ?? 'Not specified'
            ]);
            
            return $logs;
        } catch (\Exception $e) {
            $attempts++;
            
            Log::warning("Attempt $attempts to retrieve logs failed", [
                'error' => $e->getMessage()
            ]);
            
            // Wait between attempts
            if ($attempts < $maxAttempts) {
                sleep(2); // Wait 2 seconds between attempts
            }
        }
    }
    
    // If all attempts fail
    throw new \Exception('Failed to retrieve logs after ' . $maxAttempts . ' attempts');
}
private function saveLogsToJsonFile($logs, $device)
{
    try {
        // Create timestamp for the filename
        $timestamp = now()->format('Y-m-d_H-i-s');
        
        // Create directory if it doesn't exist
        $directory = storage_path('logs/biometric');
        if (!File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }
        
        // Process logs with pattern recognition
        $processedLogs = $this->processLogsWithPatternRecognition($logs);
        
        // Prepare log data with metadata
        // Check for missing punches in the logs for reporting
    $missingPunchCount = 0;
    foreach ($processedLogs as $log) {
        if (isset($log['missing_punch']) && $log['missing_punch']) {
            $missingPunchCount++;
        }
    }
        
    $logData = [
        'device_info' => [
            'id' => $device->id,
            'name' => $device->name,
            'ip_address' => $device->ip_address,
            'port' => $device->port
        ],
        'timestamp' => now()->toDateTimeString(),
        'note' => 'Actual status is determined by pattern recognition that intelligently handles various clock-in scenarios and detects missing punches.',
        'missing_punch_count' => $missingPunchCount,
        'attendance_logs' => $processedLogs
    ];
        
        // Write to file
        $filename = $directory . '/device_' . $device->id . '_' . $device->name . '_' . $timestamp . '.json';
        File::put($filename, json_encode($logData, JSON_PRETTY_PRINT));
        
        Log::info('Successfully saved logs to JSON file', [
            'filename' => $filename,
            'log_count' => count($processedLogs)
        ]);
        
        return true;
    } catch (\Exception $e) {
        Log::error('Failed to save logs to JSON file', [
            'error_message' => $e->getMessage(),
            'error_trace' => $e->getTraceAsString()
        ]);
        
        return false;
    }
}

    
private function saveBiometricLogs($logs, $deviceId)
{
    $savedLogs = [];
    $processedLogs = 0;
    $skippedLogs = 0;
    $skippedEmployees = [];
    $detailedSkippedLogs = [];

    if (!is_array($logs)) {
        Log::warning('Logs is not an array', ['logs' => $logs]);
        return [
            'saved_logs' => [],
            'processed_count' => 0,
            'skipped_count' => 1
        ];
    }

    $deviceIp = BiometricDevice::findOrFail($deviceId)->ip_address;

    Log::info('Total Logs to Process', [
        'log_count' => count($logs)
    ]);

    // Process logs with improved pattern recognition logic
    $processedLogsWithStatus = $this->processLogsWithPatternRecognition($logs);

    // Group by employee and date using your existing structure but enhanced
    $groupedLogs = [];
    foreach ($processedLogsWithStatus as $log) {
        try {
            $extractedLog = $this->extractLogDetails($log);
            
            // Ensure actual_status is included from processed log
            $actualStatus = $log['actual_status'] ?? null;

            if (!$this->isValidLog($extractedLog)) {
                Log::warning('Invalid log skipped', ['log' => $log]);
                $skippedLogs++;
                continue;
            }

            $biometricId = $extractedLog['user_id'];
            $employee = Employee::where('idno', $biometricId)->first();

            if (!$employee) {
                if (!in_array($biometricId, $skippedEmployees)) {
                    $skippedEmployees[] = $biometricId;
                    $detailedSkippedLogs[] = [
                        'biometric_id' => $biometricId,
                        'timestamp' => $extractedLog['timestamp'],
                        'full_log' => $log
                    ];
                    Log::warning('Employee not found with given ID number', [
                        'idno' => $biometricId,
                        'timestamp' => $extractedLog['timestamp']
                    ]);
                }
                $skippedLogs++;
                continue;
            }

            $timestamp = Carbon::parse($extractedLog['timestamp']);
            $date = $timestamp->format('Y-m-d');

            if (!isset($groupedLogs[$employee->id][$date])) {
                $groupedLogs[$employee->id][$date] = [
                    'timestamps' => [],
                    'states' => [],
                    'actual_statuses' => [] // Store the calculated status
                ];
            }

            $groupedLogs[$employee->id][$date]['timestamps'][] = $timestamp;
            $groupedLogs[$employee->id][$date]['states'][] = $extractedLog['state'] ?? null;
            $groupedLogs[$employee->id][$date]['actual_statuses'][] = $actualStatus;
        } catch (\Exception $e) {
            Log::error('Error processing individual log', [
                'log' => $log,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $skippedLogs++;
        }
    }

    foreach ($groupedLogs as $employeeId => $dates) {
        foreach ($dates as $date => $logData) {
            try {
                $timestamps = $logData['timestamps'];
                $states = $logData['states'];
                $actualStatuses = $logData['actual_statuses']; // Use the actual status

                // Sort all arrays based on timestamp
                array_multisort($timestamps, SORT_ASC, $states, $actualStatuses);

                // Initialize variables for time tracking
                $totalWorkedMinutes = 0;
                $punchIn = null;
                $timeIn = null;
                $timeOut = null;
                $breakIn = null;
                $breakOut = null;

                // Process timestamps based on actual status
                for ($i = 0; $i < count($timestamps); $i++) {
                    $currentTime = $timestamps[$i];
                    $currentActualStatus = $actualStatuses[$i];

                    // Process based on actual status (not device state)
                    switch ($currentActualStatus) {
                        case 'Clock In':
                            if ($timeIn === null) {
                                $timeIn = $currentTime;
                            }
                            $punchIn = $currentTime;
                            break;
                            
                        case 'Clock Out':
                            $timeOut = $currentTime;
                            if ($punchIn !== null) {
                                $workedMinutes = $punchIn->diffInMinutes($currentTime);
                                $totalWorkedMinutes += $workedMinutes;
                                
                                Log::info("Counted work session for employee $employeeId", [
                                    'from' => $punchIn->toDateTimeString(),
                                    'to' => $currentTime->toDateTimeString(),
                                    'minutes' => $workedMinutes,
                                ]);
                                
                                $punchIn = null;
                            }
                            break;
                            
                        case 'Break In':
                            $breakIn = $currentTime;
                            if ($punchIn !== null) {
                                // If they were clocked in, count work up to break
                                $workedMinutes = $punchIn->diffInMinutes($currentTime);
                                $totalWorkedMinutes += $workedMinutes;
                                $punchIn = null;
                            }
                            break;
                            
                        case 'Break Out':
                            $breakOut = $currentTime;
                            // Resume work timing after break
                            $punchIn = $currentTime;
                            break;
                    }
                }

                // If timeIn is still null, use first timestamp regardless
                if ($timeIn === null && count($timestamps) > 0) {
                    $timeIn = $timestamps[0];
                }
                
                // Handle missing checkout differently - don't set timeOut if it's likely
                // that the employee is still at work (hasn't checked out yet)
                if ($timeOut === null && count($timestamps) > 0) {
                    // Check if the last punch was Clock In or Break Out (indicating they're still at work)
                    $lastStatus = end($actualStatuses);
                    if ($lastStatus === 'Clock In' || $lastStatus === 'Break Out') {
                        // Employee is still at work - leave timeOut as null to indicate ongoing shift
                        $timeOut = null;
                        $notesText = 'ATTENTION - Employee is still clocked in. No checkout recorded.';
                    } else {
                        // If last status was not Clock In or Break Out, use last timestamp as timeOut
                        $timeOut = end($timestamps);
                    }               
                }

                // Calculate hours only if we have both timeIn and timeOut
                $hoursWorked = null;
                $isNightShift = false;
                
                if ($timeIn && $timeOut) {
                    $hoursWorked = round($totalWorkedMinutes / 60, 2);
                    $isNightShift = $timeIn->format('Y-m-d') !== $timeOut->format('Y-m-d');
                }

                // Check for missing punches in the logs
                $missingPunchNotes = [];
                foreach ($actualStatuses as $idx => $status) {
                    $missingPunch = $processedLogsWithStatus[$idx]['missing_punch'] ?? false;
                    $missingPunchNote = $processedLogsWithStatus[$idx]['missing_punch_note'] ?? '';
                    if ($missingPunch && !empty($missingPunchNote)) {
                        $missingPunchNotes[] = $missingPunchNote;
                    }
                }
                
                // Create notes from missing punch information
                $notesText = 'Processed with pattern recognition';
                if (!empty($missingPunchNotes)) {
                    $notesText .= '. ATTENTION - ' . implode(' ', $missingPunchNotes);
                }
                
                $logEntry = [
                    'employee_id' => $employeeId,
                    'attendance_date' => $date,
                    'time_in' => $timeIn,
                    'time_out' => $timeOut,
                    'break_in' => $breakIn, // Add break tracking
                    'break_out' => $breakOut, // Add break tracking
                    'hours_worked' => $hoursWorked,
                    'is_nightshift' => $isNightShift,
                    'source' => 'biometric',
                    'notes' => $notesText,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $existingRecord = DB::table('processed_attendances')
                    ->where('employee_id', $employeeId)
                    ->where('attendance_date', $date)
                    ->first();

                if ($existingRecord) {
                    DB::table('processed_attendances')
                        ->where('id', $existingRecord->id)
                        ->update($logEntry);
                } else {
                    DB::table('processed_attendances')->insert($logEntry);
                }

                $processedLogs++;
                $savedLogs[] = $logEntry;
            } catch (\Exception $e) {
                Log::error('Error processing grouped logs for employee', [
                    'employee_id' => $employeeId,
                    'date' => $date,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                $skippedLogs++;
            }
        }
    }

    Log::info('Biometric Logs Processing Summary', [
        'total_logs' => count($logs),
        'processed_logs' => $processedLogs,
        'skipped_logs' => $skippedLogs,
        'skipped_employees' => $skippedEmployees,
        'detailed_skipped_logs' => $detailedSkippedLogs
    ]);

    return [
        'saved_logs' => $savedLogs,
        'processed_count' => $processedLogs,
        'skipped_count' => $skippedLogs,
        'skipped_employees' => $skippedEmployees,
        'detailed_skipped_logs' => $detailedSkippedLogs
    ];
}

/**
 * Process logs with pattern recognition logic - handles multiple patterns intelligently
 * 
 * @param array $logs The attendance logs from the device
 * @return array Processed logs with accurate status
 */
private function processLogsWithPatternRecognition($logs)
{
    // Group logs by employee ID
    $employeeLogs = [];
    foreach ($logs as $log) {
        $employeeId = $log['id'];
        if (!isset($employeeLogs[$employeeId])) {
            $employeeLogs[$employeeId] = [];
        }
        $employeeLogs[$employeeId][] = $log;
    }
    
    // Process logs with pattern recognition
    $processedLogs = [];
    foreach ($employeeLogs as $employeeId => $empLogs) {
        // Sort logs by timestamp
        usort($empLogs, function($a, $b) {
            return strtotime($a['timestamp']) - strtotime($b['timestamp']);
        });
        
        $currentDate = '';
        $dailyPunches = [];
        
        // First group punches by day
        foreach ($empLogs as $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));
            
            if ($logDate !== $currentDate) {
                // Process previous day's punches if any
                if (!empty($dailyPunches)) {
                    $processedDailyLogs = $this->processDailyPattern($dailyPunches);
                    $processedLogs = array_merge($processedLogs, $processedDailyLogs);
                }
                
                $currentDate = $logDate;
                $dailyPunches = [];
            }
            
            $dailyPunches[] = $log;
        }
        
        // Process the last day's punches
        if (!empty($dailyPunches)) {
            $processedDailyLogs = $this->processDailyPattern($dailyPunches);
            $processedLogs = array_merge($processedLogs, $processedDailyLogs);
        }
    }
    
    return $processedLogs;
}

/**
 * Process a single day's punch pattern
 * 
 * @param array $logs The day's attendance logs for one employee
 * @return array Processed logs with accurate status
 */
private function processDailyPattern($logs)
    {
        $count = count($logs);
        $processedLogs = [];
        
        // Handle case of odd number of punches which might indicate forgotten clock in/out
        $possibleMissingPunch = ($count % 2 != 0);
        $workdayStartTime = 8 * 60; // 8:00 AM in minutes from midnight
        $workdayEndTime = 17 * 60;  // 5:00 PM in minutes from midnight
        $standardShiftDuration = 8 * 60; // 8 hours in minutes
        
        // Keep original values for all logs
        foreach ($logs as $i => $log) {
            $log['original_state'] = $log['state'] ?? null;
            $log['device_status'] = isset($log['state']) ? 
                ($log['state'] == 1 ? 'Device reported: Clock Out' : 'Device reported: Clock In') : 
                'Unknown';
            
            // Get time of day in minutes for this punch
            $timestamp = strtotime($log['timestamp']);
            $timeOfDay = (date('H', $timestamp) * 60) + date('i', $timestamp);
            
            // Determine pattern based on number of punches and position
            if ($count == 1) {
                // Only one punch for the day - determine if it's likely clock in or clock out
                // based on time of day
                if ($timeOfDay < 12 * 60) { // Before noon, assume clock in
                    $log['actual_status'] = 'Clock In';
                    $log['missing_punch'] = true;
                    $log['missing_punch_note'] = 'Single punch detected. Assumed as Clock In based on time.';
                } else { // After noon, assume clock out
                    $log['actual_status'] = 'Clock Out';
                    $log['missing_punch'] = true;
                    $log['missing_punch_note'] = 'Single punch detected. Assumed as Clock Out based on time.';
                }
            }
            else if ($count == 2) {
                // Simple in/out pattern
                $log['actual_status'] = ($i == 0) ? 'Clock In' : 'Clock Out';
            } 
            else if ($count == 3) {
                // Odd number of punches - someone likely forgot to clock in or out
                // Determine the most likely pattern based on times
                
                // Get all times as minutes from midnight for easier comparison
                $times = array_map(function($punchLog) {
                    $ts = strtotime($punchLog['timestamp']);
                    return (date('H', $ts) * 60) + date('i', $ts);
                }, $logs);
                
                // Calculate time differences between punches
                $diff1 = $times[1] - $times[0];
                $diff2 = $times[2] - $times[1];
                
                // Case 1: Missing first Clock In
                if ($times[0] > $workdayStartTime + 120) { // First punch is well after start time
                    if ($i == 0) {
                        $log['actual_status'] = 'Break In';
                        $log['missing_punch'] = true;
                        $log['missing_punch_note'] = 'Possible missing Clock In at start of day.';
                    } else if ($i == 1) {
                        $log['actual_status'] = 'Break Out';
                    } else {
                        $log['actual_status'] = 'Clock Out';
                    }
                }
                // Case 2: Missing last Clock Out
                else if ($times[2] < $workdayEndTime - 120) { // Last punch is well before end time
                    if ($i == 0) {
                        $log['actual_status'] = 'Clock In';
                    } else if ($i == 1) {
                        $log['actual_status'] = 'Break In';
                    } else {
                        $log['actual_status'] = 'Break Out';
                        $log['missing_punch'] = true;
                        $log['missing_punch_note'] = 'Possible missing Clock Out at end of day.';
                    }
                }
                // Case 3: Missing middle punch (Break In or Break Out)
                else {
                    // Compare time differences to guess the missing punch
                    if ($diff1 > $diff2 && $diff1 > 180) { // Big gap between 1st and 2nd
                        if ($i == 0) {
                            $log['actual_status'] = 'Clock In';
                        } else if ($i == 1) {
                            $log['actual_status'] = 'Break Out';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break In before this punch.';
                        } else {
                            $log['actual_status'] = 'Clock Out';
                        }
                    } else if ($diff2 > $diff1 && $diff2 > 180) { // Big gap between 2nd and 3rd
                        if ($i == 0) {
                            $log['actual_status'] = 'Clock In';
                        } else if ($i == 1) {
                            $log['actual_status'] = 'Break In';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break Out after this punch.';
                        } else {
                            $log['actual_status'] = 'Clock Out';
                        }
                    } else {
                        // Default pattern if we can't determine better
                        if ($i == 0) {
                            $log['actual_status'] = 'Clock In';
                        } else if ($i == 1) {
                            $log['actual_status'] = 'Break In';
                        } else {
                            $log['actual_status'] = 'Clock Out';
                            $log['missing_punch_note'] = 'Odd number of punches, pattern unclear.';
                        }
                    }
                }
            }
            else if ($count == 4) {
                // Could be either:
                // Pattern 1: Clock In, Clock Out, Clock In, Clock Out
                // Pattern 2: Clock In, Break In, Break Out, Clock Out
                
                // Check time gaps to differentiate
                if ($i > 0) {
                    $currentTime = strtotime($log['timestamp']);
                    $prevTime = strtotime($logs[$i-1]['timestamp']);
                    $gapMinutes = ($currentTime - $prevTime) / 60;
                    
                    // For 4-punch pattern, use time gaps to determine if it's a break or a re-entry
                    // If the gap between punch 2 and 3 is large (e.g. > 30 min), 
                    // likely pattern #1: Clock In, Clock Out, Clock In, Clock Out
                    if ($i == 2 && $gapMinutes > 30) {
                        $patternType = "DOUBLE_SHIFT";
                    } else {
                        $patternType = "WITH_BREAK";
                    }
                }
                
                if ($i == 0) {
                    $log['actual_status'] = 'Clock In';
                } 
                else if ($i == 3) {
                    $log['actual_status'] = 'Clock Out';
                }
                else if ($i == 1) {
                    $log['actual_status'] = isset($patternType) && $patternType == "DOUBLE_SHIFT" ? 
                        'Clock Out' : 'Break In';
                }
                else if ($i == 2) {
                    $log['actual_status'] = isset($patternType) && $patternType == "DOUBLE_SHIFT" ? 
                        'Clock In' : 'Break Out';
                }
            } 
            else if ($possibleMissingPunch) {
                // Odd number of punches > 4 - likely missing a punch somewhere
                // Use a combination of timeOfDay, position, and adjacent gaps to determine status
                
                // First and last are still easy to determine
                if ($i == 0) {
                    $log['actual_status'] = 'Clock In';
                } 
                else if ($i == $count - 1) {
                    $log['actual_status'] = 'Clock Out';
                }
                // For middle punches, look at surrounding time gaps to detect anomalies
                else {
                    $currentTime = strtotime($log['timestamp']);
                    
                    // Check previous gap
                    $prevTime = strtotime($logs[$i-1]['timestamp']);
                    $prevGapMinutes = ($currentTime - $prevTime) / 60;
                    
                    // Check next gap if not the last punch
                    $nextGapMinutes = 0;
                    if ($i < $count - 1) {
                        $nextTime = strtotime($logs[$i+1]['timestamp']);
                        $nextGapMinutes = ($nextTime - $currentTime) / 60;
                    }
                    
                    // Look for unusually large gaps (might indicate missing punch)
                    $largeGapThreshold = 120; // 2 hours
                    $anomalousPrevGap = ($prevGapMinutes > $largeGapThreshold);
                    $anomalousNextGap = ($nextGapMinutes > $largeGapThreshold);
                    
                    // If large gap before this punch, might indicate missing punch before
                    if ($anomalousPrevGap && $i > 1) {
                        // The expected status alternates, so check what the previous punch was
                        $prevStatus = $processedLogs[count($processedLogs)-1]['actual_status'];
                        
                        if ($prevStatus == 'Clock In' || $prevStatus == 'Break Out') {
                            $log['actual_status'] = 'Clock Out';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break In before this punch.';
                        } else {
                            $log['actual_status'] = 'Clock In';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break Out before this punch.';
                        }
                    }
                    // If large gap after this punch, might indicate missing punch after
                    else if ($anomalousNextGap && $i < $count - 2) {
                        // Determine based on alternating pattern
                        if ($i % 2 == 1) {
                            $log['actual_status'] = 'Break In';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break Out after this punch.';
                        } else {
                            $log['actual_status'] = 'Break Out';
                            $log['missing_punch'] = true;
                            $log['missing_punch_note'] = 'Possible missing Break In after this punch.';
                        }
                    }
                    // Otherwise, use the alternating pattern as a fallback
                    else {
                        // Determine if this is likely part of a break
                        // Short time gaps usually indicate breaks
                        $isLikelyBreak = ($prevGapMinutes < 30 || $nextGapMinutes < 30);
                        
                        // Alternate between in/out status
                        if ($i % 2 == 1) {
                            // Odd positions after first (1, 3, 5...) are outs (either break or clock)
                            $log['actual_status'] = $isLikelyBreak ? 'Break In' : 'Clock Out';
                        } else {
                            // Even positions before last (2, 4, 6...) are ins (either break or clock)
                            $log['actual_status'] = $isLikelyBreak ? 'Break Out' : 'Clock In';
                        }
                        
                        if ($i == $count - 2 && $count % 2 == 0) {
                            $log['missing_punch_note'] = 'Odd number of punches, pattern unclear. Check manually.';
                        }
                    }
                }
            }
            else {
                // Even number of punches > 4, likely correct sequence
                // First punch is always Clock In
                if ($i == 0) {
                    $log['actual_status'] = 'Clock In';
                } 
                // Last punch is always Clock Out
                else if ($i == $count - 1) {
                    $log['actual_status'] = 'Clock Out';
                }
                // For punches in between, try to detect patterns
                else {
                    $currentTime = strtotime($log['timestamp']);
                    
                    // Check previous gap
                    $prevTime = strtotime($logs[$i-1]['timestamp']);
                    $prevGapMinutes = ($currentTime - $prevTime) / 60;
                    
                    // Check next gap if not the last punch
                    $nextGapMinutes = 0;
                    if ($i < $count - 1) {
                        $nextTime = strtotime($logs[$i+1]['timestamp']);
                        $nextGapMinutes = ($nextTime - $currentTime) / 60;
                    }
                    
                    // Determine if this is likely part of a break
                    // Short time gaps usually indicate breaks
                    $isLikelyBreak = ($prevGapMinutes < 30 || $nextGapMinutes < 30);
                    
                    // Alternate between in/out status
                    if ($i % 2 == 1) {
                        // Odd positions after first (1, 3, 5...) are outs (either break or clock)
                        $log['actual_status'] = $isLikelyBreak ? 'Break In' : 'Clock Out';
                    } else {
                        // Even positions before last (2, 4, 6...) are ins (either break or clock)
                        $log['actual_status'] = $isLikelyBreak ? 'Break Out' : 'Clock In';
                    }
                }
            }
            
            $processedLogs[] = $log;
        }
        
        return $processedLogs;
    }
/**
 * Process logs with time-based logic
 * 
 * @param array $logs The attendance logs from the device
 * @return array Processed logs with accurate status
 */
private function processLogsWithTimeBasedLogic($logs)
{
    // Group logs by employee ID
    $employeeLogs = [];
    foreach ($logs as $log) {
        $employeeId = $log['id'];
        if (!isset($employeeLogs[$employeeId])) {
            $employeeLogs[$employeeId] = [];
        }
        $employeeLogs[$employeeId][] = $log;
    }
    
    // Process logs with time-based logic
    $processedLogs = [];
    foreach ($employeeLogs as $employeeId => $empLogs) {
        // Sort logs by timestamp
        usort($empLogs, function($a, $b) {
            return strtotime($a['timestamp']) - strtotime($b['timestamp']);
        });
        
        // First log of the day is always "Clock In"
        $currentDate = '';
        $dailyPunchCount = 0;
        
        foreach ($empLogs as $index => $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));
            
            // Keep original values
            $log['original_state'] = $log['state'] ?? null;
            $log['device_status'] = isset($log['state']) ? 
                ($log['state'] == 1 ? 'Device reported: Clock Out' : 'Device reported: Clock In') : 
                'Unknown';
            
            // If this is the first punch of the day
            if ($logDate !== $currentDate) {
                $log['actual_status'] = 'Clock In';
                $currentDate = $logDate;
                $dailyPunchCount = 1;
            } else {
                // Increment punch count for this day
                $dailyPunchCount++;
                
                // Determine status based on punch sequence
                switch ($dailyPunchCount % 4) {
                    case 1:
                        $log['actual_status'] = 'Clock In';
                        break;
                    case 2:
                        $log['actual_status'] = 'Clock Out';
                        break;  
                    case 3:
                        $log['actual_status'] = 'Break In';
                        break;
                    case 0: // When dailyPunchCount is divisible by 4
                        $log['actual_status'] = 'Break Out';
                        break;
                }
            }
            
            $processedLogs[] = $log;
        }
    }
    
    return $processedLogs;
}

/**
 * Extract log details from the device log
 * Make sure this method can extract all necessary fields
 */
private function extractLogDetails($log)
    {
        if (is_array($log)) {
            $userId = $log['id'] ?? $log['uid'] ?? $log['user_id'] ?? null;
            $timestamp = $log['timestamp'] ?? $log['time'] ?? null;
            $state = $log['state'] ?? $log['status'] ?? null;
            $actualStatus = $log['actual_status'] ?? null;
            
            return [
                'state' => $state,
                'user_id' => $userId,
                'timestamp' => $timestamp,
                'actual_status' => $actualStatus,
            ];
        }
        
        Log::warning('Unexpected log format', ['log' => $log]);
        return [
            'state' => null,
            'user_id' => null,
            'timestamp' => null,
            'actual_status' => null,
        ];
    }
    
    private function isValidLog($log)
    {
        return !is_null($log['user_id']) && !is_null($log['timestamp']);
    }
    

    /**
     * Import logs from a CSV file
     */
    public function importLogsFromCSV(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'device_id' => 'required|exists:biometric_devices,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $file = $request->file('file');
            $deviceId = $request->input('device_id');
            
            // Read CSV file
            $csvData = array_map('str_getcsv', file($file->getRealPath()));
            
            // Remove header if exists
            $headers = array_shift($csvData);
            
            // Prepare logs for saving
            $logs = [];
            foreach ($csvData as $row) {
                $logs[] = [
                    'uid' => $row[0] ?? null,
                    'user_id' => $row[1] ?? null,
                    'timestamp' => $row[2] ?? null,
                    'state' => $row[3] ?? null,
                ];
            }
            
            // Save logs
            $saveResult = $this->saveBiometricLogs($logs, $deviceId);
            
            return response()->json([
                'success' => true,
                'message' => 'Logs imported successfully',
                'result' => $saveResult
            ]);
        } catch (\Exception $e) {
            Log::error('CSV Import Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error importing logs: ' . $e->getMessage()
            ], 500);
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
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            $date = Carbon::parse($request->attendance_date)->format('Y-m-d');
            $timeIn = Carbon::parse($date . ' ' . $request->time_in);
            $timeOut = Carbon::parse($date . ' ' . $request->time_out);
            // Calculate hours worked
            $hoursWorked = $timeIn->floatDiffInHours($timeOut);
            
            // Create or update processed attendance record
            $attendance = ProcessedAttendance::updateOrCreate(
                [
                    'employee_id' => $request->employee_id,
                    'attendance_date' => $date,
                ],
                [
                    'time_in' => $timeIn,
                    'time_out' => $timeOut,
                    'hours_worked' => $hoursWorked,
                    'status' => 'present',
                    'source' => 'manual',
                    'remarks' => $request->remarks,
                ]
            );
            
            return redirect()->back()->with('success', 'Manual attendance entry saved successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to save manual attendance entry: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage());
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
 * Scan the network for ZKTeco devices.
 *
 * @param  \Illuminate\Http\Request  $request
 * @return \Illuminate\Http\Response
 */
public function scanNetwork(Request $request)
{
    // Validate input
    $validated = $request->validate([
        'subnet' => 'required|string',
        'port' => 'nullable|integer|min:1|max:65535',
    ]);

    $subnet = $validated['subnet'];
    $port = $validated['port'] ?? 4370; // Default ZKTeco port
    
    // We'll scan a range of IP addresses in the subnet
    $devices = [];
    $startIp = 1;
    $endIp = 254; // Standard range for class C networks
    
    // For faster scanning, we'll use multiple concurrent processes
    $maxConcurrent = 10;
    $timeout = 0.2; // 200ms timeout for each connection attempt
    
    for ($i = $startIp; $i <= $endIp; $i += $maxConcurrent) {
        $processes = [];
        
        // Start multiple ping processes
        for ($j = 0; $j < $maxConcurrent && ($i + $j) <= $endIp; $j++) {
            $ip = $subnet . '.' . ($i + $j);
            
            // We'll use ping to quickly determine if the IP is active
            if (PHP_OS_FAMILY === 'Windows') {
                $cmd = "ping -n 1 -w 200 $ip";
            } else {
                $cmd = "ping -c 1 -W 1 $ip";
            }
            
            $descriptorspec = [
                0 => ["pipe", "r"],  // stdin
                1 => ["pipe", "w"],  // stdout
                2 => ["pipe", "w"]   // stderr
            ];
            
            $processes[$ip] = [
                'process' => proc_open($cmd, $descriptorspec, $pipes),
                'pipes' => $pipes
            ];
        }
        
        // Check which IPs are active
        $activeIps = [];
        foreach ($processes as $ip => $data) {
            $output = stream_get_contents($data['pipes'][1]);
            fclose($data['pipes'][0]);
            fclose($data['pipes'][1]);
            fclose($data['pipes'][2]);
            proc_close($data['process']);
            
            // Check if ping was successful
            if (PHP_OS_FAMILY === 'Windows') {
                $active = strpos($output, 'Reply from') !== false;
            } else {
                $active = strpos($output, ' 0% packet loss') !== false;
            }
            
            if ($active) {
                $activeIps[] = $ip;
            }
        }
        
        // Now check which active IPs have the ZKTeco port open
        foreach ($activeIps as $ip) {
            $fp = @fsockopen($ip, $port, $errno, $errstr, $timeout);
            if ($fp) {
                // We found a device that has the ZKTeco port open
                fclose($fp);
                
                // Now try to connect to the device using ZKTeco protocol to get more information
                try {
                    // Create a ZKTeco service instance
                    $zkService = new ZKTecoService($ip, $port);
                    $connected = $zkService->connect();
                    
                    if ($connected) {
                        // Try to get device information
                        try {
                            $deviceInfo = $zkService->getDeviceInfo();
                            
                            // Add the device with detailed information
                            $devices[] = [
                                'ip_address' => $ip,
                                'port' => $port,
                                'name' => $deviceInfo['device_name'] !== 'N/A' 
                                    ? $deviceInfo['device_name'] 
                                    : "ZKTeco Device ($ip)",
                                'model' => $deviceInfo['platform'] !== 'N/A' 
                                    ? $deviceInfo['platform'] 
                                    : "ZKTeco",
                                'serial_number' => $deviceInfo['serial_number'] !== 'N/A' 
                                    ? $deviceInfo['serial_number'] 
                                    : "ZK" . substr(md5($ip), 0, 8),
                                'firmware' => $deviceInfo['firmware_version'] ?? 'Unknown',
                                'mac_address' => $deviceInfo['mac_address'] ?? 'Unknown'
                            ];
                            
                            Log::info("Found ZKTeco device with details", [
                                'ip' => $ip, 
                                'name' => $deviceInfo['device_name'],
                                'serial' => $deviceInfo['serial_number']
                            ]);
                        } catch (\Exception $e) {
                            // If we get an error retrieving device info, still add the device
                            // with default information
                            Log::warning("Error getting device info: " . $e->getMessage(), ['ip' => $ip]);
                            
                            $devices[] = [
                                'ip_address' => $ip,
                                'port' => $port,
                                'name' => "ZKTeco Device ($ip)",
                                'model' => "ZKTeco",
                                'serial_number' => "ZK" . substr(md5($ip), 0, 8)
                            ];
                        }
                        
                        // Disconnect from the device
                        $zkService->disconnect();
                    } else {
                        // If we couldn't connect with ZKTeco protocol but port is open,
                        // still list it as a potential device
                        $devices[] = [
                            'ip_address' => $ip,
                            'port' => $port,
                            'name' => "ZKTeco Device ($ip)",
                            'model' => "ZKTeco",
                            'serial_number' => "ZK" . substr(md5($ip), 0, 8)
                        ];
                    }
                } catch (\Exception $e) {
                    Log::warning("Error connecting to potential ZKTeco device: " . $e->getMessage(), ['ip' => $ip]);
                    
                    // Still add as potential device even if connection failed
                    $devices[] = [
                        'ip_address' => $ip,
                        'port' => $port,
                        'name' => "ZKTeco Device ($ip)",
                        'model' => "ZKTeco",
                        'serial_number' => "ZK" . substr(md5($ip), 0, 8)
                    ];
                }
            }
        }
    }
    
    Log::info("Network scan complete. Found " . count($devices) . " potential ZKTeco devices.");
    
    return response()->json([
        'success' => true,
        'devices' => $devices
    ]);
}
protected function getZKTecoBasicInfo($ip, $port)
{
    // Default info in case we can't connect or determine details
    $info = [
        'name' => 'ZKTeco Device',
        'model' => 'Unknown',
        'serial' => ''
    ];
    
    try {
        // This is a very simplified approach to query a ZKTeco device
        // In a production environment, you'd implement the full protocol
        $socket = @fsockopen($ip, $port, $errno, $errstr, 2);
        
        if ($socket) {
            // Try to get device info (simplified)
            // The actual protocol would be more complex
            
            // Example command (this is simplified and might not work with all devices)
            $command = chr(0x5A) . chr(0xA5) . chr(0x00) . chr(0x00) . chr(0x00) . chr(0x00) . chr(0x00) . chr(0x00);
            
            fwrite($socket, $command);
            
            // Wait for a response
            stream_set_timeout($socket, 2);
            $response = fread($socket, 1024);
            
            // In a real implementation, you would parse the response based on the ZKTeco protocol
            // For now, we'll just log it for debugging
            Log::debug("ZKTeco response from $ip: " . bin2hex($response));
            
            // For demonstration, if we get any response, assume it's a valid device
            if (strlen($response) > 0) {
                $info = [
                    'name' => 'ZKTeco Device ' . substr(md5($ip), 0, 4),
                    'model' => 'ZKTeco',
                    'serial' => 'SN' . substr(md5($ip . $response), 0, 8)
                ];
            }
            
            fclose($socket);
        }
    } catch (\Exception $e) {
        Log::warning("Error getting ZKTeco device info for $ip: " . $e->getMessage());
    }
    
    return $info;
}
/**
 * Get scan progress updates via Server-Sent Events.
 *
 * @param  string  $scanId
 * @return \Symfony\Component\HttpFoundation\StreamedResponse
 */
public function scanProgress($scanId)
{
    return response()->stream(function () use ($scanId) {
        // Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        
        $maxWaitTime = 60; // Maximum time to wait in seconds
        $startTime = time();
        
        while (true) {
            // Check if we've exceeded the maximum wait time
            if (time() - $startTime > $maxWaitTime) {
                echo "data: " . json_encode(['complete' => true, 'timeout' => true]) . "\n\n";
                flush();
                break;
            }
            
            // Get scan info from cache
            $scanInfo = Cache::get("scan:$scanId:info");
            
            if (!$scanInfo) {
                echo "data: " . json_encode(['error' => 'Scan not found']) . "\n\n";
                flush();
                break;
            }
            
            // Send progress update
            echo "data: " . json_encode([
                'progress' => $scanInfo['progress'],
                'devices' => $scanInfo['devices'],
                'complete' => $scanInfo['status'] === 'completed',
            ]) . "\n\n";
            flush();
            
            // If scan is complete, exit the loop
            if ($scanInfo['status'] === 'completed') {
                break;
            }
            
            // Sleep for a short time before checking again
            usleep(500000); // 500ms
        }
    }, 200, [
        'Cache-Control' => 'no-cache',
        'Content-Type' => 'text/event-stream',
        'Connection' => 'keep-alive',
    ]);
}

/**
 * Perform the actual network scan for ZKTeco devices.
 * 
 * @param string $scanId
 * @param string $subnet
 * @param int $port
 * @return void
 */
protected function performNetworkScan($scanId, $subnet, $port)
{
    // For demonstration purposes, we'll simulate finding devices
    // In a real implementation, you would scan the network for actual devices
    
    $foundDevices = [];
    $totalIps = 254; // Typical Class C network range
    
    for ($i = 1; $i <= $totalIps; $i++) {
        // Update progress (every 10 IPs)
        if ($i % 10 === 0 || $i === $totalIps) {
            $progress = min(100, round($i / $totalIps * 100));
            
            $scanInfo = Cache::get("scan:$scanId:info");
            $scanInfo['progress'] = $progress;
            Cache::put("scan:$scanId:info", $scanInfo, now()->addMinutes(5));
        }
        
        // Simulate finding a device with ~5% probability
        if (rand(1, 100) <= 5) {
            $ip = $subnet . '.' . $i;
            
            // Simulate a found device
            $device = [
                'ip_address' => $ip,
                'port' => $port,
                'name' => 'ZKTeco Device',
                'model' => 'ZK-' . rand(1000, 9999),
                'serial_number' => 'SN' . substr(md5($ip), 0, 8),
            ];
            
            $foundDevices[] = $device;
            
            // Update devices in cache
            $scanInfo = Cache::get("scan:$scanId:info");
            $scanInfo['devices'] = $foundDevices;
            Cache::put("scan:$scanId:info", $scanInfo, now()->addMinutes(5));
            
            // Send device found via SSE
            $scanInfo = Cache::get("scan:$scanId:info");
            $scanInfo['device'] = $device;
            Cache::put("scan:$scanId:info", $scanInfo, now()->addMinutes(5));
        }
        
        // Add a small delay to simulate network scanning
        usleep(50000); // 50ms
    }
    
    // Mark scan as completed
    $scanInfo = Cache::get("scan:$scanId:info");
    $scanInfo['status'] = 'completed';
    $scanInfo['progress'] = 100;
    Cache::put("scan:$scanId:info", $scanInfo, now()->addMinutes(5));
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