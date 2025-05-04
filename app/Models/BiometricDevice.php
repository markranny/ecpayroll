<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BiometricDevice extends Model
{
    protected $fillable = [
        'name', 
        'ip_address', 
        'port', 
        'location', 
        'model', 
        'serial_number', 
        'last_sync', 
        'status'
    ];

    protected $dates = ['last_sync'];

    protected $casts = [
        'port' => 'integer',
        'last_sync' => 'datetime'
    ];
}