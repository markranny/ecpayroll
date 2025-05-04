<?php

namespace App\Http\Controllers;

use App\Services\ZKTeco\ZKTeco;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ZKTecoController extends Controller
{
    public function fetchLogs(Request $request)
    {
        $request->validate([
            'ip' => 'required|ip',
            'port' => 'nullable|integer|min:1|max:65535',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from'
        ]);

        try {
            $zk = new ZKTeco($request->ip, $request->port ?? 4370);
            $zk->connect();
            
            // Enable device
            $zk->enableDevice();
            
            // Get attendance logs
            $attendanceLogs = $zk->getAttendance();
            
            // Process logs
            $processedLogs = [];
            $dateFrom = Carbon::parse($request->date_from)->startOfDay();
            $dateTo = Carbon::parse($request->date_to)->endOfDay();

            foreach ($attendanceLogs as $log) {
                $logTime = Carbon::parse($log['timestamp']);
                
                // Filter by date range
                if ($logTime->between($dateFrom, $dateTo)) {
                    $processedLogs[] = [
                        'idno' => $log['id'],
                        'punch_time' => $logTime->format('Y-m-d H:i:s')
                    ];
                }
            }

            $zk->disconnect();
            
            return response()->json([
                'success' => true,
                'logs' => $processedLogs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching logs: ' . $e->getMessage()
            ], 500);
        }
    }
}
