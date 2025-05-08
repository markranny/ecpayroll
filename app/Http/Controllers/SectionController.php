<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Line;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SectionController extends Controller
{
    /**
     * Display a listing of the sections.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Section::with(['line', 'line.department']);
        
        // Search filter
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhereHas('line', function($lq) use ($search) {
                      $lq->where('name', 'like', "%{$search}%")
                        ->orWhereHas('department', function($dq) use ($search) {
                            $dq->where('name', 'like', "%{$search}%");
                        });
                  });
            });
        }
        
        // Line filter
        if ($request->has('line_id') && !empty($request->line_id)) {
            $query->where('line_id', $request->line_id);
        }
        
        // Department filter (indirectly through lines)
        if ($request->has('department_id') && !empty($request->department_id)) {
            $query->whereHas('line', function($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }
        
        // Active filter
        if ($request->has('active')) {
            $query->where('is_active', $request->active == 'true' ? 1 : 0);
        }
        
        // Sort by name by default
        $sections = $query->orderBy('name')->get();
        
        return response()->json([
            'data' => $sections
        ]);
    }
    
    /**
     * Store a newly created section.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:sections',
            'line_id' => 'required|exists:lines,id',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Verify the line is active
        $line = Line::findOrFail($request->line_id);
        if (!$line->is_active) {
            return response()->json([
                'message' => 'Cannot create section in an inactive line'
            ], 422);
        }
        
        $section = new Section();
        $section->name = $request->name;
        $section->code = $request->code;
        $section->line_id = $request->line_id;
        $section->is_active = true;
        $section->created_by = Auth::id();
        $section->save();
        
        // Load the relations for the response
        $section->load(['line', 'line.department']);
        
        return response()->json($section, 201);
    }
    
    /**
     * Update the specified section.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $section = Section::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:sections,code,' . $id,
            'line_id' => 'required|exists:lines,id',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Verify the line is active
        $line = Line::findOrFail($request->line_id);
        if (!$line->is_active) {
            return response()->json([
                'message' => 'Cannot move section to an inactive line'
            ], 422);
        }
        
        $section->name = $request->name;
        $section->code = $request->code;
        $section->line_id = $request->line_id;
        $section->updated_by = Auth::id();
        $section->save();
        
        // Load the relations for the response
        $section->load(['line', 'line.department']);
        
        return response()->json($section);
    }
    
    /**
     * Remove the specified section.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $section = Section::findOrFail($id);
        
        // Check if there are employees assigned to this section
        // This check will need to be adjusted based on how your employees are linked to sections
        // This is just a placeholder example
        /*
        if ($section->employees()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete section with associated employees. Reassign employees first.'
            ], 409);
        }
        */
        
        $section->delete();
        
        return response()->json(null, 204);
    }
    
    /**
     * Toggle section active status.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleActive($id)
    {
        $section = Section::findOrFail($id);
        $section->is_active = !$section->is_active;
        $section->updated_by = Auth::id();
        $section->save();
        
        return response()->json([
            'message' => 'Section status updated successfully',
            'is_active' => $section->is_active
        ]);
    }
}