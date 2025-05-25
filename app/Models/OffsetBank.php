<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OffsetBank extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'total_hours',
        'used_hours',
        'remaining_hours',
        'last_updated',
        'notes'
    ];

    protected $casts = [
        'total_hours' => 'decimal:2',
        'used_hours' => 'decimal:2',
        'remaining_hours' => 'decimal:2',
        'last_updated' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Add hours to bank
    public function addHours($hours, $notes = null)
    {
        $this->total_hours += $hours;
        $this->remaining_hours += $hours;
        $this->last_updated = now();
        if ($notes) {
            $this->notes = $notes;
        }
        return $this->save();
    }

    // Use hours from bank
    public function useHours($hours, $notes = null)
    {
        if ($hours > $this->remaining_hours) {
            return false;
        }
        
        $this->used_hours += $hours;
        $this->remaining_hours -= $hours;
        $this->last_updated = now();
        if ($notes) {
            $this->notes = $notes;
        }
        return $this->save();
    }
}