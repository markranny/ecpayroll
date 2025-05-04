<?php

namespace App\Http\Controllers;

use App\Models\EmployeeUploadAttendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Response;
use Inertia\Inertia;

class EmployeeAttendanceImportController extends Controller
{
    protected $expectedHeaders = [
        'employee_no',
        'date',
        'day',
        'in1',
        'out1',
        'in2',
        'out2',
        'nextday',
        'hours_work'
    ];

    public function index()
    {
        return Inertia::render('timesheets/ImportAttendancePage', [
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    public function showImport()
    {
        return Inertia::render('Employee/ImportAttendancePage', [
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    public function import(Request $request)
{
    try {
        if (!$request->wantsJson()) {
            return response()->json([
                'error' => 'JSON response required'
            ], 406);
        }

        if (!$request->hasFile('file')) {
            return response()->json([
                'error' => 'No file uploaded'
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Validate file type
        $file = $request->file('file');
        $allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return response()->json([
                'error' => 'Invalid file type. Please upload an Excel file.'
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Check if any data exists
        if (EmployeeUploadAttendance::count() > 0) {
            return response()->json([
                'error' => 'Data already exists in the system. Please clear existing data before importing.'
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        DB::beginTransaction();
        
        $spreadsheet = IOFactory::load($file->getPathname());
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        
        // Remove header row and validate headers
        $headers = array_shift($rows);
        $headerDiff = array_diff($this->expectedHeaders, $headers);
        
        if (!empty($headerDiff)) {
            return response()->json([
                'error' => 'Invalid file format. Missing columns: ' . implode(', ', $headerDiff)
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $success = 0;
        $failures = [];
        $rules = $this->getValidationRules();

        foreach ($rows as $index => $row) {
            // Skip empty rows
            if (empty(array_filter($row))) {
                continue;
            }

            // Create associative array from row data
            $data = array_combine($headers, $row);
            $data = $this->formatAttendanceData($data);

            // Validate row data
            $validator = Validator::make($data, $rules);

            if ($validator->fails()) {
                $failures[] = [
                    'row' => $index + 2,
                    'errors' => $validator->errors()->all()
                ];
                continue;
            }

            try {
                EmployeeUploadAttendance::create($data);
                $success++;
            } catch (\Exception $e) {
                $failures[] = [
                    'row' => $index + 2,
                    'errors' => ['Database error: ' . $e->getMessage()]
                ];
            }
        }

        DB::commit();
        
        return response()->json([
            'message' => "Successfully imported {$success} attendance records!" . 
                        ($failures ? " ({$success} successful, " . count($failures) . " failed)" : ""),
            'status' => 'success',
            'failures' => $failures,
            'total_processed' => count($rows),
            'successful' => $success,
            'failed' => count($failures)
        ]);

    } catch (\Exception $e) {
        DB::rollBack();
        
        \Log::error('Attendance import error:', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'error' => 'Error processing file: ' . $e->getMessage()
        ], Response::HTTP_INTERNAL_SERVER_ERROR);
    }
}

    protected function formatAttendanceData($data)
    {
        return [
            'employee_no' => trim($data['employee_no']),
            'date' => $data['date'] ? date('Y-m-d', strtotime($data['date'])) : null,
            'day' => trim($data['day']),
            'in1' => !empty($data['in1']) ? date('H:i:s', strtotime($data['in1'])) : null,
            'out1' => !empty($data['out1']) ? date('H:i:s', strtotime($data['out1'])) : null,
            'in2' => !empty($data['in2']) ? date('H:i:s', strtotime($data['in2'])) : null,
            'out2' => !empty($data['out2']) ? date('H:i:s', strtotime($data['out2'])) : null,
            'nextday' => isset($data['nextday']) ? filter_var($data['nextday'], FILTER_VALIDATE_BOOLEAN) : false,
            'hours_work' => is_numeric($data['hours_work']) ? floatval($data['hours_work']) : 0
        ];
    }

    protected function getValidationRules()
    {
        return [
            'employee_no' => 'required|string|max:255',
            'date' => 'required|date',
            'day' => 'required|string|max:20',
            'in1' => 'nullable|date_format:H:i:s',
            'out1' => 'nullable|date_format:H:i:s',
            'in2' => 'nullable|date_format:H:i:s',
            'out2' => 'nullable|date_format:H:i:s',
            'nextday' => 'boolean',
            'hours_work' => 'nullable|numeric|min:0'
        ];
    }

    public function downloadTemplate()
{
    try {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Define headers
        $headers = [
            'employee_no',
            'date',
            'day',
            'in1',
            'out1',
            'in2',
            'out2',
            'nextday',
            'hours_work'
        ];

        // Add headers
        foreach ($headers as $index => $header) {
            $column = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($index + 1);
            $sheet->setCellValue($column . '1', $header);
            
            // Style header cells
            $sheet->getStyle($column . '1')->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'color' => ['rgb' => 'E2E8F0']
                ]
            ]);
        }

        // Auto-size columns
        foreach (range('A', $sheet->getHighestColumn()) as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        // Create response
        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');
        $filename = 'attendance_import_template_' . date('Y-m-d') . '.xlsx';
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        
        $writer->save('php://output');
        exit;

    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Failed to generate template file: ' . $e->getMessage()
        ], 500);
    }
}
}