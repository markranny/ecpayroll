<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MeetingsController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status', 'all');
        
        $meetings = Meeting::query()
            ->when($status !== 'all', function ($query) use ($status) {
                return $query->where('status', $status);
            })
            ->with('participants') // Include participants data
            ->withCount('participants')
            ->orderBy('start_time', 'desc')
            ->get();

        $counts = [
            'total' => Meeting::count(),
            'scheduled' => Meeting::where('status', 'Scheduled')->count(),
            'completed' => Meeting::where('status', 'Completed')->count(),
            'cancelled' => Meeting::where('status', 'Cancelled')->count(),
            'postponed' => Meeting::where('status', 'Postponed')->count(),
        ];

        return Inertia::render('MeetingAndEvents/Meetings', [
            'meetings' => $meetings,
            'counts' => $counts,
            'currentStatus' => $status,
        ]);
    }

    /**
     * Get a list of meetings for API/AJAX requests
     */
    public function list(Request $request)
    {
        $status = $request->input('status', 'all');
        
        $meetings = Meeting::query()
            ->when($status !== 'all', function ($query) use ($status) {
                return $query->where('status', $status);
            })
            ->when($request->has('search') && !empty($request->input('search')), function ($query) use ($request) {
                $searchTerm = $request->input('search');
                return $query->where(function($q) use ($searchTerm) {
                    $q->where('title', 'like', "%{$searchTerm}%")
                      ->orWhere('location', 'like', "%{$searchTerm}%")
                      ->orWhere('organizer', 'like', "%{$searchTerm}%")
                      ->orWhere('department', 'like', "%{$searchTerm}%");
                });
            })
            ->with('participants')
            ->withCount('participants')
            ->orderBy('start_time', 'desc')
            ->get();
        
        return response()->json(['meetings' => $meetings]);
    }
    public function reschedule(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
        ]);
    
        if ($validator->fails()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'errors' => $validator->errors()
                ], 422);
            }
            
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }
    
        try {
            $meeting = Meeting::findOrFail($id);
            
            // Update the meeting's time and set status to Scheduled
            $meeting->update([
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'status' => 'Scheduled',
            ]);
            
            // TODO: Notify participants of the schedule change (optional)
            // You can add notification logic here if needed
            
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Meeting rescheduled successfully',
                    'meeting' => $meeting->fresh(['participants'])
                ]);
            }
            
            return redirect()->route('meetings.index')->with('message', 'Meeting rescheduled successfully');
            
        } catch (\Exception $e) {
            Log::error('Failed to reschedule meeting', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to reschedule meeting: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->with('error', 'Failed to reschedule meeting: ' . $e->getMessage())
                ->withInput();
        }
    }
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'agenda' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'location' => 'nullable|string|max:255',
            'organizer' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'required|in:Scheduled,Completed,Cancelled,Postponed',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|string|max:255',
            'meeting_link' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
        ]);

        $meeting = Meeting::create($validated);

        if (!empty($validated['participants'])) {
            $participants = [];
            foreach ($validated['participants'] as $participant) {
                $participants[$participant] = ['attendance_status' => 'Invited'];
            }
            $meeting->participants()->attach($participants);
        }

        return redirect()->route('meetings.index')->with('message', 'Meeting created successfully');
    }

    public function update(Request $request, $id)
    {
        $meeting = Meeting::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'agenda' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'location' => 'nullable|string|max:255',
            'organizer' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'required|in:Scheduled,Completed,Cancelled,Postponed',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|string|max:255',
            'meeting_link' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
        ]);

        $meeting->update($validated);

        if (isset($validated['participants'])) {
            $participants = [];
            foreach ($validated['participants'] as $participant) {
                $participants[$participant] = ['attendance_status' => 'Invited'];
            }
            $meeting->participants()->sync($participants);
        }

        return redirect()->route('meetings.index')->with('message', 'Meeting updated successfully');
    }

    public function destroy($id)
    {
        $meeting = Meeting::findOrFail($id);
        $meeting->delete();
        return redirect()->route('meetings.index')->with('message', 'Meeting deleted successfully');
    }

    public function markCompleted($id)
    {
        $meeting = Meeting::findOrFail($id);
        $meeting->update(['status' => 'Completed']);
        return redirect()->back()->with('message', 'Meeting marked as completed');
    }

    public function markCancelled($id)
    {
        $meeting = Meeting::findOrFail($id);
        $meeting->update(['status' => 'Cancelled']);
        return redirect()->back()->with('message', 'Meeting marked as cancelled');
    }

    public function markScheduled($id)
    {
        $meeting = Meeting::findOrFail($id);
        $meeting->update(['status' => 'Scheduled']);
        return redirect()->back()->with('message', 'Meeting marked as scheduled');
    }

    /**
     * Export meetings to Excel (placeholder method)
     */
    public function export(Request $request)
    {
        // Implement Excel export functionality
        return response()->json(['message' => 'Export functionality not implemented yet']);
    }
}