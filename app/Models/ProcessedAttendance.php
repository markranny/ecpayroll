<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProcessedAttendance extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'employee_id',
        'attendance_date',
        'day',
        'time_in',
        'time_out',
        'break_in',
        'break_out',
        'next_day_timeout',
        'hours_worked',
        'status',
        'source',
        'remarks',
        'is_nightshift',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'attendance_date' => 'date',
        'time_in' => 'datetime',
        'time_out' => 'datetime',
        'break_in' => 'datetime',
        'break_out' => 'datetime',
        'next_day_timeout' => 'datetime',
        'hours_worked' => 'float',
        'is_nightshift' => 'boolean',
    ];

    /**
     * Get the employee associated with this attendance record.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}