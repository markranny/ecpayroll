<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;

class EventsController extends Controller
{
    /**
     * Display a listing of events
     */
    public function index(Request $request)
    {
        $status = $request->input('status', 'all');
        
        $query = Event::with(['attendees']);
        
        // Filter by event status
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        
        // Filter by search term
        if ($request->has('search') && !empty($request->input('search'))) {
            $searchTerm = $request->input('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('description', 'like', "%{$searchTerm}%")
                  ->orWhere('location', 'like', "%{$searchTerm}%")
                  ->orWhere('organizer', 'like', "%{$searchTerm}%")
                  ->orWhere('department', 'like', "%{$searchTerm}%");
            });
        }
        
        // Filter by date range
        if ($request->has('from_date') && !empty($request->input('from_date'))) {
            $query->whereDate('start_time', '>=', $request->input('from_date'));
        }
        
        if ($request->has('to_date') && !empty($request->input('to_date'))) {
            $query->whereDate('start_time', '<=', $request->input('to_date'));
        }
        
        // Order by start time (newest first)
        $query->orderBy('start_time', 'desc');
        
        $events = $query->get();
        
        // Calculate attendee counts for each event
        $events->each(function($event) {
            $event->attendees_count = $event->attendees->count();
        });
        
        // Get counts for dashboard stats
        $counts = [
            'total' => Event::count(),
            'scheduled' => Event::where('status', 'Scheduled')->count(),
            'completed' => Event::where('status', 'Completed')->count(),
            'cancelled' => Event::where('status', 'Cancelled')->count(),
            'postponed' => Event::where('status', 'Postponed')->count(),
        ];
        
        // If it's an AJAX or JSON request, return JSON response
        if ($request->expectsJson()) {
            Log::info('Returning events list as JSON', [
                'count' => $events->count(),
                'status' => $status
            ]);
            
            return response()->json([
                'events' => $events,
                'counts' => $counts,
                'currentStatus' => $status
            ]);
        }
        
        // Get employees for the form
        $employees = Employee::select('id', 'Fname', 'Lname', 'Department', 'Jobtitle', 'idno')
                            ->where('JobStatus', 'Active')
                            ->get();
                            
        // Get unique departments
        $departments = Employee::select('Department')
                             ->where('Department', '!=', '')
                             ->whereNotNull('Department')
                             ->distinct()
                             ->pluck('Department');
        
        // Otherwise, render the Inertia page
        return Inertia::render('MeetingAndEvents/Events', [
            'events' => $events,
            'counts' => $counts,
            'currentStatus' => $status,
            'employees' => $employees,
            'departments' => $departments,
            'auth' => [
                'user' => Auth::user(),
            ],
        ]);
    }
    
    /**
     * Store a newly created event
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'location' => 'nullable|string|max:255',
            'organizer' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'nullable|in:Scheduled,Completed,Cancelled,Postponed',
            'event_type' => 'nullable|string|max:255',
            'is_public' => 'boolean',
            'image_url' => 'nullable|string|max:255',
            'website_url' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'attendees' => 'nullable|array',
            'attendees.*' => 'exists:employees,id',
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
            // Start database transaction
            \DB::beginTransaction();
            
            // Create event
            $event = Event::create($request->except('attendees'));
            
            // Add attendees if provided
            if ($request->has('attendees') && is_array($request->attendees)) {
                $attendeesData = [];
                foreach ($request->attendees as $employeeId) {
                    $attendeesData[$employeeId] = ['attendance_status' => 'Invited'];
                }
                
                if (!empty($attendeesData)) {
                    $event->attendees()->attach($attendeesData);
                }
            }
            
            // Commit transaction
            \DB::commit();
            
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Event created successfully',
                    'event' => $event
                ]);
            }
            
            return redirect()->back()->with('message', 'Event created successfully');
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            \DB::rollBack();
            
            Log::error('Failed to create event', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to create event: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->with('error', 'Failed to create event: ' . $e->getMessage())
                ->withInput();
        }
    }
    
    /**
     * Update the specified event
     */
    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after_or_equal:start_time',
            'location' => 'nullable|string|max:255',
            'organizer' => 'required|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'nullable|in:Scheduled,Completed,Cancelled,Postponed',
            'event_type' => 'nullable|string|max:255',
            'is_public' => 'boolean',
            'image_url' => 'nullable|string|max:255',
            'website_url' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'attendees' => 'nullable|array',
            'attendees.*' => 'exists:employees,id',
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
            // Start database transaction
            \DB::beginTransaction();
            
            // Update event
            $event->update($request->except('attendees'));
            
            // Update attendees if provided
            if ($request->has('attendees')) {
                $attendeesData = [];
                foreach ($request->attendees as $employeeId) {
                    // Preserve existing attendance status for existing attendees
                    $existingAttendee = $event->attendees()
                        ->where('employee_id', $employeeId)
                        ->first();
                    
                    $status = $existingAttendee ? 
                        $existingAttendee->pivot->attendance_status : 
                        'Invited';
                    
                    $attendeesData[$employeeId] = ['attendance_status' => $status];
                }
                
                $event->attendees()->sync($attendeesData);
            }
            
            // Commit transaction
            \DB::commit();
            
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Event updated successfully',
                    'event' => $event->fresh(['attendees'])
                ]);
            }
            
            return redirect()->back()->with('message', 'Event updated successfully');
            
        } catch (\Exception $e) {
            // Rollback transaction on error
            \DB::rollBack();
            
            Log::error('Failed to update event', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to update event: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->with('error', 'Failed to update event: ' . $e->getMessage())
                ->withInput();
        }
    }
    
    /**
     * Remove the specified event
     */
    public function destroy($id)
    {
        try {
            $event = Event::findOrFail($id);
            $event->delete();
            
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => 'Event deleted successfully'
                ]);
            }
            
            return redirect()->route('events.index')->with([
                'message' => 'Event deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to delete event', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            if (request()->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to delete event: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->route('events.index')->with('error', 'Failed to delete event');
        }
    }
    
    /**
     * Update the status of an event
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Scheduled,Completed,Cancelled,Postponed',
            'notes' => 'nullable|string',
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
            $event = Event::findOrFail($id);
            
            $event->update([
                'status' => $request->status,
                'notes' => $request->notes ? $event->notes . "\n\n" . now()->format('Y-m-d H:i') . " - Status changed to {$request->status}: {$request->notes}" : $event->notes,
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Event status updated successfully',
                    'event' => $event
                ]);
            }
            
            return redirect()->back()->with('message', 'Event status updated successfully');
            
        } catch (\Exception $e) {
            Log::error('Failed to update event status', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Failed to update event status: ' . $e->getMessage()
                ], 500);
            }
            
            return redirect()->back()
                ->with('error', 'Failed to update event status: ' . $e->getMessage())
                ->withInput();
        }
    }
    
    /**
     * Export events to Excel
     */
    public function export(Request $request)
    {
        // Create query with same filters as index method
        $query = Event::with(['attendees', 'creator']);
        
        // Filter by event status
        if ($request->has('status') && !empty($request->input('status'))) {
            $query->where('status', $request->input('status'));
        }
        
        // Filter by search term
        if ($request->has('search') && !empty($request->input('search'))) {
            $searchTerm = $request->input('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('description', 'like', "%{$searchTerm}%")
                  ->orWhere('location', 'like', "%{$searchTerm}%")
                  ->orWhere('organizer', 'like', "%{$searchTerm}%")
                  ->orWhere('department', 'like', "%{$searchTerm}%");
            });
        }
        
        // Filter by date range
        if ($request->has('from_date') && !empty($request->input('from_date'))) {
            $query->whereDate('start_time', '>=', $request->input('from_date'));
        }
        
        if ($request->has('to_date') && !empty($request->input('to_date'))) {
            $query->whereDate('start_time', '<=', $request->input('to_date'));
        }
        
        // Order by start time (newest first)
        $query->orderBy('start_time', 'desc');
        
        // Get events
        $events = $query->get();
        
        // Create Excel file
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Title');
        $sheet->setCellValue('C1', 'Start Date/Time');
        $sheet->setCellValue('D1', 'End Date/Time');
        $sheet->setCellValue('E1', 'Location');
        $sheet->setCellValue('F1', 'Organizer');
        $sheet->setCellValue('G1', 'Department');
        $sheet->setCellValue('H1', 'Status');
        $sheet->setCellValue('I1', 'Event Type');
        $sheet->setCellValue('J1', 'Public');
        $sheet->setCellValue('K1', 'Attendees');
        $sheet->setCellValue('L1', 'Created By');
        $sheet->setCellValue('M1', 'Created At');
        
        // Style header row
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4472C4'],
            ],
        ];
        
        $sheet->getStyle('A1:M1')->applyFromArray($headerStyle);
        
        // Populate data
        $row = 2;
        foreach ($events as $event) {
            $sheet->setCellValue('A' . $row, $event->id);
            $sheet->setCellValue('B' . $row, $event->title);
            $sheet->setCellValue('C' . $row, $event->start_time->format('Y-m-d H:i'));
            $sheet->setCellValue('D' . $row, $event->end_time->format('Y-m-d H:i'));
            $sheet->setCellValue('E' . $row, $event->location);
            $sheet->setCellValue('F' . $row, $event->organizer);
            $sheet->setCellValue('G' . $row, $event->department);
            $sheet->setCellValue('H' . $row, $event->status);
            $sheet->setCellValue('I' . $row, $event->event_type);
            $sheet->setCellValue('J' . $row, $event->is_public ? 'Yes' : 'No');
            
            // Compile attendee names
            $attendeeNames = $event->attendees->map(function($attendee) {
                return "{$attendee->Fname} {$attendee->Lname}";
            })->join(', ');
            
            $sheet->setCellValue('K' . $row, $attendeeNames);
            $sheet->setCellValue('L' . $row, $event->creator ? $event->creator->name : '');
            $sheet->setCellValue('M' . $row, $event->created_at->format('Y-m-d H:i'));
            
            $row++;
        }
        
        // Auto-size columns
        foreach(range('A', 'M') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }
        
        // Set filename
        $fileName = 'events_export_' . date('Y-m-d_H-i-s') . '.xlsx';
        
        // Create response
        $writer = new Xlsx($spreadsheet);
        $response = response()->stream(
            function() use ($writer) {
                $writer->save('php://output');
            },
            200,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]
        );
        
        return $response;
    }
    public function debug()
{
    $events = Event::with(['attendees'])->get();
    
    return response()->json([
        'events' => $events,
        'count' => $events->count()
    ]);
}
    /**
     * Get a list of events for other components
     */
    public function list(Request $request)
    {
        $query = Event::with(['attendees']);
        
        // Filter by status
        if ($request->has('status') && !empty($request->input('status'))) {
            $query->where('status', $request->input('status'));
        }
        
        // Filter by search term
        if ($request->has('search') && !empty($request->input('search'))) {
            $searchTerm = $request->input('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                  ->orWhere('location', 'like', "%{$searchTerm}%")
                  ->orWhere('organizer', 'like', "%{$searchTerm}%");
            });
        }
        
        // Filter by date range
        if ($request->has('from_date') && !empty($request->input('from_date'))) {
            $query->whereDate('start_time', '>=', $request->input('from_date'));
        }
        
        if ($request->has('to_date') && !empty($request->input('to_date'))) {
            $query->whereDate('start_time', '<=', $request->input('to_date'));
        }
        
        // Order by start date (ascending)
        $query->orderBy('start_time', 'asc');
        
        // Get events
        $events = $query->get();
        
        // Calculate attendee counts for each event
        $events->each(function($event) {
            $event->attendees_count = $event->attendees->count();
        });
        
        return response()->json([
            'events' => $events
        ]);
    }
    /**
 * Reschedule an event
 */
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
        $event = Event::findOrFail($id);
        
        // Update the event's time and set status to Scheduled
        $event->update([
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'status' => 'Scheduled',
            'notes' => $event->notes . "\n\n" . now()->format('Y-m-d H:i') . " - Event rescheduled to: " . $request->start_time . " - " . $request->end_time,
        ]);
        
        // TODO: Notify attendees of the schedule change (optional)
        // You can add notification logic here if needed
        
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Event rescheduled successfully',
                'event' => $event->fresh(['attendees'])
            ]);
        }
        
        return redirect()->route('events.index')->with('message', 'Event rescheduled successfully');
        
    } catch (\Exception $e) {
        Log::error('Failed to reschedule event', [
            'id' => $id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        if ($request->expectsJson()) {
            return response()->json([
                'error' => 'Failed to reschedule event: ' . $e->getMessage()
            ], 500);
        }
        
        return redirect()->back()
            ->with('error', 'Failed to reschedule event: ' . $e->getMessage())
            ->withInput();
    }
}
}