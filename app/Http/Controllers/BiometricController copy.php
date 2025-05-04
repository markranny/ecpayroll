<?php
namespace App\Http\Controllers;

use App\Models\BiometricLog;
use Illuminate\Http\Request;
use App\Models\ProcessedAttendance;
use App\Services\ZKTecoService;
use App\Http\Requests\FetchLogsRequest;
use App\Http\Requests\AttendanceReportRequest;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BiometricController extends Controller
{
    public function testConnection(Request $request)
    {
        try {
            $deviceIp = $request->input('device_ip');
            
            if (empty($deviceIp)) {
                return response()->json([
                    'message' => 'Device IP is required'
                ], 400);
            }

            $zkService = new ZKTecoService($deviceIp);
            $testResults = $zkService->testDeviceConnection();
            
            return response()->json([
                'success' => true,
                'diagnostics' => $testResults
            ]);
        } catch (\Exception $e) {
            Log::error('Connection test error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Connection test failed: ' . $e->getMessage(),
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    public function testDevice(Request $request)
    {
        try {
            $deviceIp = $request->input('device_ip');
            
            if (empty($deviceIp)) {
                return response()->json([
                    'message' => 'Device IP is required'
                ], 400);
            }

            $zkService = new ZKTecoService($deviceIp);
            $testResults = $zkService->getZk()->testDeviceConnection();
            
            Log::info('Device test results:', $testResults);
            
            return response()->json([
                'success' => true,
                'test_results' => $testResults
            ]);
        } catch (\Exception $e) {
            Log::error('Device test error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'test_results' => null
            ], 500);
        }
    }

    public function fetchLogs(Request $request)
    {
        try {
            $deviceIp = $request->input('device_ip');
            
            if (empty($deviceIp)) {
                return response()->json([
                    'message' => 'Device IP is required'
                ], 400);
            }

            $zkService = new ZKTecoService($deviceIp);
            $attendance = $zkService->getAttendance();
            
            return response()->json([
                'success' => true,
                'data' => $attendance
            ]);
        } catch (\Exception $e) {
            Log::error('Attendance fetch error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch attendance logs: ' . $e->getMessage()
            ], 500);
        }
    }

    private function processAttendance(): void
    {
        $unprocessedLogs = BiometricLog::where('processed', false)
            ->orderBy('punch_time')
            ->get()
            ->groupBy('idno');

        foreach ($unprocessedLogs as $idno => $logs) {
            $currentDate = null;
            $attendance = null;

            foreach ($logs as $log) {
                $logDate = $log->punch_time->format('Y-m-d');
                
                if ($currentDate !== $logDate) {
                    if ($attendance) {
                        $attendance->save();
                    }

                    $attendance = ProcessedAttendance::firstOrNew([
                        'idno' => $idno,
                        'attendance_date' => $logDate
                    ]);

                    $currentDate = $logDate;
                }

                $this->assignPunchTime($attendance, $log);
                $log->processed = true;
                $log->save();
            }

            if ($attendance) {
                $attendance->save();
            }
        }
    }

    private function assignPunchTime(ProcessedAttendance $attendance, BiometricLog $log): void
    {
        $punchTime = $log->punch_time;
        
        if ($attendance->is_nightshift && $punchTime->hour < 12) {
            $attendance->next_day_timeout = $punchTime;
            return;
        }

        if (!$attendance->time_in) {
            $attendance->time_in = $punchTime;
        } elseif (!$attendance->break_in && $punchTime->hour >= 12) {
            $attendance->break_in = $punchTime;
        } elseif (!$attendance->break_out && $attendance->break_in) {
            $attendance->break_out = $punchTime;
        } elseif (!$attendance->time_out) {
            if ($punchTime->hour >= 20) {
                $attendance->is_nightshift = true;
            }
            $attendance->time_out = $punchTime;
        }
    }

    public function getAttendanceReport(AttendanceReportRequest $request): JsonResponse
    {
        try {
            $query = ProcessedAttendance::query()
                ->whereBetween('attendance_date', [
                    $request->input('start_date'),
                    $request->input('end_date')
                ]);

            if ($request->filled('idno')) {
                $query->where('idno', $request->input('idno'));
            }

            return response()->json($query->get());
            
        } catch (\Exception $e) {
            Log::error('Attendance report generation failed: ' . $e->getMessage(), [
                'params' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to generate attendance report',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}