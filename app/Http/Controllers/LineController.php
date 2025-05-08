<?php

namespace App\Http\Controllers;

use App\Models\Line;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class LineController extends Controller
{
    /**
     * Display a listing of the lines.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Line::with('department');
        
        // Search filter
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhereHas('department', function($dq) use ($search) {
                      $dq->where('name', 'like', "%{$search}%");
                  });
            });
        }
        
        // Department filter
        if ($request->has('department_id') && !empty($request->department_id)) {
            $query->where('department_id', $request->department_id);
        }
        
        // Active filter
        if ($request->has('active')) {
            $query->where('is_active', $request->active == 'true' ? 1 : 0);
        }
        
        // Sort by name by default
        $lines = $query->orderBy('name')->get();
        
        return response()->json([
            'data' => $lines
        ]);
    }
    
    /**
     * Store a newly created line.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:lines',
            'department_id' => 'required|exists:departments,id',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Verify the department is active
        $department = Department::findOrFail($request->department_id);
        if (!$department->is_active) {
            return response()->json([
                'message' => 'Cannot create line in an inactive department'
            ], 422);
        }
        
        $line = new Line();
        $line->name = $request->name;
        $line->code = $request->code;
        $line->department_id = $request->department_id;
        $line->is_active = true;
        $line->created_by = Auth::id();
        $line->save();
        
        // Load the department relation for the response
        $line->load('department');
        
        return response()->json($line, 201);
    }
    
    /**
     * Update the specified line.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $line = Line::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:lines,code,' . $id,
            'department_id' => 'required|exists:departments,id',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Verify the department is active
        $department = Department::findOrFail($request->department_id);
        if (!$department->is_active) {
            return response()->json([
                'message' => 'Cannot move line to an inactive department'
            ], 422);
        }
        
        $line->name = $request->name;
        $line->code = $request->code;
        $line->department_id = $request->department_id;
        $line->updated_by = Auth::id();
        $line->save();
        
        // Load the department relation for the response
        $line->load('department');
        
        return response()->json($line);
    }
    
    /**
     * Remove the specified line.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $line = Line::findOrFail($id);
        
        // Check if line has sections
        if ($line->sections()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete line with associated sections. Delete sections first.'
            ], 409);
        }
        
        $line->delete();
        
        return response()->json(null, 204);
    }
    
    /**
     * Toggle line active status.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleActive($id)
    {
        $line = Line::findOrFail($id);
        $line->is_active = !$line->is_active;
        $line->updated_by = Auth::id();
        $line->save();
        
        return response()->json([
            'message' => 'Line status updated successfully',
            'is_active' => $line->is_active
        ]);
    }
}