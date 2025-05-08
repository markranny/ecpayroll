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
            Log::info('HR Calendar getData called', [
                'user_id' => auth()->id(),
                'user_email' => auth()->user()->email ?? 'unknown',
                'request_params' => $request->all()
            ]);

            // Get filters from request
            $search = $request->input('search', '');
            $department = $request->input('department', '');
            $status = $request->input('status', '');
            
            Log::debug('HR Calendar filters', [
                'search' => $search,
                'department' => $department,
                'status' => $status
            ]);
            
            // Get events filtered by the search parameters
            $eventsQuery = Event::query()
                ->when($search, function ($query) use ($search) {
                    Log::debug('Applying search filter to events', ['search' => $search]);
                    return $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                })
                ->when($department, function ($query) use ($department) {
                    Log::debug('Applying department filter to events', ['department' => $department]);
                    return $query->where('department', $department);
                })
                ->when($status, function ($query) use ($status) {
                    Log::debug('Applying status filter to events', ['status' => $status]);
                    return $query->where('status', $status);
                })
                ->with('attendees');
            
            $events = $eventsQuery->get();
            Log::info('Events retrieved', [
                'count' => $events->count(),
                'first_few_ids' => $events->take(5)->pluck('id')->toArray()
            ]);
            
            // Get meetings filtered by the search parameters
            $meetingsQuery = Meeting::query()
                ->when($search, function ($query) use ($search) {
                    Log::debug('Applying search filter to meetings', ['search' => $search]);
                    return $query->where('title', 'like', "%{$search}%")
                        ->orWhere('agenda', 'like', "%{$search}%");
                })
                ->when($department, function ($query) use ($department) {
                    Log::debug('Applying department filter to meetings', ['department' => $department]);
                    return $query->where('department', $department);
                })
                ->when($status, function ($query) use ($status) {
                    Log::debug('Applying status filter to meetings', ['status' => $status]);
                    return $query->where('status', $status);
                })
                ->with('participants');
            
            $meetings = $meetingsQuery->get();
            Log::info('Meetings retrieved', [
                'count' => $meetings->count(),
                'first_few_ids' => $meetings->take(5)->pluck('id')->toArray()
            ]);
            
            // Format data for FullCalendar
            $calendarData = $this->formatCalendarData($events, $meetings);
            Log::info('Calendar data formatted', [
                'total_calendar_items' => count($calendarData),
                'events_count' => $events->count(),
                'meetings_count' => $meetings->count()
            ]);
            
            $response = [
                'events' => $events,
                'meetings' => $meetings,
                'calendarData' => $calendarData
            ];
            
            Log::info('HR Calendar getData completed successfully', [
                'response_summary' => [
                    'events_count' => $events->count(),
                    'meetings_count' => $meetings->count(),
                    'calendar_items' => count($calendarData)
                ]
            ]);
            
            return response()->json($response);
            
        } catch (\Exception $e) {
            Log::error('Error in HR Calendar getData', [
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'request_params' => $request->all()
            ]);
            
            return response()->json([
                'error' => 'Failed to load calendar data',
                'message' => config('app.debug') ? $e->getMessage() : 'An unexpected error occurred'
            ], 500);
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
            Log::info('HR Calendar getDepartments called', [
                'user_id' => auth()->id(),
                'user_email' => auth()->user()->email ?? 'unknown'
            ]);
            
            $departmentsQuery = Department::where('is_active', true);
            
            // Log the SQL query for debugging
            Log::debug('Departments query SQL', [
                'sql' => $departmentsQuery->toSql(),
                'bindings' => $departmentsQuery->getBindings()
            ]);
            
            $departments = $departmentsQuery->get();
            
            Log::info('Departments retrieved', [
                'count' => $departments->count(),
                'department_names' => $departments->pluck('name')->toArray()
            ]);
            
            return response()->json($departments);
            
        } catch (\Exception $e) {
            Log::error('Error in HR Calendar getDepartments', [
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'error' => 'Failed to load departments',
                'message' => config('app.debug') ? $e->getMessage() : 'An unexpected error occurred'
            ], 500);
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
        Log::debug('Starting formatCalendarData', [
            'events_count' => $events->count(),
            'meetings_count' => $meetings->count()
        ]);
        
        $calendarData = [];
        
        // Format events
        foreach ($events as $event) {
            try {
                $formattedEvent = [
                    'id' => 'event_' . $event->id,
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
                
                $calendarData[] = $formattedEvent;
                
                Log::debug('Event formatted', [
                    'event_id' => $event->id,
                    'title' => $event->title,
                    'attendees_count' => $event->attendees->count()
                ]);
            } catch (\Exception $e) {
                Log::error('Error formatting event', [
                    'event_id' => $event->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        // Format meetings
        foreach ($meetings as $meeting) {
            try {
                $formattedMeeting = [
                    'id' => 'meeting_' . $meeting->id,
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
                
                $calendarData[] = $formattedMeeting;
                
                Log::debug('Meeting formatted', [
                    'meeting_id' => $meeting->id,
                    'title' => $meeting->title,
                    'participants_count' => $meeting->participants->count()
                ]);
            } catch (\Exception $e) {
                Log::error('Error formatting meeting', [
                    'meeting_id' => $meeting->id,
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        Log::debug('formatCalendarData completed', [
            'total_items' => count($calendarData)
        ]);
        
        return $calendarData;
    }
}