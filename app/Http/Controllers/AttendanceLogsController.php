<?php

namespace App\Http\Controllers;

use App\Models\EmployeeUploadAttendance;
use App\Models\Employee; 
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class AttendanceLogsController extends Controller
{
    public function index(): Response
{
    try {
        // Get query parameters for filtering
        $searchTerm = request('search');
        $dateFilter = request('date');
        $perPage = request('per_page', 50); // Default to 50 records per page

        // Start building the query
        $query = EmployeeUploadAttendance::select([
            'employee_upload_attendances.*',
            'employees.Fname',
            'employees.Lname',
            'employees.Department',
            'employees.Line'
        ])
        ->leftJoin('employees', function($join) {
            $join->on('employee_upload_attendances.employee_no', '=', 'employees.idno')
                 ->whereNull('employees.deleted_at');
        });

        // Apply filters if present
        if ($searchTerm) {
            $query->where(function($q) use ($searchTerm) {
                $q->where('employee_upload_attendances.employee_no', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('employees.Fname', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('employees.Lname', 'LIKE', "%{$searchTerm}%");
            });
        }

        if ($dateFilter) {
            $query->whereDate('employee_upload_attendances.date', $dateFilter);
        }

        // Order by date descending and paginate
        $attendances = $query->orderBy('employee_upload_attendances.date', 'desc')
                            ->paginate($perPage);

        // Map the results
        $mapped = $attendances->through(function ($attendance) {
            $firstName = $attendance->Fname ?? '';
            $lastName = $attendance->Lname ?? '';
            $fullName = trim($firstName . ' ' . $lastName);

            return [
                'id' => $attendance->id,
                'idno' => $attendance->employee_no,
                'employee_name' => $fullName ?: 'Unknown Employee',
                'department' => $attendance->Department ?? 'N/A',
                'line' => $attendance->Line ?? 'N/A',
                'attendance_date' => $attendance->date ? date('Y-m-d', strtotime($attendance->date)) : null,
                'day' => $attendance->day,
                'time_in' => $attendance->in1,
                'time_out' => $attendance->out1,
                'break_in' => $attendance->in2,
                'break_out' => $attendance->out2,
                'next_day_timeout' => $attendance->nextday,
                'is_nightshift' => !is_null($attendance->nextday)
            ];
        });

        // Get counts for debugging
        $stats = [
            'employeeCount' => Employee::count(),
            'attendanceCount' => EmployeeUploadAttendance::count(),
            'filteredCount' => $attendances->total()
        ];

        Log::debug('AttendanceLogs Stats:', $stats);

        return Inertia::render('timesheets/AttendanceLogs', [
            'attendances' => $mapped,
            'pagination' => [
                'total' => $attendances->total(),
                'per_page' => $attendances->perPage(),
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage()
            ],
            'filters' => [
                'search' => $searchTerm,
                'date' => $dateFilter
            ],
            'success' => session('success'),
            'error' => session('error'),
            'debug' => array_merge($stats, [
                'timestamp' => now()->toIso8601String()
            ]),
            'auth' => [
                'user' => Auth::user()
            ]
        ]);

    } catch (\Exception $e) {
        Log::error('AttendanceLogs Error:', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'request' => request()->all()
        ]);

        return Inertia::render('timesheets/AttendanceLogs', [
            'attendances' => [],
            'pagination' => [
                'total' => 0,
                'per_page' => 50,
                'current_page' => 1,
                'last_page' => 1
            ],
            'filters' => [
                'search' => request('search'),
                'date' => request('date')
            ],
            'error' => 'Failed to load attendance records. Please try again later.',
            'debug' => [
                'error' => $e->getMessage(),
                'timestamp' => now()->toIso8601String()
            ],
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }
}

public function debug()
{
    try {
        $stats = [
            'employee_count' => Employee::count(),
            'attendance_count' => EmployeeUploadAttendance::count(),
            'sample_employee' => Employee::first(),
            'sample_attendance' => EmployeeUploadAttendance::first()
        ];
        
        return response()->json($stats);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage()
        ], 500);
    }
}

    public function update(Request $request, int $id): RedirectResponse
    {
        try {
            $validated = $request->validate([
                'time_in' => 'nullable|date_format:Y-m-d H:i:s',
                'time_out' => 'nullable|date_format:Y-m-d H:i:s',
                'break_in' => 'nullable|date_format:Y-m-d H:i:s',
                'break_out' => 'nullable|date_format:Y-m-d H:i:s',
                'next_day_timeout' => 'nullable|date_format:Y-m-d H:i:s'
            ]);

            Log::debug('Update Attendance Request:', $validated);

            $attendance = EmployeeUploadAttendance::findOrFail($id);
            
            $attendance->update([
                'in1' => $validated['time_in'],
                'out1' => $validated['time_out'],
                'in2' => $validated['break_in'],
                'out2' => $validated['break_out'],
                'nextday' => $validated['next_day_timeout']
            ]);

            Log::debug('Attendance Updated:', $attendance->toArray());

            return back()->with('success', 'Attendance record updated successfully');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation Error:', $e->errors());
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            Log::error('Update Error:', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return back()->with('error', 'Failed to update attendance record: ' . $e->getMessage());
        }
    }
}