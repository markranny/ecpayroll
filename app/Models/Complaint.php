<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'complainant_id',
        'complaint_title',
        'complaint_description',
        'complaint_date',
        'document_path',
        'status',
        'assigned_to',
        'resolution',
        'resolution_date'
    ];

    protected $casts = [
        'complaint_date' => 'date',
        'resolution_date' => 'date'
    ];

    // Relationship with Employee model for the employee being complained about
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Relationship with Employee model for the complainant
    public function complainant()
    {
        return $this->belongsTo(Employee::class, 'complainant_id');
    }

    // Relationship with User model for the person assigned to handle the complaint
    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // Optional: Scope methods for easy status filtering
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    public function scopeClosed($query)
    {
        return $query->where('status', 'closed');
    }
}