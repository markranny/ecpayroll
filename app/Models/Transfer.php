<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'from_department',
        'to_department',
        'from_line',
        'to_line',
        'transfer_date',
        'reason',
        'status',
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'transfer_date' => 'date',
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