<?php
namespace App\Http\Controllers;

use App\Models\Training;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TrainingsController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status', 'all');
        
        $trainings = Training::query()
            ->when($status !== 'all', function ($query) use ($status) {
                return $query->where('status', $status);
            })
            ->withCount('participants')
            ->orderBy('start_date', 'desc')
            ->get();

        $counts = [
            'total' => Training::count(),
            'scheduled' => Training::where('status', 'Scheduled')->count(),
            'completed' => Training::where('status', 'Completed')->count(),
            'cancelled' => Training::where('status', 'Cancelled')->count(),
        ];

        return Inertia::render('Training/TrainingPage', [
            'trainings' => $trainings,
            'counts' => $counts,
            'currentStatus' => $status,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location' => 'nullable|string|max:255',
            'trainer' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'required|in:Scheduled,Completed,Cancelled,Postponed',
            'max_participants' => 'nullable|integer|min:1',
            'training_type' => 'nullable|string|max:255',
            'materials_link' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
        ]);

        $training = Training::create($validated);

        if (!empty($validated['participants'])) {
            $participants = [];
            foreach ($validated['participants'] as $participant) {
                $participants[$participant] = ['attendance_status' => 'Registered'];
            }
            $training->participants()->attach($participants);
        }

        return redirect()->route('trainings.index')->with('message', 'Training created successfully');
    }

    public function update(Request $request, Training $training)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'location' => 'nullable|string|max:255',
            'trainer' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'status' => 'required|in:Scheduled,Completed,Cancelled,Postponed',
            'max_participants' => 'nullable|integer|min:1',
            'training_type' => 'nullable|string|max:255',
            'materials_link' => 'nullable|string|max:255',
            'participants' => 'nullable|array',
        ]);

        $training->update($validated);

        if (isset($validated['participants'])) {
            $participants = [];
            foreach ($validated['participants'] as $participant) {
                $participants[$participant] = ['attendance_status' => 'Registered'];
            }
            $training->participants()->sync($participants);
        }

        return redirect()->route('trainings.index')->with('message', 'Training updated successfully');
    }

    public function destroy(Training $training)
    {
        $training->delete();
        return redirect()->route('trainings.index')->with('message', 'Training deleted successfully');
    }

    public function markCompleted(Training $training)
    {
        $training->update(['status' => 'Completed']);
        return redirect()->back()->with('message', 'Training marked as completed');
    }

    public function markCancelled(Training $training)
    {
        $training->update(['status' => 'Cancelled']);
        return redirect()->back()->with('message', 'Training marked as cancelled');
    }

    public function markScheduled(Training $training)
    {
        $training->update(['status' => 'Scheduled']);
        return redirect()->back()->with('message', 'Training marked as scheduled');
    }

    public function getEmployees()
    {
        $employees = Employee::select('id', 'Fname', 'Lname', 'Department')
            ->where('JobStatus', 'Active')
            ->orderBy('Lname')
            ->get()
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => "{$employee->Lname}, {$employee->Fname}",
                    'department' => $employee->Department,
                ];
            });

        return response()->json($employees);
    }
}