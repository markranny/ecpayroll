<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\EmployeeImportController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\BiometricController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AttendanceLogsController;
use App\Http\Controllers\EmployeeAttendanceImportController;
use App\Http\Controllers\OvertimeController;
use App\Http\Controllers\DepartmentManagerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ChangeOffScheduleController;
use App\Http\Controllers\TimeScheduleController;
use App\Http\Controllers\TravelOrderController;
use App\Http\Controllers\OfficialBusinessController;
use App\Http\Controllers\OffsetController;
use App\Http\Controllers\SLVLController;
use App\Http\Controllers\RetroController;
use App\Http\Controllers\BenefitController;
use App\Http\Controllers\Auth\EmployeeRegistrationController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\ProcessedAttendanceController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

// Public Routes
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('cls', function(){
    Artisan::call('clear-compiled');
    echo "clear-compiled: complete<br>";
    Artisan::call('cache:clear');
    echo "cache:clear: complete<br>";
    Artisan::call('config:clear');
    echo "config:clear: complete<br>";
    Artisan::call('view:clear');
    echo "view:clear: complete<br>";
    Artisan::call('optimize:clear');
    echo "optimize:clear: complete<br>";
    Artisan::call('config:cache');
    echo "config:cache: complete<br>";
    Artisan::call('view:cache');
    echo "view:cache: complete<br>";
  
  });

// Guest Routes (Authentication & Registration)
Route::middleware('guest')->group(function () {
    // Authentication Routes
    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    
    // Employee Registration Routes
    Route::get('employee/register', [EmployeeRegistrationController::class, 'create'])
        ->name('employee.register');
    Route::post('employee/register', [EmployeeRegistrationController::class, 'store']);
});

// Logout Route
Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// Authenticated Routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Main Dashboard Route - redirects to the appropriate dashboard based on role
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    
    // Role-Specific Dashboard Routes (added direct access routes)
    Route::get('/employee/dashboard', function () {
        return Inertia::render('EmployeeDashboard', [
            'auth' => ['user' => auth()->user()]
        ]);
    })->name('employee.dashboard');

    // Direct department manager dashboard access route 
    // (department managers should come here directly, skipping /dashboard)
    Route::get('/department-manager/dashboard', [DashboardController::class, 'departmentManagerDashboard'])
    ->middleware('role:department_manager,superadmin')
    ->name('department_manager.dashboard');

    Route::get('/superadmin/dashboard', function () {
        return Inertia::render('SuperadminDashboard', [
            'auth' => ['user' => auth()->user()]
        ]);
    })->middleware('role:superadmin')->name('superadmin.dashboard');

    // HRD Manager Dashboard route - use the controller method for proper data loading
    Route::get('/hrd/dashboard', [DashboardController::class, 'hrdManagerDashboard'])
    ->middleware('role:hrd_manager,superadmin')
    ->name('hrd_manager.dashboard');

    Route::get('/finance/dashboard', function () {
        return Inertia::render('FinanceDashboard', [
            'auth' => ['user' => auth()->user()]
        ]);
    })->middleware('role:finance,superadmin')->name('finance.dashboard');

    // Department Manager Routes
    Route::middleware('role:superadmin')->group(function () {
        Route::post('/department-managers', [DepartmentManagerController::class, 'store'])
            ->name('department-managers.store');
        Route::delete('/department-managers/{id}', [DepartmentManagerController::class, 'destroy'])
            ->name('department-managers.destroy');
    });

    // Employee Management Routes
    Route::middleware('role:hrd_manager,superadmin')
    ->prefix('employees')
    ->group(function () {
        // Import Routes - MUST be defined before the general routes to avoid conflicts
        Route::get('/import', [EmployeeImportController::class, 'showImport'])->name('employees.import');
        Route::post('/import', [EmployeeImportController::class, 'import'])->name('employees.import.process');
        Route::get('/template/download', [EmployeeImportController::class, 'downloadTemplate'])->name('employees.template.download');
        
        // Regular Employee Routes
        Route::get('/', [EmployeeController::class, 'index'])->name('employees.index');
        Route::get('/list', [EmployeeController::class, 'index'])->name('employees.list');
        Route::post('/', [EmployeeController::class, 'store'])->name('employees.store');
        
        // UPDATE THIS LINE - Add proper PUT route for updating employees
        Route::put('/{id}', [EmployeeController::class, 'update'])->name('employees.update');
        
        Route::delete('/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
        
        // Employee Status Management
        Route::post('/{id}/mark-inactive', [EmployeeController::class, 'markInactive'])->name('employees.markInactive');
        Route::post('/{id}/mark-blocked', [EmployeeController::class, 'markBlocked'])->name('employees.markBlocked');
        Route::post('/{id}/mark-active', [EmployeeController::class, 'markActive'])->name('employees.markActive');
    });
    

    // Attendance Routes
    Route::middleware('role:hrd_manager,superadmin')->group(function () {
        // Biometric Devices
        Route::get('/biometric-devices', [BiometricController::class, 'index'])
            ->name('biometric-devices.index');
        Route::post('/biometric-devices', [BiometricController::class, 'storeDevice'])
            ->name('biometric-devices.store');
        Route::put('/biometric-devices/{id}', [BiometricController::class, 'updateDevice'])
            ->name('biometric-devices.update');
        Route::delete('/biometric-devices/{id}', [BiometricController::class, 'deleteDevice'])
            ->name('biometric-devices.destroy');
        Route::post('/biometric-devices/test-connection', [BiometricController::class, 'testConnection'])
            ->name('biometric-devices.test-connection');
        Route::post('/biometric-devices/fetch-logs', [BiometricController::class, 'fetchLogs'])
            ->name('biometric-devices.fetch-logs');
        Route::post('/biometric-devices/diagnostic', [BiometricController::class, 'diagnosticTest'])
            ->name('biometric-devices.diagnostic');
        
        // Attendance Import Routes
        Route::get('/attendance/import', [AttendanceController::class, 'showImportPage'])
            ->name('attendance.import');
        Route::post('/attendance/import', [AttendanceController::class, 'import'])
            ->name('attendance.import.process');
        Route::get('/attendance/template/download', [AttendanceController::class, 'downloadTemplate'])
            ->name('attendance.template.download');
        
        // Manual Attendance Entry
        Route::get('/timesheet/manual-entry', [BiometricController::class, 'manualEntryForm'])
            ->name('timesheet.manual-entry');
        Route::post('/attendance/manual', [BiometricController::class, 'storeManualEntry'])
            ->name('attendance.manual.store');
        
        // Attendance Reports
        Route::get('/timesheet/report', [BiometricController::class, 'getAttendanceReport'])
            ->name('attendance.report');
        Route::get('/timesheet/report/data', [BiometricController::class, 'getAttendanceReport'])
            ->name('attendance.report.data');
        Route::get('/timesheet/report/export', [BiometricController::class, 'exportAttendanceReport'])
            ->name('attendance.report.export');
        
        // Attendance CRUD Operations
        Route::get('/timesheet/attendance/{id}/edit', [BiometricController::class, 'editAttendance'])
            ->name('attendance.edit');
        Route::put('/timesheet/attendance/{id}', [BiometricController::class, 'updateAttendance'])
            ->name('attendance.update');
        Route::delete('/timesheet/attendance/{id}', [BiometricController::class, 'deleteAttendance'])
            ->name('attendance.delete');

        // Main UI route
        Route::get('/attendance', [ProcessedAttendanceController::class, 'index'])
            ->name('attendance.index');

        // API endpoint for fetching attendance data
        Route::get('/attendance/list', [ProcessedAttendanceController::class, 'list'])
            ->name('attendance.list');

        // Update attendance record
        Route::put('/attendance/{id}', [ProcessedAttendanceController::class, 'update'])
            ->name('attendance.update');

        // Get departments for filter dropdown
        Route::get('/attendance/departments', [ProcessedAttendanceController::class, 'getDepartments'])
            ->name('attendance.departments');

        // Export attendance data
        Route::get('/attendance/export', [ProcessedAttendanceController::class, 'export'])
            ->name('attendance.export');
    });

    // Overtime Routes - Available to both employees and managers
    Route::middleware(['auth'])->group(function () {
        Route::get('/overtimes', [OvertimeController::class, 'index'])
            ->name('overtimes.index');
        Route::post('/overtimes', [OvertimeController::class, 'store'])
            ->name('overtimes.store');
        Route::post('/overtimes/{overtime}/status', [OvertimeController::class, 'updateStatus'])
            ->name('overtimes.updateStatus');
        /* Route::delete('/overtimes/{overtime}', [OvertimeController::class, 'destroy'])
            ->name('overtimes.destroy'); */
        Route::post('/overtimes/{overtime}/delete', [OvertimeController::class, 'destroy'])
            ->name('overtimes.destroy.post');
        Route::get('/overtimes/export', [OvertimeController::class, 'export'])
            ->name('overtimes.export');
        Route::post('/overtimes/explain-rate', [OvertimeController::class, 'explainRateCalculation'])
            ->name('overtimes.explain-rate')
            ->middleware(['auth']);
        
        // Bulk Actions for managers
        Route::middleware('role:department_manager,hrd_manager,superadmin')->group(function () {
            Route::post('/overtimes/bulk-update', [OvertimeController::class, 'bulkUpdateStatus'])
                ->name('overtimes.bulkUpdateStatus');
            
            // Force approve route (superadmin only)
            Route::middleware('role:superadmin')->group(function () {
                Route::post('/overtimes/force-approve', [OvertimeController::class, 'forceApprove'])
                    ->name('overtimes.force-approve');
            });
        });
    });

    // HR-Related Routes
    Route::middleware('role:hrd_manager,superadmin')->group(function () {
        // Offset Routes
        Route::get('/offsets', [OffsetController::class, 'index'])
            ->name('offsets.index');
        Route::post('/offsets', [OffsetController::class, 'store'])
            ->name('offsets.store');
        Route::put('/offsets/{id}', [OffsetController::class, 'update'])
            ->name('offsets.update');
        Route::post('/offsets/{id}/status', [OffsetController::class, 'updateStatus'])
            ->name('offsets.updateStatus');
        Route::delete('/offsets/{id}', [OffsetController::class, 'destroy'])
            ->name('offsets.destroy');
        Route::get('/offsets/export', [OffsetController::class, 'export'])
            ->name('offsets.export');

        // Change Off Schedule Routes
        Route::get('/change-off-schedules', [ChangeOffScheduleController::class, 'index'])
            ->name('change-off-schedules.index');
        Route::post('/change-off-schedules', [ChangeOffScheduleController::class, 'store'])
            ->name('change-off-schedules.store');
        Route::post('/change-off-schedules/{id}/status', [ChangeOffScheduleController::class, 'updateStatus'])
            ->name('change-off-schedules.updateStatus');
        Route::delete('/change-off-schedules/{id}', [ChangeOffScheduleController::class, 'destroy'])
            ->name('change-off-schedules.destroy');
        Route::get('/change-off-schedules/export', [ChangeOffScheduleController::class, 'export'])
            ->name('change-off-schedules.export');

        // Time Schedule Routes
        Route::get('/time-schedules', [TimeScheduleController::class, 'index'])
            ->name('time-schedules.index');
        Route::post('/time-schedules', [TimeScheduleController::class, 'store'])
            ->name('time-schedules.store');
        Route::post('/time-schedules/{id}/status', [TimeScheduleController::class, 'updateStatus'])
            ->name('time-schedules.updateStatus');
        Route::delete('/time-schedules/{id}', [TimeScheduleController::class, 'destroy'])
            ->name('time-schedules.destroy');
        Route::get('/time-schedules/export', [TimeScheduleController::class, 'export'])
            ->name('time-schedules.export');

        // Official Business Routes
        Route::get('/official-business', [OfficialBusinessController::class, 'index'])
            ->name('official-business.index');
        Route::post('/official-business', [OfficialBusinessController::class, 'store'])
            ->name('official-business.store');
        Route::post('/official-business/{id}/status', [OfficialBusinessController::class, 'updateStatus'])
            ->name('official-business.updateStatus');
        Route::delete('/official-business/{id}', [OfficialBusinessController::class, 'destroy'])
            ->name('official-business.destroy');
        Route::get('/official-business/export', [OfficialBusinessController::class, 'export'])
            ->name('official-business.export');

        // Travel Order Routes
        Route::get('/travel-orders', [TravelOrderController::class, 'index'])
            ->name('travel-orders.index');
        Route::post('/travel-orders', [TravelOrderController::class, 'store'])
            ->name('travel-orders.store');
        Route::post('/travel-orders/{id}/status', [TravelOrderController::class, 'updateStatus'])
            ->name('travel-orders.updateStatus');
        Route::delete('/travel-orders/{id}', [TravelOrderController::class, 'destroy'])
            ->name('travel-orders.destroy');
        Route::get('/travel-orders/export', [TravelOrderController::class, 'export'])
            ->name('travel-orders.export');

        // Retro Routes
        Route::get('/retro', [RetroController::class, 'index'])
            ->name('retro.index');
        Route::post('/retro', [RetroController::class, 'store'])
            ->name('retro.store');
        Route::put('/retro/{id}', [RetroController::class, 'update'])
            ->name('retro.update');
        Route::delete('/retro/{id}', [RetroController::class, 'destroy'])
            ->name('retro.destroy');
        Route::get('/retro/export', [RetroController::class, 'export'])
            ->name('retro.export');

        // SLVL (Sick Leave/Vacation Leave) Routes
        Route::get('/slvl', [SLVLController::class, 'index'])
            ->name('slvl.index');
        Route::post('/slvl', [SLVLController::class, 'store'])
            ->name('slvl.store');
        Route::post('/slvl/{id}/status', [SLVLController::class, 'updateStatus'])
            ->name('slvl.updateStatus');
        Route::delete('/slvl/{id}', [SLVLController::class, 'destroy'])
            ->name('slvl.destroy');
        Route::get('/slvl/export', [SLVLController::class, 'export'])
            ->name('slvl.export');
    });

    // Finance Routes
    Route::middleware('role:finance,superadmin')->group(function () {
        Route::get('/benefits', [BenefitController::class, 'index'])->name('benefits.index');
        Route::post('/benefits', [BenefitController::class, 'store'])->name('benefits.store');
        Route::patch('/benefits/{id}', [BenefitController::class, 'update'])->name('benefits.update');
        Route::patch('/benefits/{id}/field', [BenefitController::class, 'updateField'])->name('benefits.update-field');
        Route::post('/benefits/{id}/post', [BenefitController::class, 'postBenefit'])->name('benefits.post');
        Route::post('/benefits/{id}/set-default', [BenefitController::class, 'setDefault'])->name('benefits.set-default');
        Route::post('/benefits/post-all', [BenefitController::class, 'postAll'])->name('benefits.post-all');
        Route::post('/benefits/bulk-post', [BenefitController::class, 'bulkPost'])->name('benefits.bulk-post');
        Route::post('/benefits/bulk-set-default', [BenefitController::class, 'bulkSetDefault'])->name('benefits.bulk-set-default');
        Route::post('/benefits/create-from-default', [BenefitController::class, 'createFromDefault'])->name('benefits.create-from-default');
        Route::post('/benefits/bulk-create', [BenefitController::class, 'bulkCreateFromDefault'])->name('benefits.bulk-create');
        
        Route::get('/api/employee-defaults', [BenefitController::class, 'getEmployeeDefaults']);

        Route::get('/employee-defaults', [BenefitController::class, 'showEmployeeDefaultsPage'])
            ->name('employee-defaults.index');
    });

    // Reports Routes
    Route::get('/reports', function () {
        return Inertia::render('Reports/Index', [
            'auth' => ['user' => auth()->user()]
        ]);
    })->name('reports.index');

    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])
        ->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->name('profile.destroy');
});

// Include additional authentication routes
require __DIR__.'/auth.php';