<?php
// app/Models/Overtime.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Overtime extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'start_time',
        'end_time',
        'total_hours',
        'rate_multiplier',
        'reason',
        'status',                 // pending, manager_approved, approved, rejected
        'dept_manager_id',        // Department manager assigned to review
        'dept_approved_by',       // Department manager who approved/rejected
        'dept_approved_at',       // When department approval happened
        'dept_remarks',           // Department manager remarks
        'hrd_approved_by',        // HRD manager who gave final approval/rejection
        'hrd_approved_at',        // When HRD final approval happened
        'hrd_remarks',            // HRD manager remarks
        'created_by',             // User who created the overtime request
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'total_hours' => 'decimal:2',
        'rate_multiplier' => 'decimal:2',
        'dept_approved_at' => 'datetime',
        'hrd_approved_at' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function departmentManager()
    {
        return $this->belongsTo(User::class, 'dept_manager_id');
    }

    public function departmentApprover()
    {
        return $this->belongsTo(User::class, 'dept_approved_by');
    }

    public function hrdApprover()
    {
        return $this->belongsTo(User::class, 'hrd_approved_by');
    }

    // Helper methods for status checks
    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isManagerApproved()
    {
        return $this->status === 'manager_approved';
    }

    public function isFullyApproved()
    {
        return $this->status === 'approved';
    }

    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    // Get the current approver based on status
    public function getCurrentApprover()
    {
        if ($this->status === 'pending') {
            return $this->departmentManager;
        } elseif ($this->status === 'manager_approved') {
            return User::whereHas('roles', function($query) {
                $query->where('name', 'hrd_manager');
            })->first();
        }
        
        return null;
    }
}