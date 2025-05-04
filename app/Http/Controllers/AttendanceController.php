<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\AttendanceLog;
use App\Models\ProcessedAttendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class AttendanceController extends Controller
{
    /**
     * Display the attendance import page
     */
    public function showImportPage()
    {
        return Inertia::render('Timesheet/ImportAttendance', [
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }

    private function mapExcelColumns($headers)
{
    // Normalize headers by removing whitespace and converting to lowercase
    $normalizedHeaders = array_map(function($header) {
        // Handle null or non-string headers
        if ($header === null) return '';
        return strtolower(trim(str_replace(' ', '_', (string)$header)));
    }, $headers);
    
    // For debugging - log the original headers and normalized headers
    Log::debug('Excel Headers', [
        'original' => $headers,
        'normalized' => $normalizedHeaders
    ]);
    
    // Define the column mapping structure
    $columnMapping = [
        'employee_no' => null,
        'date' => null,
        'day' => null,
        'time_in' => null,
        'time_out' => null,
        'break_in' => null, 
        'break_out' => null,
        'next_day_timeout' => null,
        'hours_work' => null
    ];
    
    // First, handle standard column names and special column names
    foreach ($normalizedHeaders as $index => $header) {
        // Match EmployeeDate (contains employee number and date)
        if (strpos($header, 'employee') !== false && strpos($header, 'date') !== false) {
            $columnMapping['employee_no'] = $index;
            $columnMapping['date'] = $index;  // We'll parse this specially
        }
        // Match direct employee ID field
        else if (in_array($header, ['employee_no', 'employee_no.', 'employeeno', 'idno', 'id', 'employee'])) {
            $columnMapping['employee_no'] = $index;
        }
        // Match date field if separate from employee
        else if (in_array($header, ['date'])) {
            $columnMapping['date'] = $index;
        }
        // Match day field
        else if (in_array($header, ['day'])) {
            $columnMapping['day'] = $index;
        }
        // Match Next day field
        else if (in_array($header, ['next_day', 'nextday', 'next']) || $header === 'next_day') {
            $columnMapping['next_day_timeout'] = $index;
        }
        // Match Hours Work field
        else if (in_array($header, ['hours_work', 'hours', 'work_hours', 'hours_worked'])) {
            $columnMapping['hours_work'] = $index;
        }
    }
    
    // Now handle the IN/OUT columns with proper positional mapping
    // Based on the template, we know:
    // 1st IN = time_in, 1st OUT = break_out
    // 2nd IN = break_in, 2nd OUT = time_out
    $inColumns = [];
    $outColumns = [];
    
    foreach ($normalizedHeaders as $index => $header) {
        if ($header === 'in') {
            $inColumns[] = $index;
        } else if ($header === 'out') {
            $outColumns[] = $index;
        }
    }
    
    // Map IN/OUT columns according to the correct order for this specific template
    if (count($inColumns) > 0) {
        // First IN column is time_in
        $columnMapping['time_in'] = $inColumns[0];
        
        // Second IN column is break_in (if it exists)
        if (count($inColumns) > 1) {
            $columnMapping['break_in'] = $inColumns[1];
        }
    }
    
    if (count($outColumns) > 0) {
        // First OUT column is time_out for break (break_out)
        $columnMapping['break_out'] = $outColumns[0];
        
        // Second OUT column is time_out for the day
        if (count($outColumns) > 1) {
            $columnMapping['time_out'] = $outColumns[1];
        }
    }
    
    // Check for missing required columns
    $missingColumns = [];
    $requiredColumns = ['employee_no', 'date'];
    
    foreach ($requiredColumns as $column) {
        if ($columnMapping[$column] === null) {
            $missingColumns[] = $column;
        }
    }
    
    // Log the final mapping for debugging
    Log::debug('Column Mapping', [
        'mapping' => $columnMapping,
        'missing' => $missingColumns
    ]);
    
    return [
        'mapping' => $columnMapping,
        'missingColumns' => $missingColumns
    ];
}

    /**
     * Process the imported attendance data
     */
    public function import(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('file');
            $fileType = IOFactory::identify($file);
            $reader = IOFactory::createReader($fileType);
            
            // Configure reader to preserve empty cells
            if (method_exists($reader, 'setReadEmptyCells')) {
                $reader->setReadEmptyCells(true);
            }
            
            $spreadsheet = $reader->load($file);
            $worksheet = $spreadsheet->getActiveSheet();
            
            // Convert data to array while preserving null cells
            $rows = $worksheet->toArray(null, true, true, true);
            
            // Convert to sequential array format
            $processedRows = [];
            foreach ($rows as $row) {
                $processedRows[] = array_values($row);
            }
            $rows = $processedRows;
            
            // Handle case where there's no data
            if (empty($rows)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No data found in the file',
                ], 422);
            }

            // Use the improved column mapping logic
            $mapping = $this->mapExcelColumns($rows[0]);
            
            if (!empty($mapping['missingColumns'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required columns: ' . implode(', ', $mapping['missingColumns']),
                ], 422);
            }
            
            $columnIndexes = $mapping['mapping'];

            // Process data rows
            $processedCount = 0;
            $failedRows = [];
            
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                
                // Skip rows with no employee number
                if (!isset($row[$columnIndexes['employee_no']]) || 
                    $row[$columnIndexes['employee_no']] === null || 
                    $row[$columnIndexes['employee_no']] === '') {
                    continue;
                }
                
                try {
                    // Extract employee ID from row
                    $employeeNo = $row[$columnIndexes['employee_no']];
                    
                    // Parse date (handle Excel date number format)
                    $dateValue = isset($row[$columnIndexes['date']]) ? $row[$columnIndexes['date']] : null;
                    
                    // Skip rows with no date
                    if ($dateValue === null || $dateValue === '') {
                        $failedRows[] = [
                            'row' => $i + 1,
                            'errors' => ["Date is required"]
                        ];
                        continue;
                    }
                    
                    // Parse date in Excel format or string format
                    if (is_numeric($dateValue)) {
                        $date = Date::excelToDateTimeObject($dateValue)->format('Y-m-d');
                    } else {
                        // Try to parse date string in various formats
                        try {
                            $date = Carbon::parse($dateValue)->format('Y-m-d');
                        } catch (\Exception $e) {
                            // Handle Excel's short date format (e.g., "16-Jan")
                            if (preg_match('/(\d+)[-\/]([a-zA-Z]+)/', $dateValue, $matches)) {
                                $day = $matches[1];
                                $month = date('m', strtotime("1 {$matches[2]}"));
                                $year = date('Y'); // Current year as fallback
                                $date = "$year-$month-$day";
                            } else {
                                throw new \Exception("Unable to parse date: $dateValue");
                            }
                        }
                    }
                    
                    // Check if employee exists
                    $employee = Employee::where('idno', $employeeNo)->first();
                    if (!$employee) {
                        $failedRows[] = [
                            'row' => $i + 1,
                            'errors' => ["Employee with ID $employeeNo not found"]
                        ];
                        continue;
                    }
                    
                    // Extract time values with improved null handling
                    $timeIn = null;
                    if ($columnIndexes['time_in'] !== null && 
                        isset($row[$columnIndexes['time_in']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['time_in']])) {
                        $timeIn = $row[$columnIndexes['time_in']];
                    }
                    
                    $timeOut = null;
                    if ($columnIndexes['time_out'] !== null && 
                        isset($row[$columnIndexes['time_out']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['time_out']])) {
                        $timeOut = $row[$columnIndexes['time_out']];
                    }
                    
                    $breakIn = null;
                    if ($columnIndexes['break_in'] !== null && 
                        isset($row[$columnIndexes['break_in']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['break_in']])) {
                        $breakIn = $row[$columnIndexes['break_in']];
                    }
                    
                    $breakOut = null;
                    if ($columnIndexes['break_out'] !== null && 
                        isset($row[$columnIndexes['break_out']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['break_out']])) {
                        $breakOut = $row[$columnIndexes['break_out']];
                    }
                    
                    $nextDayOut = null;
                    if ($columnIndexes['next_day_timeout'] !== null && 
                        isset($row[$columnIndexes['next_day_timeout']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['next_day_timeout']])) {
                        $nextDayOut = $row[$columnIndexes['next_day_timeout']];
                    }
                    
                    $hoursWorked = null;
                    if ($columnIndexes['hours_work'] !== null && 
                        isset($row[$columnIndexes['hours_work']]) && 
                        !$this->isEmptyTimeValue($row[$columnIndexes['hours_work']])) {
                        $hoursWorked = (float) $row[$columnIndexes['hours_work']];
                    }
                    
                    // Create or update processed attendance
                    $attendanceData = [
                        'employee_id' => $employee->id,
                        'attendance_date' => $date,
                        'source' => 'import',
                        'is_nightshift' => !empty($nextDayOut) && $nextDayOut !== null
                    ];
                    
                    // Process time fields - parse only if not null or empty
                    if ($timeIn !== null) {
                        $attendanceData['time_in'] = is_numeric($timeIn) 
                            ? Carbon::parse($date . ' ' . $this->formatTimeFromExcel($timeIn))
                            : Carbon::parse($date . ' ' . $timeIn);
                    } else {
                        $attendanceData['time_in'] = null;
                    }
                    
                    if ($timeOut !== null) {
                        $attendanceData['time_out'] = is_numeric($timeOut) 
                            ? Carbon::parse($date . ' ' . $this->formatTimeFromExcel($timeOut))
                            : Carbon::parse($date . ' ' . $timeOut);
                    } else {
                        $attendanceData['time_out'] = null;
                    }
                    
                    if ($breakIn !== null) {
                        $attendanceData['break_in'] = is_numeric($breakIn) 
                            ? Carbon::parse($date . ' ' . $this->formatTimeFromExcel($breakIn))
                            : Carbon::parse($date . ' ' . $breakIn);
                    } else {
                        $attendanceData['break_in'] = null;
                    }
                    
                    if ($breakOut !== null) {
                        $attendanceData['break_out'] = is_numeric($breakOut) 
                            ? Carbon::parse($date . ' ' . $this->formatTimeFromExcel($breakOut))
                            : Carbon::parse($date . ' ' . $breakOut);
                    } else {
                        $attendanceData['break_out'] = null;
                    }
                    
                    // Handle next_day_timeout - ensuring empty values are stored as NULL
                    if ($nextDayOut !== null) {
                        try {
                            // Double-check that this isn't a misinterpreted empty value
                            if (is_string($nextDayOut) && (trim($nextDayOut) === '' || strtolower(trim($nextDayOut)) === 'null')) {
                                $attendanceData['next_day_timeout'] = null;
                            } else {
                                // Important: Add 1 day to the date for next_day_timeout
                                $nextDay = Carbon::parse($date)->addDay()->format('Y-m-d');
                                $nextDayTimestamp = is_numeric($nextDayOut) 
                                    ? Carbon::parse($nextDay . ' ' . $this->formatTimeFromExcel($nextDayOut))
                                    : Carbon::parse($nextDay . ' ' . $nextDayOut);
                                $attendanceData['next_day_timeout'] = $nextDayTimestamp;
                                
                                // Log the successful next day timestamp
                                Log::debug('Successfully parsed next day timestamp', [
                                    'original' => $nextDayOut,
                                    'parsed' => $attendanceData['next_day_timeout']
                                ]);
                            }
                        } catch (\Exception $e) {
                            // If we can't parse it, set it to null
                            Log::warning('Failed to parse next day value', [
                                'value' => $nextDayOut,
                                'error' => $e->getMessage()
                            ]);
                            $attendanceData['next_day_timeout'] = null;
                        }
                    } else {
                        $attendanceData['next_day_timeout'] = null;
                    }
                    
                    // Hours worked - preserve exact value with improved null handling
                    if ($hoursWorked !== null) {
                        $attendanceData['hours_worked'] = (float) $hoursWorked;
                    } else {
                        // Calculate hours worked if we have time in and time out or next_day_timeout
                        if (
                            ($attendanceData['time_in'] && $attendanceData['time_out']) || 
                            ($attendanceData['time_in'] && $attendanceData['next_day_timeout'])
                        ) {
                            $start = $attendanceData['time_in'];
                            $end = $attendanceData['is_nightshift'] ? $attendanceData['next_day_timeout'] : $attendanceData['time_out'];
                            
                            if ($start && $end) {
                                $totalMinutes = $end->diffInMinutes($start);
                                
                                // Subtract break time if both break in and out are set
                                if ($attendanceData['break_in'] && $attendanceData['break_out']) {
                                    $breakStart = $attendanceData['break_in'];
                                    $breakEnd = $attendanceData['break_out'];
                                    $breakMinutes = $breakEnd->diffInMinutes($breakStart);
                                    $totalMinutes -= $breakMinutes;
                                }
                                
                                $attendanceData['hours_worked'] = $totalMinutes / 60;
                            } else {
                                $attendanceData['hours_worked'] = null;
                            }
                        } else {
                            $attendanceData['hours_worked'] = null;
                        }
                    }
                    
                    // For debugging - log the data
                    Log::debug('Attendance data to be saved', [
                        'row' => $i + 1,
                        'data' => $attendanceData,
                        'original_time_in' => $timeIn,
                        'original_time_out' => $timeOut,
                        'original_break_in' => $breakIn,
                        'original_break_out' => $breakOut,
                        'original_next_day' => $nextDayOut,
                        'original_hours' => $hoursWorked
                    ]);
                    
                    // Create or update the record
                    ProcessedAttendance::updateOrCreate(
                        [
                            'employee_id' => $employee->id,
                            'attendance_date' => $date,
                        ],
                        $attendanceData
                    );
                    
                    $processedCount++;
                    
                } catch (\Exception $e) {
                    Log::error('Error processing attendance row', [
                        'row' => $i + 1,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    
                    $failedRows[] = [
                        'row' => $i + 1,
                        'errors' => [$e->getMessage()]
                    ];
                }
            }
            
            return response()->json([
                'success' => true,
                'message' => "Successfully imported $processedCount attendance records",
                'total_processed' => count($rows) - 1,
                'successful' => $processedCount,
                'failures' => $failedRows,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Attendance import error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error processing file: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function formatTimeFromExcel($excelTime)
{
    // Check for zero values which represent empty cells
    if ($this->isEmptyTimeValue($excelTime)) {
        return null;
    }
    
    // For string values that might be formatted time
    if (is_string($excelTime)) {
        // Check if it's already in a valid time format
        if (preg_match('/^\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$/i', trim($excelTime))) {
            return trim($excelTime);
        }
        
        // Try to parse as a time string
        try {
            $time = \Carbon\Carbon::parse($excelTime)->format('H:i:s');
            return $time;
        } catch (\Exception $e) {
            // If parsing fails, continue to process as a numeric value
            if (is_numeric($excelTime)) {
                $excelTime = (float) $excelTime;
            } else {
                Log::warning('Unable to parse time value: ' . $excelTime);
                return null;
            }
        }
    }
    
    // Excel time is a decimal fraction of a 24-hour day
    if (is_numeric($excelTime)) {
        $seconds = round($excelTime * 86400); // 86400 = seconds in a day
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $secs);
    }
    
    // If we get here, we can't parse the time
    Log::warning('Unparsable time value: ' . $excelTime);
    return null;
}
    private function isEmptyTimeValue($value) 
    {
        // Basic empty checks
        if ($value === null || 
            $value === '' || 
            $value === 0 || 
            $value === 0.0 || 
            $value === '0' || 
            $value === '0.0' ||
            $value === '0:00' || 
            $value === '0:00:00' ||
            $value === '00:00' ||
            $value === '00:00:00') {
            return true;
        }
        
        // For string values, check if they're just whitespace or special strings
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '' || 
                strtolower($trimmed) === 'null' || 
                strtolower($trimmed) === 'n/a' ||
                strtolower($trimmed) === '-') {
                return true;
            }
        }
        
        // For numeric values near zero (floating point comparison)
        if (is_numeric($value) && abs((float)$value) < 0.0001) {
            return true;
        }
        
        return false;
    }

    /**
     * Additional method to check if a cell value should be treated as empty
     */
    private function isEmptyCell($value) 
    {
        // Use the time value check since it's more comprehensive
        return $this->isEmptyTimeValue($value);
    }

    /**
     * Download a template file for attendance import
     */
    public function downloadTemplate()
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Add headers to match the frontend UI expectations
        $headers = ['Employee No.', 'Date', 'Day', 'IN', 'OUT', 'IN', 'OUT', 'Next day', 'Hours Work'];
        $sheet->fromArray($headers, null, 'A1');
        
        // Add sample data
        $sampleData = [
            [6839, '16-Jan', 'Thu', '4:59 AM', '9:35 AM', '10:34 AM', '5:00 PM', '', 12.02],
            [6839, '17-Jan', 'Fri', '6:00 AM', '9:37 AM', '10:33 AM', '2:59 PM', '', 8.98],
            [5979, '16-Jan', 'Thu', '6:44 AM', '12:46 PM', '1:32 PM', '5:33 PM', '', 10.82],
            [6049, '19-Jan', 'Sun', '8:57 AM', '2:14 PM', '3:13 PM', '6:02 PM', '', 9.08],
            [4537, '20-Jan', 'Mon', '6:41 AM', '9:19 AM', '10:18 AM', '4:03 PM', '', 9.37],
        ];
        $sheet->fromArray($sampleData, null, 'A2');
        
        // Style the header row
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => '000000'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E0E0E0'],
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                ],
            ],
        ];
        $sheet->getStyle('A1:I1')->applyFromArray($headerStyle);
        
        // Auto-size columns for better readability
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        // Set date format for date column
        $sheet->getStyle('B2:B6')->getNumberFormat()->setFormatCode('dd-mmm');
        
        // Set time format for time columns
        $sheet->getStyle('D2:G6')->getNumberFormat()->setFormatCode('h:mm AM/PM');
        $sheet->getStyle('H2:H6')->getNumberFormat()->setFormatCode('h:mm AM/PM');
        
        // Set number format for hours column
        $sheet->getStyle('I2:I6')->getNumberFormat()->setFormatCode('0.00');
        
        // Create a file in memory and stream for download
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="attendance_import_template.xlsx"');
        header('Cache-Control: max-age=0');
        $writer->save('php://output');
        exit;
    }
    
    /**
     * Display attendance logs page
     */
    public function viewAttendanceLogs()
    {
        $attendances = ProcessedAttendance::with('employee')
            ->orderBy('attendance_date', 'desc')
            ->limit(100)
            ->get()
            ->map(function($attendance) {
                // Create a formatted entry with careful NULL handling
                $formattedEntry = [
                    'id' => $attendance->id,
                    'idno' => $attendance->employee ? $attendance->employee->idno : 'N/A',
                    'employee_name' => $attendance->employee ? 
                        $attendance->employee->Fname . ' ' . $attendance->employee->Lname : 'Unknown',
                    'department' => $attendance->employee ? $attendance->employee->Department : 'N/A',
                    'line' => $attendance->employee ? $attendance->employee->Line : 'N/A',
                    'attendance_date' => $attendance->attendance_date->format('Y-m-d'),
                    
                    // Explicitly set NULL fields to null (not empty string)
                    'time_in' => $attendance->time_in,
                    'time_out' => $attendance->time_out,
                    'break_in' => $attendance->break_in,
                    'break_out' => $attendance->break_out,
                    'next_day_timeout' => $attendance->next_day_timeout,
                    
                    // Only provide hours_worked if it has an actual value
                    'hours_worked' => $attendance->hours_worked !== null ? $attendance->hours_worked : null,
                    'is_nightshift' => $attendance->is_nightshift,
                    'source' => $attendance->source,
                ];
                
                // Debug log what's being passed to the frontend for troubleshooting
                Log::debug('Preparing attendance log for UI', [
                    'id' => $attendance->id,
                    'date' => $attendance->attendance_date->format('Y-m-d'),
                    'hours_worked' => $attendance->hours_worked,
                    'formatted_hours' => $formattedEntry['hours_worked'],
                    'next_day_timeout' => $attendance->next_day_timeout,
                    'is_null_hours' => $attendance->hours_worked === null,
                    'is_null_next_day' => $attendance->next_day_timeout === null
                ]);
                
                return $formattedEntry;
            });
        
        return Inertia::render('Timesheet/AttendanceLogs', [
            'attendances' => $attendances,
            'auth' => [
                'user' => auth()->user(),
            ],
        ]);
    }
    
    /**
     * Update an attendance record
     */
    public function updateAttendanceLog(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'time_in' => 'nullable|date',
            'time_out' => 'nullable|date',
            'break_in' => 'nullable|date',
            'break_out' => 'nullable|date',
            'next_day_timeout' => 'nullable|date',
            'is_nightshift' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $attendance = ProcessedAttendance::findOrFail($id);
            
            // Update attendance
            $attendance->update([
                'time_in' => $request->time_in,
                'time_out' => $request->time_out,
                'break_in' => $request->break_in,
                'break_out' => $request->break_out,
                'next_day_timeout' => $request->next_day_timeout,
                'is_nightshift' => $request->is_nightshift ?? false,
                'source' => 'manual_edit',
            ]);
            
            // Calculate hours worked if we have time_in and time_out
            if ($attendance->time_in && $attendance->time_out) {
                $start = Carbon::parse($attendance->time_in);
                $end = Carbon::parse($attendance->time_out);
                
                // If this is a nightshift with next_day_timeout, use that instead
                if ($attendance->is_nightshift && $attendance->next_day_timeout) {
                    $end = Carbon::parse($attendance->next_day_timeout);
                }
                
                // Calculate total minutes excluding break time
                $totalMinutes = $end->diffInMinutes($start);
                
                // Subtract break time if both break in and out are set
                if ($attendance->break_in && $attendance->break_out) {
                    $breakStart = Carbon::parse($attendance->break_in);
                    $breakEnd = Carbon::parse($attendance->break_out);
                    $breakMinutes = $breakEnd->diffInMinutes($breakStart);
                    $totalMinutes -= $breakMinutes;
                }
                    
                $attendance->hours_worked = $totalMinutes / 60;
                $attendance->save();
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully',
                'data' => $attendance
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error updating attendance', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Error updating attendance: ' . $e->getMessage(),
            ], 500);
        }
    }
}