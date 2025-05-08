<?php

namespace App\Http\Controllers;

use App\Models\Resignation;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ResignationController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Resignations', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Resignation::with(['employee', 'approver']);

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
            $query->whereDate('resignation_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('resignation_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
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
            $query->orderBy('resignation_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'notice_date' => 'required|date',
            'resignation_date' => 'required|date|after_or_equal:notice_date',
            'reason' => 'required|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('resignations', 'public');
            $validated['document_path'] = $path;
        }

        $resignation = Resignation::create($validated);
        
        return response()->json($resignation, 201);
    }

    public function update(Request $request, $id)
    {
        $resignation = Resignation::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'notice_date' => 'required|date',
            'resignation_date' => 'required|date|after_or_equal:notice_date',
            'reason' => 'required|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            // Delete old document if exists
            if ($resignation->document_path) {
                Storage::disk('public')->delete($resignation->document_path);
            }
            
            $path = $request->file('document')->store('resignations', 'public');
            $validated['document_path'] = $path;
        }

        $resignation->update($validated);
        
        return response()->json($resignation, 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $resignation = Resignation::findOrFail($id);
        
        $resignation->status = $validated['status'];
        $resignation->remarks = $validated['remarks'] ?? $resignation->remarks;
        
        if ($validated['status'] !== 'pending') {
            $resignation->approved_by = Auth::id();
            $resignation->approved_at = now();
        }
        
        $resignation->save();
        
        // Update employee's status if approved
        if ($validated['status'] === 'approved') {
            $employee = Employee::findOrFail($resignation->employee_id);
            $employee->JobStatus = 'Inactive';
            $employee->EndOfContract = $resignation->resignation_date;
            $employee->save();
        }
        
        return response()->json($resignation, 200);
    }

    public function destroy($id)
    {
        $resignation = Resignation::findOrFail($id);
        
        // Delete document if exists
        if ($resignation->document_path) {
            Storage::disk('public')->delete($resignation->document_path);
        }
        
        $resignation->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting resignations
    }
}