<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'promotion_title',
        'previous_position',
        'new_position',
        'previous_salary',
        'new_salary',
        'promotion_date',
        'description',
        'status',
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'promotion_date' => 'date',
        'approved_at' => 'datetime',
        'previous_salary' => 'decimal:2',
        'new_salary' => 'decimal:2'
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