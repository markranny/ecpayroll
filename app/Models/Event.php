<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Event extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'description',
        'start_time',
        'end_time',
        'location',
        'organizer',
        'department',
        'status',
        'event_type',
        'is_public',
        'image_url',
        'website_url',
        'notes',
        'created_by',
        'updated_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_public' => 'boolean',
    ];

    /**
     * Hook into the model's boot method to set created_by and updated_by
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (Auth::check()) {
                $model->created_by = Auth::id();
                $model->updated_by = Auth::id();
            }
        });
        
        static::updating(function ($model) {
            if (Auth::check()) {
                $model->updated_by = Auth::id();
            }
        });
    }

    /**
     * Get the creator of the event
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the last user who updated the event
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get the attendees for the event
     */
    public function attendees()
    {
        return $this->belongsToMany(Employee::class, 'event_attendees')
                    ->withPivot('attendance_status')
                    ->withTimestamps();
    }
    
    /**
     * Calculate the duration of the event in hours
     */
    public function getDurationAttribute()
    {
        if (!$this->start_time || !$this->end_time) {
            return 0;
        }
        
        return $this->start_time->diffInHours($this->end_time);
    }
    
    /**
     * Determine if the event is upcoming
     */
    public function getIsUpcomingAttribute()
    {
        if (!$this->start_time) {
            return false;
        }
        
        return $this->start_time->isFuture();
    }
    
    /**
     * Determine if the event is ongoing
     */
    public function getIsOngoingAttribute()
    {
        if (!$this->start_time || !$this->end_time) {
            return false;
        }
        
        $now = now();
        return $this->start_time->isPast() && $this->end_time->isFuture();
    }
    
    /**
     * Get the attendance count
     */
    public function getAttendeeCountAttribute()
    {
        return $this->attendees()->count();
    }
}