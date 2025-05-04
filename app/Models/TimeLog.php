<?php
// app/Models/TimeLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TimeLog extends Model
{
    use HasFactory;

    protected $table = 'time_logs';

    protected $fillable = [
        'employee_id',
        'log_date',
        'hours_worked',
        'start_time',
        'end_time',
        'task_category',
        'task_description',
        'task_details',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'log_date' => 'date',
        'hours_worked' => 'decimal:2'
    ];

    /**
     * Get the employee associated with this time log
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the user who created this time log
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this time log
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}