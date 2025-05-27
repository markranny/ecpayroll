<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SLVLBank extends Model
{
    use HasFactory;

    protected $table = 'slvl_banks';

    protected $fillable = [
        'employee_id',
        'leave_type',
        'total_days',
        'used_days',
        'year',
        'created_by',
        'notes'
    ];

    protected $casts = [
        'total_days' => 'float',
        'used_days' => 'float',
        'year' => 'integer',
    ];

    /**
     * Get the employee that owns the SLVL bank.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who created this bank record.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get remaining days.
     */
    public function getRemainingDaysAttribute()
    {
        return $this->total_days - $this->used_days;
    }

    /**
     * Check if there are sufficient days available.
     */
    public function hasSufficientDays($requestedDays)
    {
        return $this->remaining_days >= $requestedDays;
    }

    /**
     * Scope to filter by leave type.
     */
    public function scopeByLeaveType($query, $leaveType)
    {
        return $query->where('leave_type', $leaveType);
    }

    /**
     * Scope to filter by year.
     */
    public function scopeByYear($query, $year)
    {
        return $query->where('year', $year);
    }

    /**
     * Scope for current year.
     */
    public function scopeCurrentYear($query)
    {
        return $query->where('year', now()->year);
    }
}