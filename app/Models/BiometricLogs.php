<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BiometricLogs extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'biometriclogs';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'idno',
        'punch_time',
        'punch_state',
        'device_ip',
        'processed',
        'is_wrong_punch',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'punch_time' => 'datetime',
        'punch_state' => 'integer',
        'processed' => 'boolean',
        'is_wrong_punch' => 'boolean',
    ];

    /**
     * Get a human-readable punch state.
     *
     * @return string
     */
    public function getPunchStateLabelAttribute()
    {
        return $this->punch_state === 0 ? 'Time In' : 'Time Out';
    }
}
