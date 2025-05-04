<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\EmployeeImportController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\BiometricController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\EmployeeAttendanceImportController;
use App\Http\Controllers\OvertimeController;
use App\Http\Controllers\ChangeOffScheduleController;
use App\Http\Controllers\TimeScheduleController;
use App\Http\Controllers\TravelOrderController;
use App\Http\Controllers\OfficialBusinessController;
use App\Http\Controllers\OffsetController;
use App\Http\Controllers\RetroController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        $user = auth()->user();
        $role = $user->getRoleSlug(); 

        if (!$role) {
            return Inertia::render('Dashboard');
        }

        return redirect()->route($role.'.dashboard');
    })->name('dashboard');

    // Role-specific dashboard routes
    Route::get('/superadmin/dashboard', function () {
        return Inertia::render('SuperadminDashboard', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->middleware('role:superadmin')->name('superadmin.dashboard');

    Route::get('/hrd/dashboard', function () {
        return Inertia::render('HrdDashboard', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->middleware('role:hrd')->name('hrd.dashboard');

    Route::get('/finance/dashboard', function () {
        return Inertia::render('FinanceDashboard', [
            'auth' => [
                'user' => auth()->user()
            ]
        ]);
    })->middleware('role:finance')->name('finance.dashboard');

    Route::middleware(['role:superadmin,hrd'])
    ->prefix('employees')->group(function () {
        Route::get('/list', [EmployeeController::class, 'index'])->name('employees.list');
        Route::post('/', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('/{id}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::delete('/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy'); // Fixed route
        
        Route::get('/inactive', [EmployeeImportController::class, 'inactive'])->name('employees.inactive');
        Route::get('/block', [EmployeeImportController::class, 'block'])->name('employees.block');
        
        Route::get('/import', [EmployeeImportController::class, 'showImport'])->name('employees.import');
        Route::post('/import', [EmployeeImportController::class, 'import'])->name('employees.import.process');
        Route::get('/template/download', [EmployeeImportController::class, 'downloadTemplate'])
            ->name('employees.template.download');
    });

    // Overtime routes
    Route::get('/overtimes', [OvertimeController::class, 'index'])->name('overtimes.index');
    Route::post('/overtimes', [OvertimeController::class, 'store'])->name('overtimes.store');
    Route::put('/overtimes/{id}', [OvertimeController::class, 'update'])->name('overtimes.update');
    // Changed from PUT to POST to make it compatible with the front-end
    Route::post('/overtimes/{id}/status', [OvertimeController::class, 'updateStatus'])->name('overtimes.updateStatus');
    Route::delete('/overtimes/{id}', [OvertimeController::class, 'destroy'])->name('overtimes.destroy');
    Route::get('/overtimes/export', [OvertimeController::class, 'export'])->name('overtimes.export');

    // API routes for Inertia
    Route::get('/api/overtimes', [OvertimeController::class, 'getOvertimes'])->name('api.overtimes');
    Route::get('/api/employees', [OvertimeController::class, 'getEmployees'])->name('api.employees');


    Route::get('/change-off-schedules', [ChangeOffScheduleController::class, 'index'])->name('change-off-schedules.index');
    Route::post('/change-off-schedules', [ChangeOffScheduleController::class, 'store'])->name('change-off-schedules.store');
    Route::post('/change-off-schedules/{id}/status', [ChangeOffScheduleController::class, 'updateStatus'])->name('change-off-schedules.updateStatus');
    Route::delete('/change-off-schedules/{id}', [ChangeOffScheduleController::class, 'destroy'])->name('change-off-schedules.destroy');
    Route::get('/change-off-schedules/export', [ChangeOffScheduleController::class, 'export'])->name('change-off-schedules.export');

    Route::get('/time-schedules', [TimeScheduleController::class, 'index'])->name('time-schedules.index');
    Route::post('/time-schedules', [TimeScheduleController::class, 'store'])->name('time-schedules.store');

    Route::post('/time-schedules/{id}/status', [TimeScheduleController::class, 'updateStatus'])->name('time-schedules.updateStatus');
    Route::delete('/time-schedules/{id}', [TimeScheduleController::class, 'destroy'])->name('time-schedules.destroy');
    Route::get('/time-schedules/export', [TimeScheduleController::class, 'export'])->name('time-schedules.export');


    // Official Business routes
    Route::get('/official-business', [OfficialBusinessController::class, 'index'])->name('official-business.index');
    Route::post('/official-business', [OfficialBusinessController::class, 'store'])->name('official-business.store');
    Route::post('/official-business/{id}/status', [OfficialBusinessController::class, 'updateStatus'])->name('official-business.updateStatus');
    Route::delete('/official-business/{id}', [OfficialBusinessController::class, 'destroy'])->name('official-business.destroy');
    Route::get('/official-business/export', [OfficialBusinessController::class, 'export'])->name('official-business.export');

    // Travel Order routes
    Route::get('/travel-orders', [TravelOrderController::class, 'index'])->name('travel-orders.index');
    Route::post('/travel-orders', [TravelOrderController::class, 'store'])->name('travel-orders.store');
    Route::post('/travel-orders/{id}/status', [TravelOrderController::class, 'updateStatus'])->name('travel-orders.updateStatus');
    Route::delete('/travel-orders/{id}', [TravelOrderController::class, 'destroy'])->name('travel-orders.destroy');
    Route::get('/travel-orders/export', [TravelOrderController::class, 'export'])->name('travel-orders.export');

    // Offset routes
    Route::get('/offsets', [OffsetController::class, 'index'])->name('offsets.index');
    Route::post('/offsets', [OffsetController::class, 'store'])->name('offsets.store');
    Route::put('/offsets/{id}', [OffsetController::class, 'update'])->name('offsets.update');
    // Changed from PUT to POST to make it compatible with the front-end
    Route::post('/offsets/{id}/status', [OffsetController::class, 'updateStatus'])->name('offsets.updateStatus');
    Route::delete('/offsets/{id}', [OffsetController::class, 'destroy'])->name('offsets.destroy');
    Route::get('/offsets/export', [OffsetController::class, 'export'])->name('offsets.export');

    // API routes for Inertia
    Route::get('/api/offsets', [OffsetController::class, 'getOffsets'])->name('api.offsets');


});


Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/retro', [RetroController::class, 'index'])->name('retro.index');
    Route::post('/retro', [RetroController::class, 'store'])->name('retro.store');
    Route::put('/retro/{id}', [RetroController::class, 'update'])->name('retro.update');
    Route::delete('/retro/{id}', [RetroController::class, 'destroy'])->name('retro.destroy');
    Route::get('/retro/export', [RetroController::class, 'export'])->name('retro.export');
});


Route::post('biometric/fetch-logs', [BiometricController::class, 'fetchLogs']);
Route::get('attendance/report', [BiometricController::class, 'getAttendanceReport']);
Route::get('/attendance/generate', function () {
    return Inertia::render('timesheets/AttendanceManagement', [
        'auth' => [
            'user' => Auth::user(),
        ],
    ]);
})->name('attendance.report');

Route::middleware(['auth'])->group(function () {
    Route::get('/timesheets/eac', function () {
        return Inertia::render('timesheets/AttendanceLogs', [
            'initialAttendances' => App\Models\ProcessedAttendance::orderBy('attendance_date', 'desc')
                ->orderBy('time_in', 'desc')
                ->get(),
            'auth' => [
                'user' => Auth::user(),
            ]
        ]);
    })->name('timesheets.eac');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/import-attendance', [EmployeeAttendanceImportController::class, 'index']);
    Route::post('/attendance/import', [EmployeeAttendanceImportController::class, 'import']);
    Route::get('/attendance/template/download', [EmployeeAttendanceImportController::class, 'downloadTemplate'])
    ->name('attendance.template.download');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/attendance-logs', [AttendanceLogsController::class, 'index'])->name('attendance.logs');
    Route::put('/attendance-logs/{id}', [AttendanceLogsController::class, 'update'])->name('attendance.update');
});


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


require __DIR__.'/auth.php';