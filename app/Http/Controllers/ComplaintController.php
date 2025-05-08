<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ComplaintController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Complaints', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Complaint::with(['employee', 'complainant', 'assignedTo']);

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by complainant
        if ($request->has('complainant_id') && $request->complainant_id) {
            $query->where('complainant_id', $request->complainant_id);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('complaint_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('complaint_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('complaint_title', 'like', "%{$search}%")
                ->orWhere('complaint_description', 'like', "%{$search}%")
                ->orWhereHas('employee', function($q) use ($search) {
                    $q->where('Fname', 'like', "%{$search}%")
                      ->orWhere('Lname', 'like', "%{$search}%")
                      ->orWhere('idno', 'like', "%{$search}%");
                })
                ->orWhereHas('complainant', function($q) use ($search) {
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
            $query->orderBy('complaint_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'complainant_id' => 'required|exists:employees,id',
            'complaint_title' => 'required|string|max:255',
            'complaint_description' => 'required|string',
            'complaint_date' => 'required|date',
            'document' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('complaints', 'public');
            $validated['document_path'] = $path;
        }

        $complaint = Complaint::create($validated);
        
        return response()->json($complaint, 201);
    }

    public function update(Request $request, $id)
    {
        $complaint = Complaint::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'complainant_id' => 'required|exists:employees,id',
            'complaint_title' => 'required|string|max:255',
            'complaint_description' => 'required|string',
            'complaint_date' => 'required|date',
            'document' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            // Delete old document if exists
            if ($complaint->document_path) {
                Storage::disk('public')->delete($complaint->document_path);
            }
            
            $path = $request->file('document')->store('complaints', 'public');
            $validated['document_path'] = $path;
        }

        $complaint->update($validated);
        
        return response()->json($complaint, 200);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:open,investigation,resolved,closed',
            'assigned_to' => 'nullable|exists:users,id',
            'resolution' => 'nullable|string',
            'resolution_date' => 'nullable|date',
        ]);

        $complaint = Complaint::findOrFail($id);
        
        $complaint->status = $validated['status'];
        
        if (isset($validated['assigned_to'])) {
            $complaint->assigned_to = $validated['assigned_to'];
        }
        
        if (isset($validated['resolution'])) {
            $complaint->resolution = $validated['resolution'];
        }
        
        if (isset($validated['resolution_date'])) {
            $complaint->resolution_date = $validated['resolution_date'];
        }
        
        if ($validated['status'] === 'resolved' || $validated['status'] === 'closed') {
            if (!$complaint->resolution_date) {
                $complaint->resolution_date = now();
            }
        }
        
        $complaint->save();
        
        return response()->json($complaint, 200);
    }

    public function destroy($id)
    {
        $complaint = Complaint::findOrFail($id);
        
        // Delete document if exists
        if ($complaint->document_path) {
            Storage::disk('public')->delete($complaint->document_path);
        }
        
        $complaint->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting complaints
    }
}