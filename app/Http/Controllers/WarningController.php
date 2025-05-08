<?php

namespace App\Http\Controllers;

use App\Models\Warning;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class WarningController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Warnings', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Warning::with(['employee', 'issuer']);

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by warning type
        if ($request->has('warning_type') && $request->warning_type) {
            $query->where('warning_type', $request->warning_type);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('warning_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('warning_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('subject', 'like', "%{$search}%")
                ->orWhere('warning_description', 'like', "%{$search}%")
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
            $query->orderBy('warning_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'warning_type' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'warning_description' => 'required|string',
            'warning_date' => 'required|date',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            $path = $request->file('document')->store('warnings', 'public');
            $validated['document_path'] = $path;
        }

        $validated['issued_by'] = Auth::id();

        $warning = Warning::create($validated);
        
        return response()->json($warning, 201);
    }

    public function update(Request $request, $id)
    {
        $warning = Warning::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'warning_type' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'warning_description' => 'required|string',
            'warning_date' => 'required|date',
            'acknowledgement_date' => 'nullable|date|after_or_equal:warning_date',
            'employee_response' => 'nullable|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        // Handle document upload
        if ($request->hasFile('document')) {
            // Delete old document if exists
            if ($warning->document_path) {
                Storage::disk('public')->delete($warning->document_path);
            }
            
            $path = $request->file('document')->store('warnings', 'public');
            $validated['document_path'] = $path;
        }

        $warning->update($validated);
        
        return response()->json($warning, 200);
    }

    public function destroy($id)
    {
        $warning = Warning::findOrFail($id);
        
        // Delete document if exists
        if ($warning->document_path) {
            Storage::disk('public')->delete($warning->document_path);
        }
        
        $warning->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting warnings
    }
}