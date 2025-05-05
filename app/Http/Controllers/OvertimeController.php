<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\Overtime;
use App\Models\Employee;
use App\Models\DepartmentManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Inertia\Inertia;

class OvertimeController extends Controller
{
    /**
     * Display a listing of overtime requests.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $userRoles = $this->getUserRoles($user);
        
        // Get all departments for filtering
        $departments = Employee::select('Department')
            ->distinct()
            ->whereNotNull('Department')
            ->orderBy('Department')
            ->pluck('Department')
            ->toArray();
            
        // Get available rate multipliers
        $rateMultipliers = [
            ['value' => 1.25, 'label' => 'Ordinary Weekday Overtime (125%)'],
            ['value' => 1.30, 'label' => 'Rest Day/Special Day (130%)'],
            ['value' => 1.50, 'label' => 'Scheduled Rest Day (150%)'],
            ['value' => 2.00, 'label' => 'Regular Holiday (200%)'],
            ['value' => 1.69, 'label' => 'Rest Day/Special Day Overtime (169%)'],
            ['value' => 1.95, 'label' => 'Scheduled Rest Day Overtime (195%)'],
            ['value' => 2.60, 'label' => 'Regular Holiday Overtime (260%)'],
            ['value' => 1.375, 'label' => 'Ordinary Weekday Overtime + Night Differential (137.5%)'],
            ['value' => 1.43, 'label' => 'Rest Day/Special Day + Night Differential (143%)'],
            ['value' => 1.65, 'label' => 'Scheduled Rest Day + Night Differential (165%)'],
            ['value' => 2.20, 'label' => 'Regular Holiday + Night Differential (220%)'],
            ['value' => 1.859, 'label' => 'Rest Day/Special Day Overtime + Night Differential (185.9%)'],
            ['value' => 2.145, 'label' => 'Scheduled Rest Day Overtime + Night Differential (214.5%)'],
            ['value' => 2.86, 'label' => 'Regular Holiday Overtime + Night Differential (286%)'],
        ];
        
        // Query overtimes based on user role
        $overtimesQuery = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
        
        // Filter based on user roles
        if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // Regular employees can only see their own overtime requests
            $employeeId = $user->employee ? $user->employee->id : null;
            if ($employeeId) {
                $overtimesQuery->where('employee_id', $employeeId);
            } else {
                // If no employee record linked, show overtimes created by this user
                $overtimesQuery->where('created_by', $user->id);
            }
        } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
            // Department managers can see:
            // 1. Overtimes they created
            // 2. Overtimes assigned to them for approval
            // 3. Overtimes for employees in their department
            $managedDepartments = DepartmentManager::where('manager_id', $user->id)
                ->pluck('department')
                ->toArray();
                
            $overtimesQuery->where(function($query) use ($user, $managedDepartments) {
                $query->where('created_by', $user->id)
                    ->orWhere('dept_manager_id', $user->id)
                    ->orWhereHas('employee', function($q) use ($managedDepartments) {
                        $q->whereIn('Department', $managedDepartments);
                    });
            });
        } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
            // HRD managers can see all overtime requests
            // No additional filtering needed
        }
        
        // Sort by latest first
        $overtimesQuery->orderBy('created_at', 'desc');
        
        // Get active employees for the form
        $employees = Employee::where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get();
            
        // Check if a specific overtime is selected for viewing
        $selectedId = $request->input('selected');
        $selectedOvertime = null;
        
        if ($selectedId) {
            $selectedOvertime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
                ->find($selectedId);
        }
        
        // Get the list of overtimes
        $overtimes = $overtimesQuery->get();
        
        return inertia('Overtime/OvertimePage', [
            'auth' => [
                'user' => $user,
            ],
            'overtimes' => $overtimes,
            'employees' => $employees,
            'departments' => $departments,
            'rateMultipliers' => $rateMultipliers,
            'selectedOvertime' => $selectedOvertime,
            'userRoles' => $userRoles
        ]);
    }

    private function getUserRoles($user)
{
    // Check department manager directly from database first
    $isDepartmentManager = DepartmentManager::where('manager_id', $user->id)->exists();
    
    // Check if user is an HRD manager
    $isHrdManager = $this->isHrdManager($user);
    
    $userRoles = [
        'isSuperAdmin' => $user->hasRole('superadmin'),
        'isHrdManager' => $isHrdManager,
        'isDepartmentManager' => $isDepartmentManager || $user->hasRole('department_manager'),
        'isEmployee' => $user->is_employee || ($user->employee && $user->employee->exists()),
        'userId' => $user->id,
        'employeeId' => $user->employee ? $user->employee->id : null,
        'managedDepartments' => [],
    ];
    
    // If user is a department manager, get their managed departments
    if ($userRoles['isDepartmentManager']) {
        $userRoles['managedDepartments'] = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
    }
    
    return $userRoles;
}

/**
 * Bulk update the status of multiple overtime requests.
 */
/**
 * Bulk update the status of multiple overtime requests.
 */
public function bulkUpdateStatus(Request $request)
{
    $user = Auth::user();
    
    // Validate request
    $validated = $request->validate([
        'overtime_ids' => 'required|array',
        'overtime_ids.*' => 'required|integer|exists:overtimes,id',
        'status' => 'required|in:manager_approved,approved,rejected,force_approved',
        'remarks' => 'nullable|string|max:500',
    ]);
    
    // Log the bulk update action
    \Log::info('Bulk update of overtime statuses initiated', [
        'user_id' => $user->id,
        'user_name' => $user->name,
        'count' => count($validated['overtime_ids']),
        'target_status' => $validated['status']
    ]);
    
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    DB::beginTransaction();
    
    try {
        foreach ($validated['overtime_ids'] as $overtimeId) {
            $overtime = Overtime::findOrFail($overtimeId);
            $currentStatus = $overtime->status;
            
            // Check permission for the specific overtime
            $canUpdate = false;
            
            // Department manager can approve pending overtime for their department
            if ($currentStatus === 'pending' && $validated['status'] === 'manager_approved') {
                $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);
                if ($isDeptManager || $this->isSuperAdmin($user)) {
                    $canUpdate = true;
                    
                    // Update department manager approval info
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = $validated['remarks'] ?? 'Bulk approved by department manager';
                }
            }
            // HRD manager can approve manager_approved overtime to final approved status
            elseif ($currentStatus === 'manager_approved' && $validated['status'] === 'approved') {
                if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                    $canUpdate = true;
                    
                    // Update HRD manager approval info
                    $overtime->hrd_approved_by = $user->id;
                    $overtime->hrd_approved_at = now();
                    $overtime->hrd_remarks = $validated['remarks'] ?? 'Bulk approved by HRD manager';
                }
            }
            // Force approve option for superadmins
            elseif ($validated['status'] === 'force_approved' && $this->isSuperAdmin($user)) {
                $canUpdate = true;
                
                // If not already approved at department level
                if (!$overtime->dept_approved_by) {
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
                }
                
                // Set HRD approval info
                $overtime->hrd_approved_by = $user->id;
                $overtime->hrd_approved_at = now();
                $overtime->hrd_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
                
                // Set status to regular approved
                $validated['status'] = 'approved';
            }
            // Either department manager or HRD manager can reject based on current status
            elseif ($validated['status'] === 'rejected') {
                if ($currentStatus === 'pending') {
                    // Department manager can reject pending overtime
                    $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);
                    if ($isDeptManager || $this->isSuperAdmin($user)) {
                        $canUpdate = true;
                        
                        // Update department manager rejection info
                        $overtime->dept_approved_by = $user->id;
                        $overtime->dept_approved_at = now();
                        $overtime->dept_remarks = $validated['remarks'] ?? 'Bulk rejected by department manager';
                    }
                } elseif ($currentStatus === 'manager_approved') {
                    // HRD manager can reject manager_approved overtime
                    if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                        $canUpdate = true;
                        
                        // Update HRD manager rejection info
                        $overtime->hrd_approved_by = $user->id;
                        $overtime->hrd_approved_at = now();
                        $overtime->hrd_remarks = $validated['remarks'] ?? 'Bulk rejected by HRD manager';
                    }
                }
            }
            
            // Skip if not authorized to update this overtime
            if (!$canUpdate) {
                $failCount++;
                $errors[] = "Not authorized to update overtime #{$overtimeId} from status '{$currentStatus}' to '{$validated['status']}'";
                continue;
            }
            
            // Update the status and save
            $overtime->status = $validated['status'];
            $overtime->save();
            $successCount++;
            
            \Log::info("Successfully updated overtime #{$overtimeId}", [
                'from_status' => $currentStatus,
                'to_status' => $validated['status'],
                'by_user' => $user->name
            ]);
        }
        
        DB::commit();
        
        // Return JSON response instead of a redirect with flash message
        return response()->json([
            'success' => true,
            'message' => "{$successCount} overtime requests updated successfully." . 
                        ($failCount > 0 ? " {$failCount} updates failed." : ""),
            'successCount' => $successCount,
            'failCount' => $failCount,
            'errors' => $errors
        ]);
        
    } catch (\Exception $e) {
        DB::rollBack();
        
        \Log::error('Error during bulk overtime update', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'message' => 'Error updating overtime statuses: ' . $e->getMessage(),
            'errors' => [$e->getMessage()]
        ], 500);
    }
}

    private function isHrdManager($user)
{
    // First try checking through the roles relationship
    if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
        if ($user->roles->contains('name', 'hrd_manager') || $user->roles->contains('slug', 'hrd')) {
            return true;
        }
    }
    
    // Then try the hasRole method
    if (method_exists($user, 'hasRole') && $user->hasRole('hrd_manager')) {
        return true;
    }
    
    // Fallback check by name or email - adjust this based on your setup
    if (stripos($user->name, 'hrd manager') !== false || 
        stripos($user->email, 'hrd@') !== false ||
        stripos($user->email, 'hrdmanager') !== false) {
        return true;
    }
    
    return false;
}

    private function isSuperAdmin($user)
    {
        // First try checking through the roles relationship
        if (method_exists($user, 'roles') && $user->roles && $user->roles->count() > 0) {
            if ($user->roles->contains('name', 'superadmin') || $user->roles->contains('slug', 'superadmin')) {
                return true;
            }
        }
        
        // Then try the hasRole method
        if (method_exists($user, 'hasRole') && $user->hasRole('superadmin')) {
            return true;
        }
        
        // Fallback check by user ID or name - adjust this based on your setup
        if ($user->id === 1 || stripos($user->name, 'admin') !== false) {
            return true;
        }
        
        return false;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'required|integer|exists:employees,id',
            'date' => 'required|date',
            'start_time' => 'required',
            'end_time' => 'required',
            'reason' => 'required|string|max:1000',
            'rate_multiplier' => 'required|numeric',
        ]);
        
        // Get the current authenticated user
        $user = Auth::user();
        
        // Check if user is a department manager
        $userRoles = $this->getUserRoles($user);
        $isDepartmentManager = $userRoles['isDepartmentManager'];
        
        $successCount = 0;
        $skippedCount = 0;
        $errorMessages = [];
        
        DB::beginTransaction();
        
        try {
            foreach ($validated['employee_ids'] as $employeeId) {
                $employee = Employee::find($employeeId);
                
                if (!$employee) {
                    $errorMessages[] = "Employee ID $employeeId not found";
                    continue;
                }
                
                // Check for duplicate overtime entries (same employee and date)
                $existingOvertime = Overtime::where('employee_id', $employeeId)
                                           ->where('date', $validated['date'])
                                           ->first();
                
                if ($existingOvertime) {
                    $skippedCount++;
                    $errorMessages[] = "Overtime for {$employee->Fname} {$employee->Lname} on {$validated['date']} already exists";
                    continue;
                }
                
                // Find department manager for this employee
                $deptManager = DepartmentManager::where('department', $employee->Department)
                    ->first();
                
                // Calculate total hours with consideration for midnight crossing
                $startTime = Carbon::parse($validated['date'] . ' ' . $validated['start_time']);
                $endTime = Carbon::parse($validated['date'] . ' ' . $validated['end_time']);
                
                // Handle case where end time is on the next day
                if ($endTime->lt($startTime)) {
                    $endTime->addDay();
                }
                
                $totalHours = $endTime->diffInMinutes($startTime) / 60;
                
                // Calculate rate multiplier based on day type and night differential
                $rateMultiplier = $this->calculateRateMultiplier(
                    $validated['date'],
                    $startTime,
                    $endTime,
                    $validated['rate_multiplier']
                );
                
                $overtime = new Overtime();
                $overtime->employee_id = $employeeId;
                $overtime->date = $validated['date'];
                $overtime->start_time = $startTime;
                $overtime->end_time = $endTime;
                $overtime->total_hours = $totalHours;
                $overtime->rate_multiplier = $rateMultiplier;
                $overtime->reason = $validated['reason'];
                
                // Set initial status based on conditions
                // 1. If user is a department manager filing their own overtime and it's at least 4 hours
                if ($isDepartmentManager && $totalHours >= 4.0 && 
                    // Check if the employee is the department manager themselves
                    ($employeeId == $user->employee_id || 
                     ($employee->Department && DepartmentManager::where('manager_id', $user->id)
                                                        ->where('department', $employee->Department)
                                                        ->exists()))) {
                    
                    // Auto-approve at department manager level
                    $overtime->status = 'manager_approved';
                    $overtime->dept_approved_by = $user->id;
                    $overtime->dept_approved_at = now();
                    $overtime->dept_remarks = 'Auto-approved (Department Manager)';
                } else {
                    // Normal pending status
                    $overtime->status = 'pending';
                }
                
                $overtime->created_by = $user->id;
                
                // Assign department manager if found
                if ($deptManager) {
                    $overtime->dept_manager_id = $deptManager->manager_id;
                }
                
                $overtime->save();
                $successCount++;
            }
            
            DB::commit();
            
            $message = "Successfully created {$successCount} overtime request(s)";
            if ($skippedCount > 0) {
                $message .= ". Skipped {$skippedCount} duplicate entries.";
            }
            
            if (!empty($errorMessages)) {
                return redirect()->back()->with([
                    'message' => $message,
                    'errors' => $errorMessages
                ]);
            }
            
            return redirect()->back()->with('message', $message);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error creating overtime requests: ' . $e->getMessage());
        }
    }

    private function calculateRateMultiplier($date, $startTime, $endTime, $baseMultiplier)
    {
        // Check if this is a holiday
        $isHoliday = $this->isHoliday($date);
        
        // Check if this is a rest day (typically weekend)
        $isRestDay = $this->isRestDay($date);
        
        // Check for night differential (10pm to 6am)
        $hasNightDifferential = $this->hasNightDifferential($startTime, $endTime);
        
        // If the user already selected a specific multiplier, respect their choice
        // This allows manual override by HR/managers when needed
        if ($baseMultiplier != 1.25) {
            return $baseMultiplier;
        }
        
        // Otherwise, calculate the appropriate multiplier based on conditions
        if ($isHoliday) {
            // Regular holiday rates
            if ($hasNightDifferential) {
                return 2.86; // Regular Holiday Overtime + Night Differential
            } else {
                return 2.60; // Regular Holiday Overtime
            }
        } else if ($isRestDay) {
            // Rest day rates
            if ($hasNightDifferential) {
                return 1.859; // Rest Day Overtime + Night Differential
            } else {
                return 1.69; // Rest Day Overtime
            }
        } else {
            // Regular weekday rates
            if ($hasNightDifferential) {
                return 1.375; // Ordinary Weekday Overtime + Night Differential
            } else {
                return 1.25; // Ordinary Weekday Overtime
            }
        }
    }
    
    /**
     * Check if the given date is a holiday
     * 
     * @param string $date The date to check
     * @return bool True if the date is a holiday
     */
    private function isHoliday($date)
    {
        // This method should be implemented based on your holiday calendar
        // For now, we'll use a simple example with hardcoded holidays
        $holidays = [
            '2025-01-01', // New Year's Day
            '2025-04-09', // Araw ng Kagitingan
            '2025-04-18', // Good Friday
            '2025-05-01', // Labor Day
            '2025-06-12', // Independence Day
            '2025-08-25', // National Heroes Day
            '2025-11-30', // Bonifacio Day
            '2025-12-25', // Christmas Day
            '2025-12-30', // Rizal Day
            // Add more holidays as needed
        ];
        
        return in_array($date, $holidays);
    }
    
    /**
     * Check if the given date is a rest day (weekend)
     * 
     * @param string $date The date to check
     * @return bool True if the date is a rest day
     */
    private function isRestDay($date)
    {
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        
        // Assuming Saturday (6) and Sunday (0) are rest days
        return $dayOfWeek === 0 || $dayOfWeek === 6;
    }
    
    /**
     * Check if the given time period overlaps with night differential hours (10pm to 6am)
     * 
     * @param Carbon $startTime The start time
     * @param Carbon $endTime The end time
     * @return bool True if there is overlap with night differential hours
     */
    private function hasNightDifferential($startTime, $endTime)
    {
        // Create night differential period for the start date
        $nightStart = $startTime->copy()->startOfDay()->addHours(22); // 10pm
        $nightEnd = $startTime->copy()->startOfDay()->addDay()->addHours(6); // 6am next day
        
        // Create night differential period for the day before (to catch overnight shifts)
        $prevNightStart = $nightStart->copy()->subDay();
        $prevNightEnd = $nightEnd->copy()->subDay();
        
        // Check if work period overlaps with either night period
        $overlapsCurrentNight = ($startTime->lt($nightEnd) && $endTime->gt($nightStart));
        $overlapsPrevNight = ($startTime->lt($prevNightEnd) && $endTime->gt($prevNightStart));
        
        return $overlapsCurrentNight || $overlapsPrevNight;
    }
    
    /**
     * Calculate the proportion of hours that fall within night differential period
     * 
     * @param Carbon $startTime The start time
     * @param Carbon $endTime The end time
     * @return float The number of hours within night differential
     */
    private function calculateNightDifferentialHours($startTime, $endTime)
    {
        // Night differential hours (10pm to 6am)
        $nightHours = 0;
        
        // Current day's night period
        $nightStartToday = $startTime->copy()->startOfDay()->addHours(22); // 10pm
        $nightEndToday = $startTime->copy()->startOfDay()->addDay()->addHours(6); // 6am next day
        
        // Previous day's night period
        $nightStartYesterday = $nightStartToday->copy()->subDay();
        $nightEndYesterday = $nightEndToday->copy()->subDay();
        
        // Check overlap with current day's night period
        if ($startTime->lt($nightEndToday) && $endTime->gt($nightStartToday)) {
            $overlapStart = max($startTime->timestamp, $nightStartToday->timestamp);
            $overlapEnd = min($endTime->timestamp, $nightEndToday->timestamp);
            $nightHours += ($overlapEnd - $overlapStart) / 3600; // Convert seconds to hours
        }
        
        // Check overlap with previous day's night period
        if ($startTime->lt($nightEndYesterday) && $endTime->gt($nightStartYesterday)) {
            $overlapStart = max($startTime->timestamp, $nightStartYesterday->timestamp);
            $overlapEnd = min($endTime->timestamp, $nightEndYesterday->timestamp);
            $nightHours += ($overlapEnd - $overlapStart) / 3600; // Convert seconds to hours
        }
        
        return $nightHours;
    }
    
    /**
     * Calculate the proportion of hours that fall within holiday period
     * For a shift that crosses midnight and the next day is not a holiday
     * 
     * @param string $date The holiday date
     * @param Carbon $startTime The start time
     * @param Carbon $endTime The end time
     * @return array ['holidayHours' => float, 'regularHours' => float]
     */
    private function calculateSplitHolidayHours($date, $startTime, $endTime)
    {
        $midnight = Carbon::parse($date . ' 23:59:59');
        $nextDay = Carbon::parse($date)->addDay()->startOfDay();
        
        // Check if shift crosses midnight
        if ($startTime->lt($midnight) && $endTime->gt($nextDay)) {
            // Calculate hours before midnight (holiday hours)
            $holidayHours = $midnight->diffInSeconds($startTime) / 3600;
            
            // Calculate hours after midnight (regular hours)
            $regularHours = $endTime->diffInSeconds($nextDay) / 3600;
            
            return [
                'holidayHours' => $holidayHours,
                'regularHours' => $regularHours
            ];
        }
        
        // If shift doesn't cross midnight or is entirely within the holiday
        return [
            'holidayHours' => $endTime->diffInSeconds($startTime) / 3600,
            'regularHours' => 0
        ];
    }

    /**
 * Generate an explanation of the overtime rate calculation
 * 
 * @param Request $request
 * @return \Illuminate\Http\JsonResponse
 */
public function explainRateCalculation(Request $request)
{
    $validated = $request->validate([
        'date' => 'required|date',
        'start_time' => 'required',
        'end_time' => 'required',
    ]);
    
    // Parse times
    $startTime = Carbon::parse($validated['date'] . ' ' . $validated['start_time']);
    $endTime = Carbon::parse($validated['date'] . ' ' . $validated['end_time']);
    
    // Handle case where end time is on the next day
    if ($endTime->lt($startTime)) {
        $endTime->addDay();
    }
    
    // Get total hours
    $totalHours = $endTime->diffInMinutes($startTime) / 60;
    
    // Check conditions
    $isHoliday = $this->isHoliday($validated['date']);
    $isRestDay = $this->isRestDay($validated['date']);
    $hasNightDiff = $this->hasNightDifferential($startTime, $endTime);
    $nightDiffHours = $this->calculateNightDifferentialHours($startTime, $endTime);
    
    // Check if shift crosses midnight and the next day has a different type
    $nextDate = Carbon::parse($validated['date'])->addDay()->toDateString();
    $isNextDayHoliday = $this->isHoliday($nextDate);
    $isNextDayRestDay = $this->isRestDay($nextDate);
    $splitHours = null;
    
    if ($endTime->gt($startTime->copy()->startOfDay()->addDay())) {
        // Shift crosses midnight
        $splitHours = $this->calculateSplitHolidayHours($validated['date'], $startTime, $endTime);
    }
    
    // Calculate the appropriate rate multiplier
    $baseMultiplier = 1.25; // Ordinary Weekday Overtime
    $calculatedMultiplier = $this->calculateRateMultiplier(
        $validated['date'],
        $startTime,
        $endTime,
        $baseMultiplier
    );
    
    // Build explanation
    $explanation = [
        'date' => $validated['date'],
        'startTime' => $startTime->format('h:i A'),
        'endTime' => $endTime->format('h:i A'),
        'totalHours' => number_format($totalHours, 2),
        'isHoliday' => $isHoliday,
        'isRestDay' => $isRestDay,
        'hasNightDifferential' => $hasNightDiff,
        'nightDifferentialHours' => number_format($nightDiffHours, 2),
        'crossesMidnight' => $endTime->day !== $startTime->day,
        'splitHours' => $splitHours,
        'rateMultiplier' => $calculatedMultiplier,
        'explanation' => $this->generateRateExplanation(
            $isHoliday, 
            $isRestDay, 
            $hasNightDiff,
            $splitHours, 
            $isNextDayHoliday, 
            $isNextDayRestDay
        )
    ];
    
    return response()->json($explanation);
}

/**
 * Generate a human-readable explanation of the rate calculation
 */
private function generateRateExplanation($isHoliday, $isRestDay, $hasNightDiff, $splitHours, $isNextDayHoliday, $isNextDayRestDay)
{
    $explanation = [];
    
    if ($isHoliday) {
        $explanation[] = "This date is a holiday, which has a base rate of 200%.";
        $explanation[] = "Overtime on a holiday receives an additional 30% premium, resulting in a 260% rate.";
    } else if ($isRestDay) {
        $explanation[] = "This date is a rest day, which has a base rate of 130%.";
        $explanation[] = "Overtime on a rest day receives an additional 30% premium, resulting in a 169% rate.";
    } else {
        $explanation[] = "This is a regular working day with a standard overtime rate of 125%.";
    }
    
    if ($hasNightDiff) {
        $explanation[] = "Part of this overtime falls within night differential hours (10PM to 6AM), which adds 10% to the rate.";
    }
    
    // Explain split calculation if applicable
    if ($splitHours && $splitHours['regularHours'] > 0) {
        $explanation[] = "This overtime crosses midnight, with {$splitHours['holidayHours']} hours on the first day and {$splitHours['regularHours']} hours on the second day.";
        
        if ($isHoliday && !$isNextDayHoliday) {
            $explanation[] = "The first part uses holiday rates (260%), while the second part uses regular rates (125%).";
        } else if (!$isHoliday && $isNextDayHoliday) {
            $explanation[] = "The first part uses regular rates (125%), while the second part uses holiday rates (260%).";
        } else if ($isRestDay && !$isNextDayRestDay) {
            $explanation[] = "The first part uses rest day rates (169%), while the second part uses regular rates (125%).";
        } else if (!$isRestDay && $isNextDayRestDay) {
            $explanation[] = "The first part uses regular rates (125%), while the second part uses rest day rates (169%).";
        }
    }
    
    return $explanation;
}


    private function isDepartmentManagerFor($user, $overtime)
{
    // First check if the user is directly assigned as the department manager for this overtime
    if ($overtime->dept_manager_id === $user->id) {
        return true;
    }
    
    // Then check if the user is a department manager for the employee's department
    $employeeDepartment = $overtime->employee ? $overtime->employee->Department : null;
    
    if ($employeeDepartment) {
        // Check directly in the department_managers table
        $isManager = DepartmentManager::where('manager_id', $user->id)
            ->where('department', $employeeDepartment)
            ->exists();
            
        if ($isManager) {
            return true;
        }
    }
    
    // Fallback to user role check
    if (method_exists($user, 'hasRole') && $user->hasRole('department_manager')) {
        // If user has department_manager role, check if they manage any departments
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)->count();
        return $managedDepartments > 0;
    }
    
    return false;
}

/**
 * Force approve overtime requests (admin only).
 */
public function forceApprove(Request $request)
{
    // Ensure only superadmins can force approve
    if (!$this->isSuperAdmin(Auth::user())) {
        return Inertia::render('Overtime/OvertimePage', [
            'auth' => ['user' => Auth::user()],
            'flash' => ['error' => 'Only administrators can force approve overtime requests.']
        ]);
    }
    
    $validated = $request->validate([
        'overtime_ids' => 'required|array',
        'overtime_ids.*' => 'required|integer|exists:overtimes,id',
        'remarks' => 'nullable|string|max:500',
    ]);
    
    $user = Auth::user();
    $remarks = $validated['remarks'] ?? 'Administrative override: Force approved by admin';
    $successCount = 0;
    $failCount = 0;
    $errors = [];
    
    // Log the force approval action
    \Log::info('Force approval of overtime initiated', [
        'admin_id' => $user->id,
        'admin_name' => $user->name,
        'count' => count($validated['overtime_ids'])
    ]);
    
    foreach ($validated['overtime_ids'] as $overtimeId) {
        try {
            $overtime = Overtime::findOrFail($overtimeId);
            
            // Skip already approved overtimes
            if ($overtime->status === 'approved') {
                $errors[] = "Overtime #{$overtimeId} is already approved";
                $failCount++;
                continue;
            }
            
            // Force approve - set all necessary approval information
            $overtime->dept_approved_by = $overtime->dept_approved_by ?: $user->id;
            $overtime->dept_approved_at = $overtime->dept_approved_at ?: now();
            $overtime->dept_remarks = $overtime->dept_remarks ?: 'Administrative override: ' . $remarks;
            
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = 'Administrative override: ' . $remarks;
            
            // Set status to approved
            $overtime->status = 'approved';
            $overtime->save();
            
            $successCount++;
            
            // Log individual approvals
            \Log::info("Force approved overtime #{$overtimeId}", [
                'admin_id' => $user->id,
                'overtime_id' => $overtimeId,
                'previous_status' => $overtime->getOriginal('status')
            ]);
        } catch (\Exception $e) {
            \Log::error("Error force approving overtime #{$overtimeId}: " . $e->getMessage());
            $failCount++;
            $errors[] = "Error force approving overtime #{$overtimeId}: " . $e->getMessage();
        }
    }
    
    // Create appropriate flash message
    $message = "{$successCount} overtime requests force approved successfully.";
    if ($failCount > 0) {
        $message .= " {$failCount} force approvals failed.";
    }
    
    // Query overtimes for refreshed data
    $overtimes = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
        ->orderBy('created_at', 'desc')
        ->get();
    
    // Get data required for the page
    $employees = Employee::where('JobStatus', 'Active')
        ->orderBy('Lname')
        ->get();
        
    $departments = Employee::select('Department')
        ->distinct()
        ->whereNotNull('Department')
        ->orderBy('Department')
        ->pluck('Department')
        ->toArray();
        
    $rateMultipliers = [
        ['value' => 1.25, 'label' => 'Ordinary Weekday Overtime (125%)'],
        ['value' => 1.30, 'label' => 'Rest Day/Special Day (130%)'],
        ['value' => 1.50, 'label' => 'Scheduled Rest Day (150%)'],
        ['value' => 2.00, 'label' => 'Regular Holiday (200%)'],
        ['value' => 1.69, 'label' => 'Rest Day/Special Day Overtime (169%)'],
        ['value' => 1.95, 'label' => 'Scheduled Rest Day Overtime (195%)'],
        ['value' => 2.60, 'label' => 'Regular Holiday Overtime (260%)'],
        ['value' => 1.375, 'label' => 'Ordinary Weekday Overtime + Night Differential (137.5%)'],
        ['value' => 1.43, 'label' => 'Rest Day/Special Day + Night Differential (143%)'],
        ['value' => 1.65, 'label' => 'Scheduled Rest Day + Night Differential (165%)'],
        ['value' => 2.20, 'label' => 'Regular Holiday + Night Differential (220%)'],
        ['value' => 1.859, 'label' => 'Rest Day/Special Day Overtime + Night Differential (185.9%)'],
        ['value' => 2.145, 'label' => 'Scheduled Rest Day Overtime + Night Differential (214.5%)'],
        ['value' => 2.86, 'label' => 'Regular Holiday Overtime + Night Differential (286%)'],
    ];
    
    // Get user roles for the page
    $userRoles = $this->getUserRoles($user);
    
    // Return Inertia response with data and flash message
    return Inertia::render('Overtime/OvertimePage', [
        'auth' => ['user' => Auth::user()],
        'overtimes' => $overtimes,
        'employees' => $employees,
        'departments' => $departments,
        'rateMultipliers' => $rateMultipliers,
        'userRoles' => $userRoles,
        'flash' => [
            'message' => $message,
            'errors' => $errors
        ]
    ]);
}

    /**
     * Update the status of an overtime request.
     */
    public function updateStatus(Request $request, Overtime $overtime)
{
    $user = Auth::user();
    
    // Validate request
    $validated = $request->validate([
        'status' => 'required|in:manager_approved,approved,rejected,force_approved',
        'remarks' => 'nullable|string|max:500',
    ]);

    // Log the action for debugging
    \Log::info('Updating overtime status', [
        'overtime_id' => $overtime->id,
        'current_status' => $overtime->status,
        'new_status' => $validated['status'],
        'user_id' => $user->id,
        'user_name' => $user->name
    ]);

    // If the status isn't changing, we should still update remarks if provided
    if ($overtime->status === $validated['status']) {
        try {
            // Just update remarks if they're provided
            if (!empty($validated['remarks'])) {
                if ($overtime->status === 'pending') {
                    $overtime->dept_remarks = $validated['remarks'];
                } else if ($overtime->status === 'manager_approved') {
                    $overtime->hrd_remarks = $validated['remarks'];
                }
                $overtime->save();
                
                \Log::info('Overtime remarks updated successfully', [
                    'overtime_id' => $overtime->id,
                    'status' => $overtime->status,
                    'by_user' => $user->name
                ]);
            }
            
            // Get fresh overtime data for the response
            $overtime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
                ->find($overtime->id);
                
            // Get full updated list
            $overtimes = $this->getFilteredOvertimes($user);

            return response()->json([
                'message' => 'Overtime remarks updated successfully.',
                'overtime' => $overtime,
                'overtimes' => $overtimes
            ]);
        } catch (\Exception $e) {
            // Log the error
            \Log::error('Failed to update overtime remarks', [
                'overtime_id' => $overtime->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return error response
            return response()->json([
                'message' => 'Failed to update overtime remarks: ' . $e->getMessage()
            ], 500);
        }
    }

    // Check permission for status update
    $canUpdate = false;
    $isForceApproval = $validated['status'] === 'force_approved';
    
    // Only superadmin can force approve
    if ($isForceApproval && $this->isSuperAdmin($user)) {
        $canUpdate = true;
        // Force approval becomes a regular approval but with admin override
        $validated['status'] = 'approved';
    } 
    // Department manager can approve pending overtime for their department
    elseif ($overtime->status === 'pending' && $validated['status'] === 'manager_approved') {
        // Check if user is a department manager for this overtime using the reliable method
        $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);

        if ($isDeptManager || $this->isSuperAdmin($user)) {
            $canUpdate = true;
        }
    }
    // HRD manager can approve manager_approved overtime to final approved status
    elseif ($overtime->status === 'manager_approved' && $validated['status'] === 'approved') {
        if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
            $canUpdate = true;
        }
    }
    // Either department manager or HRD manager can reject based on current status
    elseif ($validated['status'] === 'rejected') {
        if ($overtime->status === 'pending') {
            // Department manager can reject pending overtime
            $isDeptManager = $this->isDepartmentManagerFor($user, $overtime);

            if ($isDeptManager || $this->isSuperAdmin($user)) {
                $canUpdate = true;
            }
        } elseif ($overtime->status === 'manager_approved') {
            // HRD manager can reject manager_approved overtime
            if ($this->isHrdManager($user) || $this->isSuperAdmin($user)) {
                $canUpdate = true;
            }
        }
    }

    if (!$canUpdate) {
        \Log::warning('Unauthorized overtime status update attempt', [
            'overtime_id' => $overtime->id,
            'user_id' => $user->id,
            'current_status' => $overtime->status,
            'requested_status' => $validated['status']
        ]);
        
        return response()->json([
            'message' => 'You are not authorized to update this overtime request status.'
        ], 403);
    }

    try {
        // Process the status update based on the current approval level
        if ($overtime->status === 'pending') {
            // Department manager approval/rejection
            $overtime->dept_approved_by = $user->id;
            $overtime->dept_approved_at = now();
            $overtime->dept_remarks = $validated['remarks'];
        } else if ($overtime->status === 'manager_approved') {
            // HRD manager approval/rejection
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = $validated['remarks'];
        }

        // Special case for force approval by superadmin
        if ($isForceApproval) {
            // Force approval should fill both approval levels
            if (!$overtime->dept_approved_by) {
                $overtime->dept_approved_by = $user->id;
                $overtime->dept_approved_at = now();
                $overtime->dept_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
            }
            
            $overtime->hrd_approved_by = $user->id;
            $overtime->hrd_approved_at = now();
            $overtime->hrd_remarks = 'Administrative override: ' . ($validated['remarks'] ?? 'Force approved by admin');
        }

        // Update the status
        $overtime->status = $validated['status'];
        $overtime->save();

        // Log success
        \Log::info('Overtime status updated successfully', [
            'overtime_id' => $overtime->id,
            'new_status' => $overtime->status,
            'by_user' => $user->name
        ]);

        // Get fresh overtime data for the response
        $overtime = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover'])
            ->find($overtime->id);
            
        // Get full updated list
        $overtimes = $this->getFilteredOvertimes($user);

        return response()->json([
            'message' => 'Overtime status updated successfully.',
            'overtime' => $overtime,
            'overtimes' => $overtimes
        ]);
    } catch (\Exception $e) {
        // Log the error
        \Log::error('Failed to update overtime status', [
            'overtime_id' => $overtime->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        // Return error response
        return response()->json([
            'message' => 'Failed to update overtime status: ' . $e->getMessage()
        ], 500);
    }
}

private function getFilteredOvertimes($user)
{
    $userRoles = $this->getUserRoles($user);
    
    // Query overtimes based on user role
    $overtimesQuery = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
    
    // Filter based on user roles
    if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // Regular employees can only see their own overtime requests
        $employeeId = $user->employee ? $user->employee->id : null;
        if ($employeeId) {
            $overtimesQuery->where('employee_id', $employeeId);
        } else {
            // If no employee record linked, show overtimes created by this user
            $overtimesQuery->where('created_by', $user->id);
        }
    } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
        // Department managers can see:
        // 1. Overtimes they created
        // 2. Overtimes assigned to them for approval
        // 3. Overtimes for employees in their department
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
            
        $overtimesQuery->where(function($query) use ($user, $managedDepartments) {
            $query->where('created_by', $user->id)
                ->orWhere('dept_manager_id', $user->id)
                ->orWhereHas('employee', function($q) use ($managedDepartments) {
                    $q->whereIn('Department', $managedDepartments);
                });
        });
    } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // HRD managers can see all overtime requests
        // No additional filtering needed
    }
    
    // Sort by latest first
    $overtimesQuery->orderBy('created_at', 'desc');
    
    return $overtimesQuery->get();
}

/**
 * Remove the specified overtime request.
 */
public function destroy(Overtime $overtime)
{
    // Check if the user is authorized to delete this overtime
    $user = Auth::user();
    
    // Only allow deletion if:
    // 1. User is a superadmin
    // 2. User created this overtime
    // 3. User is the department manager responsible for this overtime and it's still pending
    if (!$this->isSuperAdmin($user) && 
        $overtime->created_by !== $user->id && 
        !($this->isDepartmentManagerFor($user, $overtime) && $overtime->status === 'pending')) {
        
        return back()->with('error', 'You are not authorized to delete this overtime request');
    }
    
    // Can only delete if status is pending
    if ($overtime->status !== 'pending') {
        return back()->with('error', 'Only pending overtime requests can be deleted');
    }
    
    try {
        $overtime->delete();
        
        \Log::info('Overtime request deleted', [
            'overtime_id' => $overtime->id,
            'deleted_by' => $user->name,
            'user_id' => $user->id
        ]);
        
        // Get updated overtimes list
        $overtimes = $this->getFilteredOvertimes($user);
        
        // Return to the previous page with a success message
        return back()->with('message', 'Overtime request deleted successfully');
        
    } catch (\Exception $e) {
        \Log::error('Error deleting overtime request', [
            'overtime_id' => $overtime->id,
            'error' => $e->getMessage()
        ]);
        
        return back()->with('error', 'Failed to delete overtime request: ' . $e->getMessage());
    }
}

public function export(Request $request)
{
    // Validate request parameters if needed
    $filterStatus = $request->input('status');
    $searchTerm = $request->input('search');
    $fromDate = $request->input('from_date');
    $toDate = $request->input('to_date');
    
    // Get user roles
    $user = Auth::user();
    $userRoles = $this->getUserRoles($user);
    
    // Query overtimes based on user role
    $overtimesQuery = Overtime::with(['employee', 'creator', 'departmentManager', 'departmentApprover', 'hrdApprover']);
    
    // Filter based on user roles
    if ($userRoles['isEmployee'] && !$userRoles['isDepartmentManager'] && !$userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // Regular employees can only see their own overtime requests
        $employeeId = $user->employee ? $user->employee->id : null;
        if ($employeeId) {
            $overtimesQuery->where('employee_id', $employeeId);
        } else {
            // If no employee record linked, show overtimes created by this user
            $overtimesQuery->where('created_by', $user->id);
        }
    } elseif ($userRoles['isDepartmentManager'] && !$userRoles['isSuperAdmin']) {
        // Department managers can see:
        // 1. Overtimes they created
        // 2. Overtimes assigned to them for approval
        // 3. Overtimes for employees in their department
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
            
        $overtimesQuery->where(function($query) use ($user, $managedDepartments) {
            $query->where('created_by', $user->id)
                ->orWhere('dept_manager_id', $user->id)
                ->orWhereHas('employee', function($q) use ($managedDepartments) {
                    $q->whereIn('Department', $managedDepartments);
                });
        });
    } elseif ($userRoles['isHrdManager'] && !$userRoles['isSuperAdmin']) {
        // HRD managers can see all overtime requests
        // No additional filtering needed
    }
    
    // Apply filters from request
    if ($filterStatus) {
        $overtimesQuery->where('status', $filterStatus);
    }
    
    if ($searchTerm) {
        $overtimesQuery->where(function($query) use ($searchTerm) {
            $query->whereHas('employee', function($q) use ($searchTerm) {
                $q->where('Fname', 'like', "%{$searchTerm}%")
                  ->orWhere('Lname', 'like', "%{$searchTerm}%")
                  ->orWhere('idno', 'like', "%{$searchTerm}%")
                  ->orWhere('Department', 'like', "%{$searchTerm}%");
            })
            ->orWhere('reason', 'like', "%{$searchTerm}%");
        });
    }
    
    if ($fromDate) {
        $overtimesQuery->whereDate('date', '>=', $fromDate);
    }
    
    if ($toDate) {
        $overtimesQuery->whereDate('date', '<=', $toDate);
    }
    
    // Get overtimes data
    $overtimes = $overtimesQuery->orderBy('created_at', 'desc')->get();
    
    // Create a new Spreadsheet object
    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    
    // Set the column headers
    $sheet->setCellValue('A1', 'ID');
    $sheet->setCellValue('B1', 'Employee ID');
    $sheet->setCellValue('C1', 'Employee Name');
    $sheet->setCellValue('D1', 'Department');
    $sheet->setCellValue('E1', 'Date');
    $sheet->setCellValue('F1', 'Start Time');
    $sheet->setCellValue('G1', 'End Time');
    $sheet->setCellValue('H1', 'Total Hours');
    $sheet->setCellValue('I1', 'Rate Multiplier');
    $sheet->setCellValue('J1', 'Status');
    $sheet->setCellValue('K1', 'Reason');
    $sheet->setCellValue('L1', 'Filed By');
    $sheet->setCellValue('M1', 'Filed Date');
    $sheet->setCellValue('N1', 'Dept. Manager');
    $sheet->setCellValue('O1', 'Dept. Approved By');
    $sheet->setCellValue('P1', 'Dept. Approved Date');
    $sheet->setCellValue('Q1', 'Dept. Remarks');
    $sheet->setCellValue('R1', 'HRD Approved By');
    $sheet->setCellValue('S1', 'HRD Approved Date');
    $sheet->setCellValue('T1', 'HRD Remarks');
    
    // Add style to header row
    $headerStyle = [
        'font' => [
            'bold' => true,
            'color' => ['rgb' => 'FFFFFF'],
        ],
        'fill' => [
            'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
            'startColor' => ['rgb' => '4F81BD'],
        ],
        'borders' => [
            'allBorders' => [
                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
            ],
        ],
    ];
    
    $sheet->getStyle('A1:T1')->applyFromArray($headerStyle);
    
    // Add data rows
    $row = 2;
    foreach ($overtimes as $overtime) {
        $sheet->setCellValue('A' . $row, $overtime->id);
        $sheet->setCellValue('B' . $row, $overtime->employee ? $overtime->employee->idno : '');
        $sheet->setCellValue('C' . $row, $overtime->employee ? $overtime->employee->Lname . ', ' . $overtime->employee->Fname . ' ' . $overtime->employee->MName : '');
        $sheet->setCellValue('D' . $row, $overtime->employee ? $overtime->employee->Department : '');
        $sheet->setCellValue('E' . $row, $overtime->date ? \Carbon\Carbon::parse($overtime->date)->format('Y-m-d') : '');
        $sheet->setCellValue('F' . $row, $overtime->start_time ? \Carbon\Carbon::parse($overtime->start_time)->format('h:i A') : '');
        $sheet->setCellValue('G' . $row, $overtime->end_time ? \Carbon\Carbon::parse($overtime->end_time)->format('h:i A') : '');
        $sheet->setCellValue('H' . $row, $overtime->total_hours);
        $sheet->setCellValue('I' . $row, $overtime->rate_multiplier);
        $sheet->setCellValue('J' . $row, $overtime->status);
        $sheet->setCellValue('K' . $row, $overtime->reason);
        $sheet->setCellValue('L' . $row, $overtime->creator ? $overtime->creator->name : '');
        $sheet->setCellValue('M' . $row, $overtime->created_at ? \Carbon\Carbon::parse($overtime->created_at)->format('Y-m-d h:i A') : '');
        $sheet->setCellValue('N' . $row, $overtime->departmentManager ? $overtime->departmentManager->name : '');
        $sheet->setCellValue('O' . $row, $overtime->departmentApprover ? $overtime->departmentApprover->name : '');
        $sheet->setCellValue('P' . $row, $overtime->dept_approved_at ? \Carbon\Carbon::parse($overtime->dept_approved_at)->format('Y-m-d h:i A') : '');
        $sheet->setCellValue('Q' . $row, $overtime->dept_remarks);
        $sheet->setCellValue('R' . $row, $overtime->hrdApprover ? $overtime->hrdApprover->name : '');
        $sheet->setCellValue('S' . $row, $overtime->hrd_approved_at ? \Carbon\Carbon::parse($overtime->hrd_approved_at)->format('Y-m-d h:i A') : '');
        $sheet->setCellValue('T' . $row, $overtime->hrd_remarks);
        
        $row++;
    }
    
    // Auto-size columns
    foreach (range('A', 'T') as $column) {
        $sheet->getColumnDimension($column)->setAutoSize(true);
    }
    
    // Create writer and set headers for download
    $writer = new Xlsx($spreadsheet);
    $filename = 'Overtime_Report_' . date('Y-m-d_H-i-s') . '.xlsx';
    
    // Save to temporary file
    $tempFile = tempnam(sys_get_temp_dir(), 'overtime_export_');
    $writer->save($tempFile);
    
    // Return response
    return response()->download($tempFile, $filename, [
        'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ])->deleteFileAfterSend(true);
}
}