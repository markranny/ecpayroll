<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class EmployeeController extends Controller
{
    /**
     * Display a listing of employees.
     */
    public function index(Request $request)
    {
        $status = $request->input('status', 'all');
        
        $query = Employee::query();
        
        // Filter by employee status
        if ($status !== 'all') {
            $query->where('JobStatus', $status);
        }
        
        $employees = $query->get();
        
        // If it's an AJAX or JSON request, return JSON response
        // Fix: Make sure to properly check if the request is actually expecting JSON
        if ($request->expectsJson()) {
            Log::info('Returning employee list as JSON', [
                'count' => $employees->count(),
                'status' => $status
            ]);
            
            return response()->json([
                'data' => $employees
            ]);
        }
        
        // Otherwise, render the Inertia page
        // Fix: Make sure to properly share the data with Inertia
        return Inertia::render('Employee/EmployeePage', [
            'employees' => $employees,
            'currentStatus' => $status,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }
    
    /**
     * Store a newly created employee.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'idno' => 'nullable|unique:employees',
            'bid' => 'nullable|string',
            'Lname' => 'required|string',
            'Fname' => 'required|string',
            'MName' => 'nullable|string',
            'Suffix' => 'nullable|string',
            'Gender' => 'nullable|in:Male,Female',
            'EducationalAttainment' => 'nullable|string',
            'Degree' => 'nullable|string',
            'CivilStatus' => 'nullable|string',
            'Birthdate' => 'nullable|date',
            'ContactNo' => 'nullable|string',
            'Email' => 'required|email|unique:employees',
            'PresentAddress' => 'nullable|string',
            'PermanentAddress' => 'nullable|string',
            'EmerContactName' => 'nullable|string',
            'EmerContactNo' => 'nullable|string',
            'EmerRelationship' => 'nullable|string',
            'EmpStatus' => 'nullable|string',
            'JobStatus' => 'nullable|string',
            'RankFile' => 'nullable|string',
            'Department' => 'required|string',
            'Line' => 'nullable|string',
            'Jobtitle' => 'required|string',
            'HiredDate' => 'nullable|date',
            'EndOfContract' => 'nullable|date',
            'pay_type' => 'nullable|string',
            'payrate' => 'nullable|numeric|between:0,999999.99',
            'pay_allowance' => 'nullable|numeric|between:0,999999.99',
            'SSSNO' => 'nullable|string',
            'PHILHEALTHNo' => 'nullable|string',
            'HDMFNo' => 'nullable|string',
            'TaxNo' => 'nullable|string',
            'Taxable' => 'nullable|boolean',
            'CostCenter' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // Fix: Changed from Employees to Employee
        Employee::create($request->all());

        // Fix: Check if the request expects JSON and return appropriate response
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Employee created successfully'
            ]);
        }

        return redirect()->back()->with('message', 'Employee created successfully');
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'idno' => 'nullable|unique:employees,idno,' . $id,
            'bid' => 'nullable|string',
            'Lname' => 'required|string',
            'Fname' => 'required|string',
            'MName' => 'nullable|string',
            'Suffix' => 'nullable|string',
            'Gender' => 'nullable|in:Male,Female',
            'EducationalAttainment' => 'nullable|string',
            'Degree' => 'nullable|string',
            'CivilStatus' => 'nullable|string',
            'Birthdate' => 'nullable|date',
            'ContactNo' => 'nullable|string',
            'Email' => 'required|email|unique:employees,Email,' . $id,
            'PresentAddress' => 'nullable|string',
            'PermanentAddress' => 'nullable|string',
            'EmerContactName' => 'nullable|string',
            'EmerContactNo' => 'nullable|string',
            'EmerRelationship' => 'nullable|string',
            'EmpStatus' => 'nullable|string',
            'JobStatus' => 'nullable|string',
            'RankFile' => 'nullable|string',
            'Department' => 'required|string',
            'Line' => 'nullable|string',
            'Jobtitle' => 'required|string',
            'HiredDate' => 'nullable|date',
            'EndOfContract' => 'nullable|date',
            'pay_type' => 'nullable|string',
            'payrate' => 'nullable|numeric|between:0,999999.99',
            'pay_allowance' => 'nullable|numeric|between:0,999999.99',
            'SSSNO' => 'nullable|string',
            'PHILHEALTHNo' => 'nullable|string',
            'HDMFNo' => 'nullable|string',
            'TaxNo' => 'nullable|string',
            'Taxable' => 'nullable|boolean',
            'CostCenter' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            // Fix: Check if the request expects JSON and return appropriate response
            if ($request->expectsJson()) {
                return response()->json([
                    'errors' => $validator->errors()
                ], 422);
            }
            
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            $employee->update($request->all());
            
            // Fix: Check if the request expects JSON and return appropriate response
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Employee updated successfully'
                ]);
            }
            
            return redirect()->back()->with('message', 'Employee updated successfully');
        } catch (\Exception $e) {
            Log::error('Failed to update employee', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            // Fix: Check if the request expects JSON and return appropriate response
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to update employee: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->with('error', 'Failed to update employee: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified employee.
     */
    public function destroy($id)
    {
        try {
            $employee = Employee::findOrFail($id);
            $employee->delete();
            
            // Fix: Check if the request expects JSON and return appropriate response
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => 'Employee deleted successfully'
                ]);
            }
            
            return redirect()->route('employees.index')->with([
                'message' => 'Employee deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to delete employee', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            // Fix: Check if the request expects JSON and return appropriate response
            if (request()->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to delete employee: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->route('employees.index')->with('error', 'Failed to delete employee');
        }
    }
    
    public function markInactive($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->JobStatus = 'Inactive';
        $employee->save();
        
        // Fix: Check if the request expects JSON and return appropriate response
        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Employee marked as inactive.'
            ]);
        }
        
        return back()->with('message', 'Employee marked as inactive.');
    }

    public function markBlocked($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->JobStatus = 'Blocked';
        $employee->save();
        
        // Fix: Check if the request expects JSON and return appropriate response
        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Employee blocked successfully.'
            ]);
        }
        
        return back()->with('message', 'Employee blocked successfully.');
    }

    public function markActive($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->JobStatus = 'Active';
        $employee->save();
        
        // Fix: Check if the request expects JSON and return appropriate response
        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Employee activated successfully.'
            ]);
        }
        
        return back()->with('message', 'Employee activated successfully.');
    }

    /**
     * Show import page
     */
    public function showImportPage()
    {
        return Inertia::render('Employee/ImportEmployeesPage', [
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }
}