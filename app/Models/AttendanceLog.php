<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceLog extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'employee_id',
        'biometric_id',
        'timestamp',
        'device_id',
        'status',
        'type',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'timestamp' => 'datetime',
        'status' => 'integer',
        'type' => 'integer',
    ];

    /**
     * Get the employee associated with this log.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Get the device that recorded this log.
     */
    public function device()
    {
        return $this->belongsTo(BiometricDevice::class, 'device_id');
    }
}