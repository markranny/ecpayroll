<?php

namespace App\Http\Controllers;

use App\Models\Award;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class AwardController extends Controller
{
    public function index()
    {
        return Inertia::render('CoreHR/Award', [
            'auth' => [
                'user' => Auth::user()
            ]
        ]);
    }

    public function list(Request $request)
    {
        $query = Award::with(['employee', 'creator']);

        // Filter by employee
        if ($request->has('employee_id') && $request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        // Filter by award type
        if ($request->has('award_type') && $request->award_type) {
            $query->where('award_type', $request->award_type);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('award_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('award_date', '<=', $request->date_to);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('Fname', 'like', "%{$search}%")
                  ->orWhere('Lname', 'like', "%{$search}%")
                  ->orWhere('idno', 'like', "%{$search}%");
            })
            ->orWhere('award_name', 'like', "%{$search}%")
            ->orWhere('award_type', 'like', "%{$search}%");
        }

        // Sorting
        if ($request->has('sort') && $request->sort) {
            $direction = $request->has('direction') && $request->direction === 'desc' ? 'desc' : 'asc';
            $query->orderBy($request->sort, $direction);
        } else {
            $query->orderBy('award_date', 'desc');
        }

        return $query->paginate(10);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'award_name' => 'required|string|max:255',
            'award_type' => 'required|string|max:255',
            'gift' => 'nullable|string|max:255',
            'cash_price' => 'nullable|numeric|min:0',
            'award_date' => 'required|date',
            'description' => 'nullable|string',
            'photo' => 'nullable|image|max:2048', // max 2MB
        ]);

        // Handle photo upload
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('awards', 'public');
            $validated['photo_path'] = $path;
        }

        $validated['created_by'] = Auth::id();

        $award = Award::create($validated);
        
        return response()->json($award, 201);
    }

    public function update(Request $request, $id)
    {
        $award = Award::findOrFail($id);
        
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'award_name' => 'required|string|max:255',
            'award_type' => 'required|string|max:255',
            'gift' => 'nullable|string|max:255',
            'cash_price' => 'nullable|numeric|min:0',
            'award_date' => 'required|date',
            'description' => 'nullable|string',
            'photo' => 'nullable|image|max:2048', // max 2MB
        ]);

        // Handle photo upload
        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($award->photo_path) {
                Storage::disk('public')->delete($award->photo_path);
            }
            
            $path = $request->file('photo')->store('awards', 'public');
            $validated['photo_path'] = $path;
        }

        $award->update($validated);
        
        return response()->json($award, 200);
    }

    public function destroy($id)
    {
        $award = Award::findOrFail($id);
        
        // Delete photo if exists
        if ($award->photo_path) {
            Storage::disk('public')->delete($award->photo_path);
        }
        
        $award->delete();
        
        return response()->json(null, 204);
    }

    public function export(Request $request)
    {
        // Implementation for exporting awards
    }
}