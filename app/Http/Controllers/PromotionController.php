<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PromotionController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Promotion', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Promotion::with(['employee', 'approver']);

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('promotion_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('promotion_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('Fname', 'like', "%{$search}%")
                  ->orWhere('Lname', 'like', "%{$search}%")
                  ->orWhere('idno', 'like', "%{$search}%");
            })
            ->orWhere('promotion_title', 'like', "%{$search}%")
            ->orWhere('previous_position', 'like', "%{$search}%")
            ->orWhere('new_position', 'like', "%{$search}%");
        }

        // Sorting
        if ($request->has('sort') && $request->sort) {
            $direction = $request->has('direction') && $request->direction === 'desc' ? 'desc' : 'asc';
            $query->orderBy($request->sort, $direction);
        } else {
            $query->orderBy('promotion_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'promotion_title' => 'required|string|max:255',
            'previous_position' => 'required|string|max:255',
            'new_position' => 'required|string|max:255',
            'previous_salary' => 'nullable|numeric|min:0',
            'new_salary' => 'nullable|numeric|min:0',
            'promotion_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $promotion = Promotion::create($validated);
        
        return response()->json($promotion, 201);
    }

    public function update(Request $request, $id)
    {
        $promotion = Promotion::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'promotion_title' => 'required|string|max:255',
            'previous_position' => 'required|string|max:255',
            'new_position' => 'required|string|max:255',
            'previous_salary' => 'nullable|numeric|min:0',
            'new_salary' => 'nullable|numeric|min:0',
            'promotion_date' => 'required|date',
            'description' => 'nullable|string',
        ]);

        $promotion->update($validated);
        
        return response()->json($promotion, 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $promotion = Promotion::findOrFail($id);
        
        $promotion->status = $validated['status'];
        $promotion->remarks = $validated['remarks'] ?? $promotion->remarks;
        
        if ($validated['status'] !== 'pending') {
            $promotion->approved_by = Auth::id();
            $promotion->approved_at = now();
        }
        
        $promotion->save();
        
        // Update employee's position if approved
        if ($validated['status'] === 'approved') {
            $employee = Employee::findOrFail($promotion->employee_id);
            $employee->Jobtitle = $promotion->new_position;
            
            // Update salary if provided
            if ($promotion->new_salary) {
                $employee->payrate = $promotion->new_salary;
            }
            
            $employee->save();
        }
        
        return response()->json($promotion, 200);
    }

    public function destroy($id)
    {
        $promotion = Promotion::findOrFail($id);
        $promotion->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting promotions
        // This would typically involve generating a CSV or Excel file
    }
}