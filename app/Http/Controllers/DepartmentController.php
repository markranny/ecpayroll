<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    /**
     * Display a listing of the departments.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        try {
            $query = Department::query();
            
            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            
            // Active filter
            if ($request->has('active')) {
                $query->where('is_active', $request->active == 'true' ? 1 : 0);
            }
            
            // Sort by name by default
            $departments = $query->orderBy('name')->get();
            
            return response()->json([
                'data' => $departments
            ]);
        } catch (\Exception $e) {
            Log::error('Department index error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch departments',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Store a newly created department.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'required|string|max:20|unique:departments',
                'description' => 'nullable|string',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $department = new Department();
            $department->name = $request->name;
            $department->code = $request->code;
            $department->description = $request->description;
            $department->is_active = true;
            $department->created_by = Auth::id();
            $department->save();
            
            return response()->json($department, 201);
        } catch (\Exception $e) {
            Log::error('Department store error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Update the specified department.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        try {
            $department = Department::findOrFail($id);
            
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:100',
                'code' => 'required|string|max:20|unique:departments,code,' . $id,
                'description' => 'nullable|string',
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $department->name = $request->name;
            $department->code = $request->code;
            $department->description = $request->description;
            $department->updated_by = Auth::id();
            $department->save();
            
            return response()->json($department);
        } catch (\Exception $e) {
            Log::error('Department update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Remove the specified department.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        try {
            $department = Department::findOrFail($id);
            
            // Check if department has lines
            if ($department->lines()->count() > 0) {
                return response()->json([
                    'message' => 'Cannot delete department with associated lines. Delete lines first.'
                ], 409);
            }
            
            $department->delete();
            
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Department delete error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to delete department',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Toggle department active status.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggleActive($id)
    {
        try {
            $department = Department::findOrFail($id);
            $department->is_active = !$department->is_active;
            $department->updated_by = Auth::id();
            $department->save();
            
            return response()->json([
                'message' => 'Department status updated successfully',
                'is_active' => $department->is_active
            ]);
        } catch (\Exception $e) {
            Log::error('Department toggle active error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update department status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}