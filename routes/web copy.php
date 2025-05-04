<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\EmployeeImportController;
use App\Http\Controllers\EmployeeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
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

    // Employee management routes
    Route::middleware(['role:superadmin,hrd'])->prefix('employees')->group(function () {
        // List routes
        Route::get('/list', [EmployeeController::class, 'index'])
            ->name('employees.list');
        Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::put('/employees/{employee}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
        Route::get('/inactive', [EmployeeImportController::class, 'inactive'])
            ->name('employees.inactive');
        Route::get('/block', [EmployeeImportController::class, 'block'])
            ->name('employees.block');
        
        // Import routes
        Route::get('/import', [EmployeeImportController::class, 'showImport'])
            ->name('employees.import');
        Route::post('/import', [EmployeeImportController::class, 'import'])
            ->name('employees.import.process');
        Route::get('/template/download', [EmployeeImportController::class, 'downloadTemplate'])
            ->name('employees.template.download');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';