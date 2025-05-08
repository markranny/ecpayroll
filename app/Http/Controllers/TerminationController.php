<?php

namespace App\Http\Controllers;

use App\Models\Termination;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TerminationController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Termination', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Termination::with(['employee', 'approver']);

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by termination type
        if ($request->has('termination_type') && $request->termination_type) {
            $query->where('termination_type', $request->termination_type);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('termination_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('termination_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('termination_type', 'like', "%{$search}%")
                ->orWhere('reason', 'like', "%{$search}%")
                ->orWhereHas('employee', function($q) use ($search) {
                    $q->where('Fname', 'like', "%{$search}%")
                      ->orWhere('Lname', 'like', "%{$search}%")
                      ->orWhere('idno', 'like', "%{$search}%");
                });
        }

        // Sorting
        if ($request->has('sort') && $request->sort) {
            $direction = $request->has('direction') && $request->direction === 'desc' ? 'desc' : 'asc';
            $query->orderBy($request->sort, $direction);
        } else {
            $query->orderBy('termination_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'termination_type' => 'required|string|max:255',
            'notice_date' => 'required|date',
            'termination_date' => 'required|date|after_or_equal:notice_date',
            'reason' => 'required|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('terminations', 'public');
            $validated['document_path'] = $path;
        }

        $termination = Termination::create($validated);
        
        return response()->json($termination, 201);
    }

    public function update(Request $request, $id)
    {
        $termination = Termination::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'termination_type' => 'required|string|max:255',
            'notice_date' => 'required|date',
            'termination_date' => 'required|date|after_or_equal:notice_date',
            'reason' => 'required|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            // Delete old document if exists
            if ($termination->document_path) {
                Storage::disk('public')->delete($termination->document_path);
            }
            
            $path = $request->file('document')->store('terminations', 'public');
            $validated['document_path'] = $path;
        }

        $termination->update($validated);
        
        return response()->json($termination, 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $termination = Termination::findOrFail($id);
        
        $termination->status = $validated['status'];
        $termination->remarks = $validated['remarks'] ?? $termination->remarks;
        
        if ($validated['status'] !== 'pending') {
            $termination->approved_by = Auth::id();
            $termination->approved_at = now();
        }
        
        $termination->save();
        
        // Update employee's status if approved
        if ($validated['status'] === 'approved') {
            $employee = Employee::findOrFail($termination->employee_id);
            $employee->JobStatus = 'Terminated';
            $employee->EndOfContract = $termination->termination_date;
            $employee->save();
        }
        
        return response()->json($termination, 200);
    }

    public function destroy($id)
    {
        $termination = Termination::findOrFail($id);
        
        // Delete document if exists
        if ($termination->document_path) {
            Storage::disk('public')->delete($termination->document_path);
        }
        
        $termination->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting terminations
    }
}