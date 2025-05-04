<?php

namespace App\Http\Controllers;

use App\Models\Benefit;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BenefitController extends Controller
{
    /**
     * Display the benefits page with employee benefits data.
     */
    public function index(Request $request)
    {
        $cutoff = $request->input('cutoff', '1st');
        $month = $request->input('month', Carbon::now()->month);
        $year = $request->input('year', Carbon::now()->year);
        $search = $request->input('search', '');
        $perPage = $request->input('perPage', 50); // Default to 50 for virtualization
        
        // Build date range for selected month and cutoff
        $startDate = Carbon::createFromDate($year, $month, $cutoff === '1st' ? 1 : 16);
        $endDate = $cutoff === '1st' 
            ? Carbon::createFromDate($year, $month, 15)
            : Carbon::createFromDate($year, $month)->endOfMonth();
        
        // Query to get employees with benefits for the selected period
        $query = Employee::with(['benefits' => function ($query) use ($cutoff, $startDate, $endDate) {
                $query->where('cutoff', $cutoff)
                    ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                    ->latest('date');
            }])
            ->where('JobStatus', 'Active')
            ->select('id', 'idno', 'Lname', 'Fname', 'MName', 'Suffix', 'Department', 'JobStatus');
            
        // Apply search term if provided
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('Lname', 'like', "%{$search}%")
                  ->orWhere('Fname', 'like', "%{$search}%")
                  ->orWhere('idno', 'like', "%{$search}%")
                  ->orWhere('Department', 'like', "%{$search}%");
            });
        }
            
        // Get employees with pagination
        $employees = $query->paginate($perPage);
        
        // Get total count for various statuses
        $allBenefitsCount = Benefit::whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('cutoff', $cutoff)
            ->count();
        
        $postedBenefitsCount = Benefit::whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->where('cutoff', $cutoff)
            ->where('is_posted', true)
            ->count();
        
        // Return Inertia view with data
        return Inertia::render('Benefits/BenefitsPage', [
            'employees' => $employees,
            'cutoff' => $cutoff,
            'month' => $month,
            'year' => $year,
            'search' => $search,
            'status' => [
                'allCount' => $allBenefitsCount,
                'postedCount' => $postedBenefitsCount,
                'pendingCount' => $allBenefitsCount - $postedBenefitsCount,
            ],
            'dateRange' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }

    /**
     * Store a newly created or update existing benefit in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'mf_shares' => 'nullable|numeric|min:0',
            'mf_loan' => 'nullable|numeric|min:0',
            'sss_loan' => 'nullable|numeric|min:0',
            'hmdf_loan' => 'nullable|numeric|min:0',
            'hmdf_prem' => 'nullable|numeric|min:0',
            'sss_prem' => 'nullable|numeric|min:0',
            'philhealth' => 'nullable|numeric|min:0',
            'cutoff' => 'required|in:1st,2nd',
            'date' => 'required|date',
            'is_default' => 'nullable|boolean',
        ]);
        
        // Check if the benefit is already posted
        if ($request->has('id')) {
            $existingBenefit = Benefit::find($request->input('id'));
            if ($existingBenefit && $existingBenefit->is_posted) {
                throw ValidationException::withMessages([
                    'general' => ['This benefit has been posted and cannot be updated.'],
                ]);
            }
        }
        
        // Set default values for null numeric fields
        foreach (['mf_shares', 'mf_loan', 'sss_loan', 
                 'hmdf_loan', 'hmdf_prem', 'sss_prem', 'philhealth'] as $field) {
            $validated[$field] = $validated[$field] ?? 0;
        }
        
        // Create or update the benefit
        if ($request->has('id')) {
            $benefit = Benefit::findOrFail($request->input('id'));
            $benefit->update($validated);
        } else {
            $benefit = Benefit::create($validated);
        }
        
        // Return the updated benefit
        return response()->json($benefit);
    }

    /**
     * Update the specified benefit in storage.
     */
    public function update(Request $request, $id)
    {
        $benefit = Benefit::findOrFail($id);
        
        // Check if the benefit is already posted
        if ($benefit->is_posted) {
            throw ValidationException::withMessages([
                'general' => ['This benefit has been posted and cannot be updated.'],
            ]);
        }
        
        $validated = $request->validate([
            'mf_shares' => 'nullable|numeric|min:0',
            'mf_loan' => 'nullable|numeric|min:0',
            'sss_loan' => 'nullable|numeric|min:0',
            'hmdf_loan' => 'nullable|numeric|min:0',
            'hmdf_prem' => 'nullable|numeric|min:0',
            'sss_prem' => 'nullable|numeric|min:0',
            'philhealth' => 'nullable|numeric|min:0',
        ]);
        
        // Set default values for null numeric fields
        foreach (['mf_shares', 'mf_loan', 'sss_loan', 
                 'hmdf_loan', 'hmdf_prem', 'sss_prem', 'philhealth'] as $field) {
            $validated[$field] = $validated[$field] ?? 0;
        }
        
        // Update the benefit
        $benefit->update($validated);
        
        // Return the updated benefit
        return response()->json($benefit);
    }

    /**
     * Update a single field in a benefit record
     */
    public function updateField(Request $request, $id)
    {
        $benefit = Benefit::findOrFail($id);
        
        // Check if the benefit is already posted
        if ($benefit->is_posted) {
            throw ValidationException::withMessages([
                'general' => ['This benefit has been posted and cannot be updated.'],
            ]);
        }
        
        $field = $request->input('field');
        $value = $request->input('value');
        
        // Validate that the field exists
        $allowedFields = [
            'mf_shares', 'mf_loan', 'sss_loan', 'hmdf_loan', 
            'hmdf_prem', 'sss_prem', 'philhealth'
        ];
        
        if (!in_array($field, $allowedFields)) {
            throw ValidationException::withMessages([
                'field' => ['Invalid field specified.'],
            ]);
        }
        
        // Validate the value
        $request->validate([
            'value' => 'nullable|numeric|min:0',
        ]);
        
        // Update the field
        $benefit->$field = $value ?? 0;
        $benefit->save();
        
        // Return the updated benefit
        return response()->json($benefit);
    }

    /**
     * Mark benefit as posted.
     */
    public function postBenefit($id)
    {
        $benefit = Benefit::findOrFail($id);
        
        // Check if already posted
        if ($benefit->is_posted) {
            throw ValidationException::withMessages([
                'general' => ['This benefit is already posted.'],
            ]);
        }
        
        // Post the benefit
        $benefit->is_posted = true;
        $benefit->date_posted = Carbon::now();
        $benefit->save();
        
        return response()->json($benefit);
    }

    /**
     * Post all benefits for a specific cutoff period.
     * FIXED: Removed any conditions that might prevent posting all benefits
     */
    public function postAll(Request $request)
    {
        $cutoff = $request->input('cutoff', '1st');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        
        if (!$startDate || !$endDate) {
            throw ValidationException::withMessages([
                'date' => ['Start date and end date are required.'],
            ]);
        }
        
        // Post all unposted benefits for the specified period without additional conditions
        $updatedCount = Benefit::whereBetween('date', [$startDate, $endDate])
            ->where('cutoff', $cutoff)
            ->where('is_posted', false)
            ->update([
                'is_posted' => true, 
                'date_posted' => Carbon::now()
            ]);
        
        return response()->json([
            'message' => "{$updatedCount} benefits have been successfully posted.",
            'updated_count' => $updatedCount
        ]);
    }

    /**
     * Post multiple benefits in bulk
     */
    public function bulkPost(Request $request)
    {
        $benefitIds = $request->input('benefit_ids', []);
        
        if (empty($benefitIds)) {
            throw ValidationException::withMessages([
                'benefit_ids' => ['No benefits selected for posting.'],
            ]);
        }
        
        // Begin transaction
        DB::beginTransaction();
        
        try {
            $postedCount = 0;
            $now = Carbon::now();
            
            foreach ($benefitIds as $id) {
                $benefit = Benefit::find($id);
                
                if ($benefit && !$benefit->is_posted) {
                    $benefit->is_posted = true;
                    $benefit->date_posted = $now;
                    $benefit->save();
                    $postedCount++;
                }
            }
            
            DB::commit();
            
            return response()->json([
                'message' => "{$postedCount} benefits have been successfully posted.",
                'posted_count' => $postedCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            throw ValidationException::withMessages([
                'general' => ['Failed to post benefits: ' . $e->getMessage()],
            ]);
        }
    }

    /**
     * Mark a benefit as default for an employee.
     * FIXED: Improved to ensure proper setting of default benefits
     */
    public function setDefault(Request $request, $id)
    {
        $benefit = Benefit::findOrFail($id);
        
        // Begin transaction to ensure atomicity
        DB::beginTransaction();
        
        try {
            // Remove other default benefits for this employee
            Benefit::where('employee_id', $benefit->employee_id)
                ->where('is_default', true)
                ->update(['is_default' => false]);
            
            // Set this benefit as default
            $benefit->is_default = true;
            $benefit->save();
            
            DB::commit();
            
            return response()->json($benefit);
        } catch (\Exception $e) {
            DB::rollBack();
            
            throw ValidationException::withMessages([
                'general' => ['Failed to set default benefit: ' . $e->getMessage()],
            ]);
        }
    }

    /**
     * Set multiple benefits as default in bulk
     * FIXED: Improved to ensure proper bulk setting of defaults
     */
    public function bulkSetDefault(Request $request)
    {
        $benefitIds = $request->input('benefit_ids', []);
        
        if (empty($benefitIds)) {
            throw ValidationException::withMessages([
                'benefit_ids' => ['No benefits selected to set as default.'],
            ]);
        }
        
        // Begin transaction
        DB::beginTransaction();
        
        try {
            $updatedCount = 0;
            
            // Group benefits by employee_id
            $benefits = Benefit::whereIn('id', $benefitIds)->get();
            $employeeIds = $benefits->pluck('employee_id')->unique();
            
            // For each employee, clear existing defaults
            foreach ($employeeIds as $employeeId) {
                Benefit::where('employee_id', $employeeId)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
                
                // Find the benefit for this employee from our selection
                $benefitForEmployee = $benefits->firstWhere('employee_id', $employeeId);
                
                if ($benefitForEmployee) {
                    $benefitForEmployee->is_default = true;
                    $benefitForEmployee->save();
                    $updatedCount++;
                }
            }
            
            DB::commit();
            
            return response()->json([
                'message' => "{$updatedCount} benefits have been set as default.",
                'updated_count' => $updatedCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            throw ValidationException::withMessages([
                'general' => ['Failed to set default benefits: ' . $e->getMessage()],
            ]);
        }
    }

    /**
     * Create a new benefit entry based on defaults.
     * FIXED: Improved to ensure proper creation from defaults
     */
    public function createFromDefault(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'cutoff' => 'required|in:1st,2nd',
            'date' => 'required|date',
        ]);
        
        // Begin transaction
        DB::beginTransaction();
        
        try {
            // Check if benefit already exists for this cutoff and date
            $existingBenefit = Benefit::where('employee_id', $validated['employee_id'])
                ->where('cutoff', $validated['cutoff'])
                ->where('date', $validated['date'])
                ->first();
                
            if ($existingBenefit) {
                DB::commit();
                return response()->json($existingBenefit);
            }
            
            // Get the default benefit for this employee
            $defaultBenefit = Benefit::where('employee_id', $validated['employee_id'])
                ->where('is_default', true)
                ->latest()
                ->first();
                
            if ($defaultBenefit) {
                // Create new benefit based on default values
                $benefit = new Benefit();
                $benefit->employee_id = $validated['employee_id'];
                $benefit->cutoff = $validated['cutoff'];
                $benefit->date = $validated['date'];
                $benefit->is_posted = false;
                $benefit->is_default = false;
                
                // Copy values from default benefit
                $benefit->mf_shares = $defaultBenefit->mf_shares;
                $benefit->mf_loan = $defaultBenefit->mf_loan;
                $benefit->sss_loan = $defaultBenefit->sss_loan;
                $benefit->hmdf_loan = $defaultBenefit->hmdf_loan;
                $benefit->hmdf_prem = $defaultBenefit->hmdf_prem;
                $benefit->sss_prem = $defaultBenefit->sss_prem;
                $benefit->philhealth = $defaultBenefit->philhealth;
                
                $benefit->save();
            } else {
                // If no default benefit exists, create an empty one
                $benefit = Benefit::create([
                    'employee_id' => $validated['employee_id'],
                    'cutoff' => $validated['cutoff'],
                    'date' => $validated['date'],
                    'is_posted' => false,
                    'is_default' => false
                ]);
            }
            
            DB::commit();
            return response()->json($benefit);
        } catch (\Exception $e) {
            DB::rollBack();
            
            throw ValidationException::withMessages([
                'general' => ['Failed to create benefit: ' . $e->getMessage()],
            ]);
        }
    }

    /**
     * Bulk create benefit entries for all active employees based on defaults.
     * FIXED: Improved to ensure proper bulk creation from defaults
     */
    public function bulkCreateFromDefault(Request $request)
    {
        $validated = $request->validate([
            'cutoff' => 'required|in:1st,2nd',
            'date' => 'required|date',
        ]);
        
        $cutoff = $validated['cutoff'];
        $date = $validated['date'];
        
        // Get all active employees
        $employees = Employee::where('JobStatus', 'Active')->get();
        $createdCount = 0;
        
        // Start transaction
        DB::beginTransaction();
        
        try {
            foreach ($employees as $employee) {
                // Check if a benefit already exists for this employee, cutoff, and date
                $existingBenefit = Benefit::where('employee_id', $employee->id)
                    ->where('cutoff', $cutoff)
                    ->where('date', $date)
                    ->first();
                
                if (!$existingBenefit) {
                    // Get default benefit for this employee
                    $defaultBenefit = Benefit::where('employee_id', $employee->id)
                        ->where('is_default', true)
                        ->latest()
                        ->first();
                    
                    if ($defaultBenefit) {
                        // Create new benefit based on default values
                        $benefit = new Benefit();
                        $benefit->employee_id = $employee->id;
                        $benefit->cutoff = $cutoff;
                        $benefit->date = $date;
                        $benefit->is_posted = false;
                        $benefit->is_default = false;
                        
                        // Copy values from default benefit
                        $benefit->mf_shares = $defaultBenefit->mf_shares;
                        $benefit->mf_loan = $defaultBenefit->mf_loan;
                        $benefit->sss_loan = $defaultBenefit->sss_loan;
                        $benefit->hmdf_loan = $defaultBenefit->hmdf_loan;
                        $benefit->hmdf_prem = $defaultBenefit->hmdf_prem;
                        $benefit->sss_prem = $defaultBenefit->sss_prem;
                        $benefit->philhealth = $defaultBenefit->philhealth;
                        
                        $benefit->save();
                    } else {
                        // If no default exists, create an empty benefit
                        $benefit = Benefit::create([
                            'employee_id' => $employee->id,
                            'cutoff' => $cutoff,
                            'date' => $date,
                            'is_posted' => false,
                            'is_default' => false
                        ]);
                    }
                    
                    $createdCount++;
                }
            }
            
            DB::commit();
            
            return response()->json([
                'message' => "Created {$createdCount} new benefit entries.",
                'created_count' => $createdCount
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            throw ValidationException::withMessages([
                'general' => ['Failed to create benefit entries: ' . $e->getMessage()],
            ]);
        }
    }
    
    public function getEmployeeDefaults(Request $request)
{
    try {
        $search = $request->input('search', '');
        $perPage = $request->input('perPage', 50);
        
        $query = Employee::with(['benefits' => function ($query) {
            $query->where('is_default', true)->latest();
        }])
        ->where('JobStatus', 'Active')
        ->select('id', 'idno', 'Lname', 'Fname', 'MName', 'Suffix', 'Department');
        
        // Apply search if provided
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('Lname', 'like', "%{$search}%")
                  ->orWhere('Fname', 'like', "%{$search}%")
                  ->orWhere('idno', 'like', "%{$search}%")
                  ->orWhere('Department', 'like', "%{$search}%");
            });
        }
        
        // Get employees with pagination
        $employees = $query->paginate($perPage);
        
        // Return JSON response for API requests
        return response()->json($employees);
    } catch (\Exception $e) {
        // Return error response
        return response()->json([
            'error' => 'Failed to retrieve employee defaults',
            'message' => $e->getMessage()
        ], 500);
    }
}
    
public function showEmployeeDefaultsPage()
{
    return Inertia::render('Benefits/EmployeeDefaultsPage', [
        'auth' => [
            'user' => Auth::user(),
        ],
    ]);
}
}