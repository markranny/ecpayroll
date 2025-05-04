<?php
// app/Models/TimeSchedule.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TimeSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'schedule_type_id',
        'effective_date',
        'end_date',
        'current_schedule',
        'new_schedule',
        'new_start_time',
        'new_end_time',
        'reason',
        'status', // pending, approved, rejected, cancelled
        'approved_by',
        'approved_at',
        'remarks',
        'created_by'
    ];

    protected $casts = [
        'effective_date' => 'date',
        'end_date' => 'date',
        'new_start_time' => 'datetime',
        'new_end_time' => 'datetime',
        'approved_at' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function scheduleType()
    {
        return $this->belongsTo(ScheduleType::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}