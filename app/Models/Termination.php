<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Termination extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'termination_type',
        'notice_date',
        'termination_date',
        'reason',
        'document_path',
        'status',
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'notice_date' => 'date',
        'termination_date' => 'date',
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