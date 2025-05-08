<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'agenda',
        'start_time',
        'end_time',
        'location',
        'organizer',
        'department',
        'status',
        'is_recurring',
        'recurrence_pattern',
        'meeting_link',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_recurring' => 'boolean',
    ];

    public function participants()
    {
        return $this->belongsToMany(Employee::class, 'meeting_participants')
            ->withPivot('attendance_status')
            ->withTimestamps();
    }
}
