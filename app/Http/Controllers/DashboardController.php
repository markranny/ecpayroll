<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Overtime;
use App\Models\DepartmentManager;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Display the appropriate dashboard based on user role.
     */
    public function index()
    {
        $user = Auth::user();
        
        if ($this->userHasRole($user, 'superadmin')) {
            return $this->superAdminDashboard($user);
        } elseif ($this->userHasRole($user, 'hrd_manager')) {
            return $this->hrdManagerDashboard($user);
        } elseif ($this->userHasRole($user, 'department_manager')) {
            return $this->departmentManagerDashboard($user);
        } else {
            return $this->employeeDashboard($user);
        }
    }
    
    /**
     * Display Superadmin dashboard.
     */
    private function superAdminDashboard($user)
    {
        return Inertia::render('SuperadminDashboard', [
            'auth' => [
                'user' => $user,
            ],
        ]);
    }
    
    /**
     * Display HRD Manager dashboard.
     */
    private function hrdManagerDashboard($user)
    {
        // Get pending overtime approvals for HRD manager
        $pendingOvertimes = Overtime::with(['employee', 'departmentManager', 'departmentApprover'])
            ->where('status', 'manager_approved')
            ->latest()
            ->get();
        
        // Get department statistics
        $departmentsStats = $this->getDepartmentStats();
        
        // Get organization-wide statistics
        $organizationStats = [
            'totalEmployees' => Employee::count(),
            'employeeChange' => '+5', // This would be calculated based on historical data
            'leaveRequests' => 12, // This would be from a leave request model
            'leaveChange' => '+2',
            'attendanceRate' => '95%',
            'attendanceChange' => '+1%',
        ];
        
        // Recent activities
        $recentActivities = $this->getRecentActivities();
        
        return Inertia::render('HrdManagerDashboard', [
            'auth' => [
                'user' => $user,
            ],
            'pendingOvertimes' => $pendingOvertimes,
            'departmentsStats' => $departmentsStats,
            'organizationStats' => $organizationStats,
            'recentActivities' => $recentActivities,
        ]);
    }
    
    /**
     * Display Department Manager dashboard.
     */
    private function departmentManagerDashboard($user)
    {
        // Get managed departments
        $managedDepartments = DepartmentManager::where('manager_id', $user->id)
            ->pluck('department')
            ->toArray();
        
        // Get employees in managed departments
        $departmentEmployees = Employee::whereIn('Department', $managedDepartments)
            ->get()
            ->map(function($employee) {
                return [
                    'id' => $employee->id,
                    'idno' => $employee->idno,
                    'Fname' => $employee->Fname,
                    'Lname' => $employee->Lname,
                    'Department' => $employee->Department,
                    'Jobtitle' => $employee->Jobtitle,
                    'status' => $employee->JobStatus === 'Active' ? 'active' : 'inactive'
                ];
            });
        
        // Get pending overtime approvals for this manager
        $pendingOvertimes = Overtime::with(['employee', 'creator'])
            ->where('status', 'pending')
            ->where(function($query) use ($user, $managedDepartments) {
                $query->where('dept_manager_id', $user->id)
                    ->orWhereHas('employee', function($q) use ($managedDepartments) {
                        $q->whereIn('Department', $managedDepartments);
                    });
            })
            ->latest()
            ->get();
        
        // Department stats
        $departmentStats = [
            'employeeCount' => $departmentEmployees->count(),
            'attendanceRate' => '96%',
            'leaveRequestsCount' => 3
        ];
        
        // Upcoming events (this would typically come from a calendar/events model)
        $upcomingEvents = [
            ['title' => 'Team Meeting', 'date' => 'Tomorrow, 10:00 AM'],
            ['title' => 'Training Session', 'date' => 'Friday, 2:00 PM'],
        ];
        
        return Inertia::render('DepartmentManagerDashboard', [
            'auth' => [
                'user' => $user,
            ],
            'pendingOvertimes' => $pendingOvertimes,
            'departmentEmployees' => $departmentEmployees,
            'departmentStats' => $departmentStats,
            'upcomingEvents' => $upcomingEvents,
            'managedDepartments' => $managedDepartments,
        ]);
    }
    
    /**
     * Display regular Employee dashboard.
     */
    private function employeeDashboard($user)
    {
        // Get employee information if available
        $employeeRecord = Employee::where('idno', $user->employee_id)->first();
        
        // Get employee's overtime requests
        $myOvertimes = Overtime::with(['departmentManager', 'departmentApprover', 'hrdApprover'])
            ->where(function($query) use ($user, $employeeRecord) {
                if ($employeeRecord) {
                    $query->where('employee_id', $employeeRecord->id);
                }
                $query->orWhere('created_by', $user->id);
            })
            ->latest()
            ->get();
        
        // Employee info
        $employeeInfo = [
            'id' => $employeeRecord->id ?? null,
            'name' => $employeeRecord ? $employeeRecord->Fname . ' ' . $employeeRecord->Lname : $user->name,
            'jobTitle' => $employeeRecord->Jobtitle ?? 'Employee',
            'department' => $employeeRecord->Department ?? 'General',
            'totalOvertimeHours' => $this->calculateMonthlyOvertimeHours($myOvertimes),
            'leaveBalance' => '12', // This would come from a leave tracking system
            'attendancePercentage' => '98%',
        ];
        
        // Notifications
        $notifications = $this->generateEmployeeNotifications($myOvertimes);
        
        // Upcoming events
        $upcomingEvents = [
            ['title' => 'Team Meeting', 'date' => 'Tomorrow, 10:00 AM'],
            ['title' => 'Training Session', 'date' => 'Friday, 2:00 PM'],
            ['title' => 'Company Town Hall', 'date' => 'Next Monday, 9:00 AM'],
        ];
        
        return Inertia::render('EmployeeDashboard', [
            'auth' => [
                'user' => $user,
            ],
            'myOvertimes' => $myOvertimes,
            'employeeInfo' => $employeeInfo,
            'notifications' => $notifications,
            'upcomingEvents' => $upcomingEvents,
        ]);
    }
    
    /**
     * Helper method to check if user has a specific role.
     */
    private function userHasRole($user, $roleName)
    {
        // If the user has a roles relationship
        if (method_exists($user, 'roles') && $user->roles) {
            return $user->roles->pluck('name')->contains($roleName);
        }
        
        // If the user has a getRoleSlug method
        if (method_exists($user, 'getRoleSlug')) {
            $roleSlug = $user->getRoleSlug();
            return $roleSlug === $roleName;
        }
        
        // Check user permissions/roles table if it exists
        if (method_exists($user, 'hasRole')) {
            return $user->hasRole($roleName);
        }
        
        // Fallback for simple role detection
        switch ($roleName) {
            case 'superadmin':
                return stripos($user->name, 'admin') !== false || $user->id === 1;
            case 'hrd_manager':
                return stripos($user->name, 'hrd manager') !== false || 
                       stripos($user->email, 'hrdmanager') !== false;
            case 'department_manager':
                // Check if user is assigned as a manager for any department
                return DepartmentManager::where('manager_id', $user->id)->exists();
            default:
                return false;
        }
    }
    
    /**
     * Calculate monthly overtime hours for an employee
     */
    private function calculateMonthlyOvertimeHours($overtimes)
    {
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;
        
        $monthlyHours = $overtimes
            ->filter(function($overtime) use ($currentMonth, $currentYear) {
                $overtimeDate = Carbon::parse($overtime->date);
                return $overtimeDate->month === $currentMonth && 
                       $overtimeDate->year === $currentYear &&
                       $overtime->status === 'approved';
            })
            ->sum('total_hours');
            
        return $monthlyHours ? number_format($monthlyHours, 2) : '0';
    }
    
    /**
     * Generate notifications based on overtime status changes
     */
    private function generateEmployeeNotifications($overtimes)
    {
        $notifications = [];
        
        // Generate notifications from recent overtime status changes
        foreach ($overtimes->take(5) as $overtime) {
            if ($overtime->status === 'approved' && $overtime->hrd_approved_at) {
                $notifications[] = [
                    'type' => 'approval',
                    'message' => 'Your overtime request for ' . Carbon::parse($overtime->date)->format('M d, Y') . ' has been approved',
                    'time' => Carbon::parse($overtime->hrd_approved_at)->diffForHumans()
                ];
            } elseif ($overtime->status === 'manager_approved' && $overtime->dept_approved_at) {
                $notifications[] = [
                    'type' => 'approval',
                    'message' => 'Your overtime request was approved by department manager and is awaiting final approval',
                    'time' => Carbon::parse($overtime->dept_approved_at)->diffForHumans()
                ];
            } elseif ($overtime->status === 'rejected') {
                $notifications[] = [
                    'type' => 'rejection',
                    'message' => 'Your overtime request for ' . Carbon::parse($overtime->date)->format('M d, Y') . ' was rejected',
                    'time' => Carbon::parse($overtime->dept_approved_at ?? $overtime->hrd_approved_at)->diffForHumans()
                ];
            }
        }
        
        // Add some sample notifications if we have less than 3
        if (count($notifications) < 3) {
            $notifications[] = [
                'type' => 'info',
                'message' => 'Welcome to your Employee Dashboard!',
                'time' => 'Just now'
            ];
            
            $notifications[] = [
                'type' => 'info',
                'message' => 'New training opportunities available in your department',
                'time' => '2 days ago'
            ];
        }
        
        return $notifications;
    }
    
    /**
     * Get department statistics
     */
    private function getDepartmentStats()
    {
        // Get all departments
        $departments = Employee::distinct()->pluck('Department')->filter()->values();
        
        $departmentStats = [];
        
        foreach ($departments as $department) {
            $employeeCount = Employee::where('Department', $department)->count();
            
            // This would be calculated based on attendance records
            $attendanceRate = rand(85, 99);
            
            $departmentStats[] = [
                'name' => $department,
                'employeeCount' => $employeeCount,
                'attendanceRate' => $attendanceRate,
            ];
        }
        
        return $departmentStats;
    }
    
    /**
     * Get recent HR activities
     */
    private function getRecentActivities()
    {
        // This would typically come from an activity log or events table
        return [
            [
                'message' => 'New employee Mia Rodriguez onboarded',
                'time' => '2 hours ago'
            ],
            [
                'message' => 'Overtime policy updated - sent to all departments',
                'time' => '1 day ago'
            ],
            [
                'message' => '5 overtime requests approved for Tech Department',
                'time' => '1 day ago'
            ],
            [
                'message' => 'Employee satisfaction survey results published',
                'time' => '2 days ago'
            ],
            [
                'message' => 'Training schedule for Q3 published',
                'time' => '3 days ago'
            ]
        ];
    }
}