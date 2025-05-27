<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class SLVL extends Model
{
    use HasFactory;

    protected $table = 'slvls';

    protected $fillable = [
        'employee_id',
        'type',
        'start_date',
        'end_date',
        'half_day',
        'am_pm',
        'total_days',
        'with_pay',
        'reason',
        'documents_path',
        'status',
        'created_by',
        'dept_manager_id',
        'dept_approved_by',
        'dept_approved_at',
        'dept_remarks',
        'hrd_approved_by',
        'hrd_approved_at',
        'hrd_remarks',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'half_day' => 'boolean',
        'with_pay' => 'boolean',
        'total_days' => 'float',
        'dept_approved_at' => 'datetime',
        'hrd_approved_at' => 'datetime',
    ];

    /**
     * Get the employee that owns the leave.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who created this leave request.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the department manager assigned to this leave.
     */
    public function departmentManager()
    {
        return $this->belongsTo(User::class, 'dept_manager_id');
    }

    /**
     * Get the user who approved at department level.
     */
    public function departmentApprover()
    {
        return $this->belongsTo(User::class, 'dept_approved_by');
    }

    /**
     * Get the user who approved at HRD level.
     */
    public function hrdApprover()
    {
        return $this->belongsTo(User::class, 'hrd_approved_by');
    }

    /**
     * Get the approver (for backward compatibility).
     */
    public function approver()
    {
        return $this->hrdApprover ?: $this->departmentApprover;
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by leave type.
     */
    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter by employee.
     */
    public function scopeByEmployee($query, $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    /**
     * Scope for pending leaves.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for approved leaves.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope for rejected leaves.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Check if the leave is pending.
     */
    public function isPending()
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the leave is approved.
     */
    public function isApproved()
    {
        return $this->status === 'approved';
    }

    /**
     * Check if the leave is rejected.
     */
    public function isRejected()
    {
        return $this->status === 'rejected';
    }

    /**
     * Get the duration in a human readable format.
     */
    public function getDurationAttribute()
    {
        if ($this->half_day) {
            return "0.5 day ({$this->am_pm} half-day)";
        }
        
        return $this->total_days . ' day' . ($this->total_days != 1 ? 's' : '');
    }

    /**
     * Get the date range in a human readable format.
     */
    public function getDateRangeAttribute()
    {
        $start = Carbon::parse($this->start_date)->format('M d, Y');
        $end = Carbon::parse($this->end_date)->format('M d, Y');
        
        if ($start === $end) {
            return $start;
        }
        
        return $start . ' - ' . $end;
    }

    /**
     * Get the leave type label.
     */
    public function getTypeLabel()
    {
        $types = [
            'sick' => 'Sick Leave',
            'vacation' => 'Vacation Leave',
            'emergency' => 'Emergency Leave',
            'bereavement' => 'Bereavement Leave',
            'maternity' => 'Maternity Leave',
            'paternity' => 'Paternity Leave',
            'personal' => 'Personal Leave',
            'study' => 'Study Leave',
        ];

        return $types[$this->type] ?? ucfirst($this->type) . ' Leave';
    }

    /**
     * Get the status label.
     */
    public function getStatusLabel()
    {
        $statuses = [
            'pending' => 'Pending',
            'manager_approved' => 'Dept. Approved',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        return $statuses[$this->status] ?? ucfirst($this->status);
    }

    /**
     * Check if leave overlaps with another leave period.
     */
    public function overlapsWithPeriod($startDate, $endDate, $excludeId = null)
    {
        $query = static::where('employee_id', $this->employee_id)
            ->where('status', '!=', 'rejected')
            ->where(function($q) use ($startDate, $endDate) {
                $q->where(function($subQ) use ($startDate, $endDate) {
                    $subQ->whereBetween('start_date', [$startDate, $endDate])
                         ->orWhereBetween('end_date', [$startDate, $endDate]);
                })->orWhere(function($subQ) use ($startDate, $endDate) {
                    $subQ->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}