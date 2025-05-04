<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeUploadAttendance extends Model
{
    use HasFactory;

    protected $table = 'employee_upload_attendances';

    protected $fillable = [
        'employee_no',
        'date',
        'day',
        'in1',
        'out1',
        'in2',
        'out2',
        'nextday',
        'hours_work'  // Added this as it's in your migration
    ];

    protected $casts = [
        'date' => 'date',
        'in1' => 'datetime',
        'out1' => 'datetime',
        'in2' => 'datetime',
        'out2' => 'datetime',
        'nextday' => 'datetime',
        'hours_work' => 'decimal:2'
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_no', 'idno');
    }
}