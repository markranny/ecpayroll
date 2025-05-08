<?php

namespace App\Http\Controllers;

use App\Models\Transfer;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TransferController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Transfer', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Transfer::with(['employee', 'approver']);

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
            $query->whereDate('transfer_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('transfer_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('Fname', 'like', "%{$search}%")
                  ->orWhere('Lname', 'like', "%{$search}%")
                  ->orWhere('idno', 'like', "%{$search}%");
            })
            ->orWhere('from_department', 'like', "%{$search}%")
            ->orWhere('to_department', 'like', "%{$search}%");
        }

        // Sorting
        if ($request->has('sort') && $request->sort) {
            $direction = $request->has('direction') && $request->direction === 'desc' ? 'desc' : 'asc';
            $query->orderBy($request->sort, $direction);
        } else {
            $query->orderBy('transfer_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_department' => 'required|string|max:255',
            'to_department' => 'required|string|max:255',
            'from_line' => 'nullable|string|max:255',
            'to_line' => 'nullable|string|max:255',
            'transfer_date' => 'required|date',
            'reason' => 'required|string',
        ]);

        $transfer = Transfer::create($validated);
        
        return response()->json($transfer, 201);
    }

    public function update(Request $request, $id)
    {
        $transfer = Transfer::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_department' => 'required|string|max:255',
            'to_department' => 'required|string|max:255',
            'from_line' => 'nullable|string|max:255',
            'to_line' => 'nullable|string|max:255',
            'transfer_date' => 'required|date',
            'reason' => 'required|string',
        ]);

        $transfer->update($validated);
        
        return response()->json($transfer, 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'remarks' => 'nullable|string',
        ]);

        $transfer = Transfer::findOrFail($id);
        
        $transfer->status = $validated['status'];
        $transfer->remarks = $validated['remarks'] ?? $transfer->remarks;
        
        if ($validated['status'] !== 'pending') {
            $transfer->approved_by = Auth::id();
            $transfer->approved_at = now();
        }
        
        $transfer->save();
        
        // Update employee's department and line if approved
        if ($validated['status'] === 'approved') {
            $employee = Employee::findOrFail($transfer->employee_id);
            $employee->Department = $transfer->to_department;
            
            if ($transfer->to_line) {
                $employee->Line = $transfer->to_line;
            }
            
            $employee->save();
        }
        
        return response()->json($transfer, 200);
    }

    public function destroy($id)
    {
        $transfer = Transfer::findOrFail($id);
        $transfer->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting transfers
    }
}