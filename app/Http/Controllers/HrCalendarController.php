<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Event;
use App\Models\Meeting;
use App\Models\Department;
use Illuminate\Support\Facades\Log;

class HrCalendarController extends Controller
{
    /**
     * Get combined calendar data (events and meetings)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getData(Request $request)
    {
        try {
            // Get filters from request
            $search = $request->input('search', '');
            $department = $request->input('department', '');
            $status = $request->input('status', '');
            
            // Get events filtered by the search parameters
            $events = Event::query()
                ->when($search, function ($query) use ($search) {
                    return $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                })
                ->when($department, function ($query) use ($department) {
                    return $query->where('department', $department);
                })
                ->when($status, function ($query) use ($status) {
                    return $query->where('status', $status);
                })
                ->with('attendees')
                ->get();
            
            // Get meetings filtered by the search parameters
            $meetings = Meeting::query()
                ->when($search, function ($query) use ($search) {
                    return $query->where('title', 'like', "%{$search}%")
                        ->orWhere('agenda', 'like', "%{$search}%");
                })
                ->when($department, function ($query) use ($department) {
                    return $query->where('department', $department);
                })
                ->when($status, function ($query) use ($status) {
                    return $query->where('status', $status);
                })
                ->with('participants')
                ->get();
            
            // Format data for FullCalendar
            $calendarData = $this->formatCalendarData($events, $meetings);
            
            return response()->json([
                'events' => $events,
                'meetings' => $meetings,
                'calendarData' => $calendarData
            ]);
        } catch (\Exception $e) {
            Log::error('Error in HR Calendar getData: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load calendar data'], 500);
        }
    }
    
    /**
     * Get all departments for filtering
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDepartments()
    {
        try {
            // Get unique departments from events and meetings
            $departments = Department::where('active', true)->get();
            
            return response()->json($departments);
        } catch (\Exception $e) {
            Log::error('Error in HR Calendar getDepartments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to load departments'], 500);
        }
    }
    
    /**
     * Format events and meetings for FullCalendar
     *
     * @param $events
     * @param $meetings
     * @return array
     */
    private function formatCalendarData($events, $meetings)
    {
        $calendarData = [];
        
        // Format events
        foreach ($events as $event) {
            $calendarData[] = [
                'id' => 'event_' . $event->id, // Prefix to identify as event
                'title' => $event->title,
                'start' => $event->start_time,
                'end' => $event->end_time,
                'allDay' => $event->all_day ?? false,
                'extendedProps' => [
                    'type' => 'event',
                    'status' => $event->status,
                    'description' => $event->description,
                    'department' => $event->department,
                    'attendees_count' => $event->attendees->count()
                ]
            ];
        }
        
        // Format meetings
        foreach ($meetings as $meeting) {
            $calendarData[] = [
                'id' => 'meeting_' . $meeting->id, // Prefix to identify as meeting
                'title' => $meeting->title,
                'start' => $meeting->start_time,
                'end' => $meeting->end_time,
                'allDay' => $meeting->all_day ?? false,
                'extendedProps' => [
                    'type' => 'meeting',
                    'status' => $meeting->status,
                    'agenda' => $meeting->agenda,
                    'department' => $meeting->department,
                    'participants_count' => $meeting->participants->count()
                ]
            ];
        }
        
        return $calendarData;
    }
}