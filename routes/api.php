<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BiometricController;
use Inertia\Inertia;

Route::middleware(['auth'])->group(function () {

Route::post('api/biometric/fetch-logs', [BiometricController::class, 'fetchLogs']);
Route::get('api/attendance/report', [BiometricController::class, 'getAttendanceReport'])->name('attendance.report');

Route::get('api/attendance/generate', function () {
    return Inertia::render('timesheets/AttendanceManagement');
})->name('attendance.report');
});