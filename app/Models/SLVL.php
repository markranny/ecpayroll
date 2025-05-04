<?php
// app/Models/SLVL.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SLVL extends Model
{
    use HasFactory;

    protected $table = 'slvl'; // Explicitly set table name

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
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'half_day' => 'boolean',
        'total_days' => 'decimal:1',
        'with_pay' => 'boolean',
        'approved_at' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}