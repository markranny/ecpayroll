<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ChangeOffSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'original_date',
        'requested_date',
        'reason',
        'status', 
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'original_date' => 'date',
        'requested_date' => 'date',
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